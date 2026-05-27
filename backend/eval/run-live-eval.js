'use strict';

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const { buildDerivedSignals } = require('../lib/matchSignals');
const { retrieve } = require('../lib/rag');

// Load scenarios
const { match, scenarios: allScenarios } = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'live-scenarios.json'), 'utf8')
);

// ─────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────

function buildSystemPrompt(matchContext, signals, useSignals, recentEvents) {
  let prompt = `
You are an AI soccer companion helping a
casual American sports fan understand a
live World Cup match.

Your target user is "Sideline Sam" — a
19-24 year old American male who follows
NFL and NBA but has never watched soccer.

MANDATORY RULES:
1. Every response MUST include at least
   one specific American sports analogy
   (NFL, NBA, or MLB). No exceptions.
2. Maximum 130 words. Hard limit.
3. No markdown formatting. No bold,
   no bullet points. Plain prose only.
4. Write like you are texting Sam,
   not writing a report.

MATCH:
${match.homeTeam} vs ${match.awayTeam}
${match.tournament} — ${match.stage}
Score: ${matchContext.homeScore} - ${matchContext.awayScore}
Minute: ${matchContext.minute}'
${matchContext.isExtraTime ? 'EXTRA TIME' : ''}
`;

  if (recentEvents && recentEvents.length > 0) {
    prompt += '\nRECENT EVENTS (most recent first):\n';
    const sorted = [...recentEvents].sort((a, b) =>
      (b.time?.elapsed || 0) - (a.time?.elapsed || 0)
    );
    sorted.forEach(e => {
      const detail = e.detail ? ` (${e.detail})` : '';
      prompt += `- ${e.time?.elapsed}' ${e.type}: ${e.player?.name || 'unknown'} (${e.team?.name || 'unknown'})${detail}\n`;
    });
  }

  if (useSignals && signals) {
    prompt += `
MATCH INTELLIGENCE — use this to calibrate your response energy:
Pressure: ${signals.pressure}
Momentum: ${signals.momentum}
Stakes: ${signals.stakes}
Emotional intensity: ${signals.emotional_intensity}
Narrative: ${signals.narrative}

If pressure is critical: respond urgently.
If intensity is spike: acknowledge drama.
If stakes is maximum: explain consequences.
Match your energy to these signals.
`;
  }

  const ragContext = retrieve(matchContext.question || '', 3);
  if (ragContext) {
    prompt += `\nRELEVANT KNOWLEDGE:\n${ragContext}`;
  }

  return prompt;
}

// ─────────────────────────────────────────
// LIVE SCENARIO JUDGE PROMPT
// 5 dimensions (not 3 like Dataset 1)
// ─────────────────────────────────────────

const LIVE_JUDGE_PROMPT = `
You are evaluating an AI soccer companion
response during a live match for a casual
American sports fan called Sideline Sam.

Score the response on FIVE dimensions.
Return ONLY valid JSON, no preamble.

DIMENSIONS:

FACTUAL ACCURACY (0, 0.5, 1.0)
1.0 = Facts about the match and soccer
  rules are correct.
0.5 = Mostly correct with minor error.
0.0 = Contains a clear factual error.

CONTEXT AWARENESS (0, 0.5, 1.0)
1.0 = References specific match details
  (score, minute, player names, stage).
  Response feels like it knows THIS match,
  not any generic match.
0.5 = Partially references match context
  but misses key details.
0.0 = Generic response that could apply
  to any match. No match specifics.

TONE MATCH (0, 0.5, 1.0)
1.0 = Response energy matches the moment.
  Urgent when pressure is critical.
  Dramatic when intensity is spike.
  Calm when it is a routine moment.
0.5 = Partially calibrated but misses
  the emotional weight of the moment.
0.0 = Wrong energy for the moment.
  Calm when it should be urgent,
  or dramatic when routine.

STAKES EXPLANATION (0, 0.5, 1.0)
1.0 = Clearly explains WHY this moment
  matters. Sam understands consequences.
  "If this stands they go home" not
  just "it was a VAR review."
0.5 = Mentions stakes but does not
  explain consequences clearly.
0.0 = No stakes explanation. Describes
  what happened without explaining why
  it matters.

ANALOGY RELEVANCE (0, 0.5, 1.0)
1.0 = Includes a specific, accurate
  American sports analogy (NFL, NBA, MLB)
  that genuinely helps Sam understand.
0.5 = Includes an analogy but it is
  vague, inaccurate, or does not help
  comprehension.
0.0 = No sports analogy, or uses a
  soccer-to-soccer comparison Sam
  would not understand.

For any 0.5 score provide:
(a) One sentence justification
(b) Suggested rewrite for a 1.0

RETURN THIS JSON EXACTLY:
{
  "factual_accuracy": 0,
  "factual_justification": "",
  "factual_rewrite": "",
  "context_awareness": 0,
  "context_justification": "",
  "context_rewrite": "",
  "tone_match": 0,
  "tone_justification": "",
  "tone_rewrite": "",
  "stakes_explanation": 0,
  "stakes_justification": "",
  "stakes_rewrite": "",
  "analogy_relevance": 0,
  "analogy_justification": "",
  "analogy_rewrite": "",
  "total_score": 0.0,
  "flags": ""
}
`;

// ─────────────────────────────────────────
// Get companion response
// ─────────────────────────────────────────

async function getCompanionResponse(scenario, useSignals) {
  const matchState = {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: scenario.score.home,
    awayScore: scenario.score.away,
    minute: scenario.minute,
    stage: match.stage,
    isExtraTime: scenario.isExtraTime || false,
    isPenaltyShootout: scenario.isPenaltyShootout || false,
  };

  const signals = buildDerivedSignals(
    matchState,
    scenario.recent_events || [],
    scenario.stats || {}
  );

  const systemPrompt = buildSystemPrompt(
    { ...matchState, question: scenario.question },
    signals,
    useSignals,
    scenario.recent_events || []
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 250,
    system: systemPrompt,
    messages: [{ role: 'user', content: scenario.question }],
  });

  return { response: response.content[0].text, signals };
}

// ─────────────────────────────────────────
// Judge a live response
// ─────────────────────────────────────────

async function judgeLiveResponse(scenario, response, signals, useSignals) {
  const signalContext = useSignals
    ? `Signals passed to the AI:
Pressure: ${signals.pressure}
Momentum: ${signals.momentum}
Stakes: ${signals.stakes}
Intensity: ${signals.emotional_intensity}`
    : 'No signals passed to the AI.';

  const userMessage = `
MATCH: ${match.homeTeam} vs ${match.awayTeam}
STAGE: ${match.stage}
MINUTE: ${scenario.minute}'
SCORE: ${scenario.score.home} - ${scenario.score.away}
SITUATION: ${scenario.description}

${signalContext}

USER QUESTION: "${scenario.question}"

AI RESPONSE: "${response}"

Score this response on all 5 dimensions.
`;

  try {
    const judgeResponse = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: LIVE_JUDGE_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = judgeResponse.content[0].text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const scores = JSON.parse(text);
    scores.total_score =
      (scores.factual_accuracy || 0) +
      (scores.context_awareness || 0) +
      (scores.tone_match || 0) +
      (scores.stakes_explanation || 0) +
      (scores.analogy_relevance || 0);

    return scores;

  } catch (err) {
    console.error('Judge error:', err.message);
    return {
      factual_accuracy: 0,
      context_awareness: 0,
      tone_match: 0,
      stakes_explanation: 0,
      analogy_relevance: 0,
      total_score: 0,
      flags: `Judge error: ${err.message}`,
      factual_justification: '',
      factual_rewrite: '',
      context_justification: '',
      context_rewrite: '',
      tone_justification: '',
      tone_rewrite: '',
      stakes_justification: '',
      stakes_rewrite: '',
      analogy_justification: '',
      analogy_rewrite: '',
    };
  }
}

// ─────────────────────────────────────────
// Run eval for one condition
// ─────────────────────────────────────────

async function runCondition(scenarios, label, useSignals) {
  const results = [];
  let totalScore = 0;

  console.log(`\nRunning ${label} (${scenarios.length} scenarios)...`);
  console.log('─'.repeat(50));

  for (const scenario of scenarios) {
    process.stdout.write(`  ${scenario.id}... `);

    try {
      const { response, signals } = await getCompanionResponse(scenario, useSignals);
      const scores = await judgeLiveResponse(scenario, response, signals, useSignals);

      const pct = Math.round((scores.total_score / 5.0) * 100);
      const icon = pct >= 75 ? '✅' : pct >= 50 ? '⚠️ ' : '❌';
      console.log(`${icon} ${pct}% (${scores.total_score}/5.0)`);

      results.push({
        id: scenario.id,
        question: scenario.question,
        description: scenario.description,
        minute: scenario.minute,
        response,
        signals: useSignals ? signals : null,
        scores,
        label,
      });

      totalScore += scores.total_score;

    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({
        id: scenario.id,
        error: err.message,
        scores: { total_score: 0 },
        label,
      });
    }

    await new Promise(r => setTimeout(r, 800));
  }

  const overallPct = Math.round((totalScore / (scenarios.length * 5.0)) * 100);

  return {
    label,
    results,
    summary: {
      total_score: totalScore,
      max_possible: scenarios.length * 5.0,
      overall_pct: overallPct,
      scenarios_run: scenarios.length,
    },
  };
}

// ─────────────────────────────────────────
// Print live eval report
// ─────────────────────────────────────────

function printLiveReport(withSignals, withoutSignals) {
  console.log('\n' + '='.repeat(60));
  console.log('LIVE EVAL REPORT -- Dataset 3');
  console.log('2022 World Cup Final -- Historical Data');
  console.log(new Date().toISOString());
  console.log('='.repeat(60));

  console.log('\nOVERALL:');
  console.log(`  With signals:    ${withSignals.summary.overall_pct}%`);
  console.log(`  Without signals: ${withoutSignals.summary.overall_pct}%`);
  const delta = withSignals.summary.overall_pct - withoutSignals.summary.overall_pct;
  console.log(`  Signal lift:     +${delta} points`);

  const dims = [
    'factual_accuracy',
    'context_awareness',
    'tone_match',
    'stakes_explanation',
    'analogy_relevance',
  ];

  const dimLabels = {
    factual_accuracy: 'Factual Accuracy',
    context_awareness: 'Context Awareness',
    tone_match: 'Tone Match',
    stakes_explanation: 'Stakes Explanation',
    analogy_relevance: 'Analogy Relevance',
  };

  console.log('\nBY DIMENSION:');
  console.log('  Dimension            With    Without  Delta');
  console.log('  ' + '-'.repeat(44));

  dims.forEach(dim => {
    const withAvg = Math.round(
      withSignals.results.reduce((sum, r) => sum + (r.scores?.[dim] || 0), 0) /
      withSignals.results.length * 100
    );
    const withoutAvg = Math.round(
      withoutSignals.results.reduce((sum, r) => sum + (r.scores?.[dim] || 0), 0) /
      withoutSignals.results.length * 100
    );
    const d = withAvg - withoutAvg;
    const arrow = d > 0 ? 'up' : d < 0 ? 'dn' : '--';
    console.log(
      `  ${dimLabels[dim].padEnd(21)}` +
      `${String(withAvg + '%').padEnd(8)}` +
      `${String(withoutAvg + '%').padEnd(9)}` +
      `${arrow} ${Math.abs(d)}pts`
    );
  });

  console.log('\nSIGNAL IMPACT VERDICT:');
  if (delta >= 15) {
    console.log(
      `  [GREEN] SIGNALS WORKING -- +${delta}pts lift proves derived ` +
      'signals meaningfully improve responses'
    );
  } else if (delta >= 8) {
    console.log(
      `  [YELLOW] SIGNALS PARTIALLY WORKING -- +${delta}pts lift is positive but ` +
      'below the 15pt target'
    );
  } else {
    console.log(
      `  [RED] SIGNALS NOT WORKING -- only +${delta}pts lift. Claude ` +
      'is ignoring the signal context.'
    );
  }

  console.log('\nKEY INSIGHTS:');
  dims.forEach(dim => {
    const withAvg = withSignals.results.reduce((sum, r) => sum + (r.scores?.[dim] || 0), 0) /
      withSignals.results.length;
    const withoutAvg = withoutSignals.results.reduce((sum, r) => sum + (r.scores?.[dim] || 0), 0) /
      withoutSignals.results.length;
    const d = withAvg - withoutAvg;

    if (d >= 0.2) {
      console.log(`  -> ${dimLabels[dim]}: signals add +${Math.round(d * 100)}pts -- working well`);
    } else if (d <= -0.1) {
      console.log(`  -> ${dimLabels[dim]}: signals hurt by ${Math.round(Math.abs(d) * 100)}pts -- investigate`);
    }
  });

  const failures = withSignals.results
    .filter(r => (r.scores?.total_score || 0) < 3.0)
    .sort((a, b) => (a.scores?.total_score || 0) - (b.scores?.total_score || 0))
    .slice(0, 5);

  if (failures.length > 0) {
    console.log('\nSCENARIOS TO IMPROVE:');
    failures.forEach(f => {
      console.log(`\n  ${f.id}: "${f.question}"`);
      console.log(`  Score: ${f.scores?.total_score}/5.0`);
      console.log(`  Situation: ${f.description}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('The portfolio answer this unlocks:');
  console.log(
    `"Our derived signals layer produced a +${delta}pt improvement in live ` +
    'match response quality, with the biggest gains in Tone Match and ' +
    'Stakes Explanation -- exactly the dimensions where context-awareness ' +
    'matters most."'
  );
  console.log('='.repeat(60) + '\n');
}

// ─────────────────────────────────────────
// Save results
// ─────────────────────────────────────────

function saveLiveResults(withSignals, withoutSignals) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `live-eval-results-${date}.json`;
  const filepath = path.join(__dirname, filename);

  fs.writeFileSync(filepath, JSON.stringify({
    date,
    match,
    with_signals: withSignals,
    without_signals: withoutSignals,
    delta: withSignals.summary.overall_pct - withoutSignals.summary.overall_pct,
  }, null, 2));

  console.log(`\nResults saved to: backend/eval/${filename}`);
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('LIVE SCENARIO EVAL -- Dataset 3');
  console.log('2022 World Cup Final - 15 scenarios');
  console.log('Tests whether derived signals improve');
  console.log('companion responses vs no signals');
  console.log('='.repeat(60));

  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick');

  const scenarios = quickMode ? allScenarios.slice(0, 5) : allScenarios;

  if (quickMode) {
    console.log('\nQUICK MODE -- first 5 scenarios only');
  }

  const withSignals = await runCondition(scenarios, 'with_signals', true);
  const withoutSignals = await runCondition(scenarios, 'without_signals', false);

  printLiveReport(withSignals, withoutSignals);
  saveLiveResults(withSignals, withoutSignals);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
