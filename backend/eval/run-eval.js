'use strict';

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────
// Load reference answers
// ─────────────────────────────────────────
const REFERENCE_ANSWERS = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'reference-answers.json'),
    'utf8'
  )
);

// ─────────────────────────────────────────
// Load RAG retrieval
// ─────────────────────────────────────────
const { retrieve } = require('../lib/rag');

// ─────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────

const FULL_SYSTEM_PROMPT = `
You are an AI soccer companion helping a
casual American sports fan understand the
2026 FIFA World Cup.

Your target user is "Sideline Sam" — a
19-24 year old American male who follows
NFL and NBA but has never watched soccer.

Rules:
- Keep responses under 150 words
- Use American sports analogies
  (NFL, NBA, MLB) to explain concepts
- Plain English only — no soccer jargon
  without immediate explanation
- Be enthusiastic but accurate
- Never fabricate statistics
`;

const BASELINE_SYSTEM_PROMPT = `
You are a helpful soccer companion for a
casual American sports fan. Answer
questions clearly and in plain English.
`;

// ─────────────────────────────────────────
// JUDGE SYSTEM PROMPT
// Taken directly from eval framework doc
// ─────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `
You are an expert evaluator assessing the
quality of AI responses for a soccer
companion app designed for casual American
sports fans. The app's target user --
called Sideline Sam -- is a 19-24 year old
American male sports fan who knows almost
nothing about soccer.

YOUR JOB: You will receive a question, a
verified reference answer, and the AI's
actual response. Score the response on
three dimensions using the rubric below.

Return ONLY valid JSON -- no preamble,
no markdown, no explanation outside
the JSON structure.

SCORING RUBRIC:

FACTUAL ACCURACY (score: 0, 0.5, or 1.0)
1.0 = Factually correct and consistent
  with the reference answer. No errors.
0.5 = Mostly correct but contains a minor
  inaccuracy or misleading omission.
0.0 = Contains a clear factual error or
  contradicts the reference answer.

RELEVANCE (score: 0, 0.5, or 1.0)
1.0 = Directly and completely answers
  the question asked. Nothing missing.
0.5 = Partially answers but drifts off
  topic or answers a slightly different
  question.
0.0 = Does not answer the question asked.

CLARITY (score: 0, 0.5, or 1.0)
1.0 = Concise and builds genuine
  comprehension through American sports
  analogies or plain English examples.
  Sam could explain this to someone else.
0.5 = Technically plain English but does
  not build comprehension -- informs
  without helping Sam understand.
0.0 = Either uses unexplained soccer
  jargon OR assumes prior soccer knowledge
  Sam does not have.

CRITICAL RULE FOR 0.5 SCORES:
For any dimension scored 0.5 you MUST
provide:
(a) A one-sentence justification
(b) A suggested rewrite showing what a
    1.0 answer looks like

RETURN THIS JSON EXACTLY:
{
  "factual_accuracy": 0 or 0.5 or 1.0,
  "factual_justification": "",
  "factual_rewrite": "",
  "relevance": 0 or 0.5 or 1.0,
  "relevance_justification": "",
  "relevance_rewrite": "",
  "clarity": 0 or 0.5 or 1.0,
  "clarity_justification": "",
  "clarity_rewrite": "",
  "total_score": 0.0,
  "flags": ""
}
`;

// ─────────────────────────────────────────
// Get AI response (full system or baseline)
// ─────────────────────────────────────────

async function getAIResponse(question, useRAG = true) {
  let systemPrompt = useRAG
    ? FULL_SYSTEM_PROMPT
    : BASELINE_SYSTEM_PROMPT;

  if (useRAG) {
    const ragContext = retrieve(question, 3);
    systemPrompt += `\n\nRELEVANT KNOWLEDGE:\n${ragContext}`;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 250,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: question,
    }],
  });

  return response.content[0].text;
}

// ─────────────────────────────────────────
// Score one response with judge
// ─────────────────────────────────────────

async function judgeResponse(question, referenceAnswer, aiResponse) {
  const userMessage = `
QUESTION: ${question}

REFERENCE ANSWER: ${referenceAnswer}

AI RESPONSE: ${aiResponse}

Score this response now.
`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: userMessage,
      }],
    });

    const text = response.content[0].text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const scores = JSON.parse(text);

    // Validate and fix total_score
    scores.total_score =
      (scores.factual_accuracy || 0) +
      (scores.relevance || 0) +
      (scores.clarity || 0);

    return scores;

  } catch (err) {
    console.error('Judge error:', err.message);
    return {
      factual_accuracy: 0,
      relevance: 0,
      clarity: 0,
      total_score: 0,
      flags: `Judge error: ${err.message}`,
      factual_justification: '',
      factual_rewrite: '',
      relevance_justification: '',
      relevance_rewrite: '',
      clarity_justification: '',
      clarity_rewrite: '',
    };
  }
}

// ─────────────────────────────────────────
// Run eval on all questions
// ─────────────────────────────────────────

async function runEval(useRAG = true, label = 'full_system') {
  const questions = Object.entries(REFERENCE_ANSWERS);
  const results = [];
  let totalScore = 0;
  let maxPossible = 0;

  console.log(
    `\nRunning ${label} eval ` +
    `(${questions.length} questions)...`
  );
  console.log('─'.repeat(50));

  for (const [id, data] of questions) {
    process.stdout.write(`  ${id}... `);

    try {
      // Get AI response
      const aiResponse = await getAIResponse(data.question, useRAG);

      // Judge the response
      const scores = await judgeResponse(
        data.question,
        data.reference_answer,
        aiResponse
      );

      const result = {
        id,
        category: data.category,
        question: data.question,
        ai_response: aiResponse,
        reference_answer: data.reference_answer,
        scores,
        label,
      };

      results.push(result);
      totalScore += scores.total_score;
      maxPossible += 3.0;

      // Show pass/fail inline
      const pct = Math.round((scores.total_score / 3.0) * 100);
      const icon = pct >= 75 ? '✅' : pct >= 50 ? '⚠️ ' : '❌';
      console.log(`${icon} ${pct}% (${scores.total_score}/3.0)`);

    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({
        id,
        category: data.category,
        question: data.question,
        error: err.message,
        scores: { total_score: 0 },
        label,
      });
      maxPossible += 3.0;
    }

    // Rate limiting — avoid API throttle
    await new Promise(r => setTimeout(r, 800));
  }

  const overallPct = Math.round((totalScore / maxPossible) * 100);

  return {
    label,
    results,
    summary: {
      total_score: totalScore,
      max_possible: maxPossible,
      overall_pct: overallPct,
      questions_run: questions.length,
    },
  };
}

// ─────────────────────────────────────────
// Calculate category breakdown
// ─────────────────────────────────────────

function getCategoryBreakdown(results) {
  const categories = {};

  results.forEach(r => {
    const cat = r.category || 'Unknown';
    if (!categories[cat]) {
      categories[cat] = {
        total: 0,
        max: 0,
        count: 0,
        failures: [],
      };
    }
    categories[cat].total += r.scores?.total_score || 0;
    categories[cat].max += 3.0;
    categories[cat].count += 1;

    if ((r.scores?.total_score || 0) < 2.0) {
      categories[cat].failures.push({
        id: r.id,
        score: r.scores?.total_score,
        question: r.question,
        flags: r.scores?.flags,
      });
    }
  });

  const breakdown = {};
  for (const [cat, data] of Object.entries(categories)) {
    breakdown[cat] = {
      score_pct: Math.round((data.total / data.max) * 100),
      count: data.count,
      failures: data.failures,
    };
  }
  return breakdown;
}

// ─────────────────────────────────────────
// Check quality gates
// ─────────────────────────────────────────

function checkQualityGates(fullSystem, baseline) {
  const fs_results = fullSystem.results;

  // Calculate dimension averages
  const dims = { factual: 0, relevance: 0, clarity: 0 };
  let count = 0;

  fs_results.forEach(r => {
    if (r.scores) {
      dims.factual += r.scores.factual_accuracy || 0;
      dims.relevance += r.scores.relevance || 0;
      dims.clarity += r.scores.clarity || 0;
      count++;
    }
  });

  const factualPct = count > 0
    ? Math.round((dims.factual / count) * 100) : 0;
  const relevancePct = count > 0
    ? Math.round((dims.relevance / count) * 100) : 0;
  const clarityPct = count > 0
    ? Math.round((dims.clarity / count) * 100) : 0;

  // Baseline delta
  const baselineDelta =
    fullSystem.summary.overall_pct -
    (baseline?.summary?.overall_pct || 0);

  const gates = [
    {
      name: 'Factual Accuracy >= 80%',
      pass: factualPct >= 80,
      value: `${factualPct}%`,
      threshold: '80%',
    },
    {
      name: 'Relevance >= 80%',
      pass: relevancePct >= 80,
      value: `${relevancePct}%`,
      threshold: '80%',
    },
    {
      name: 'Clarity >= 75%',
      pass: clarityPct >= 75,
      value: `${clarityPct}%`,
      threshold: '75%',
    },
    {
      name: 'Baseline delta >= +15pts',
      pass: baselineDelta >= 15,
      value: `+${baselineDelta}pts`,
      threshold: '+15pts',
    },
  ];

  return {
    gates,
    dimensions: {
      factual: factualPct,
      relevance: relevancePct,
      clarity: clarityPct,
    },
    baselineDelta,
    allPass: gates.every(g => g.pass),
  };
}

// ─────────────────────────────────────────
// Print final report
// ─────────────────────────────────────────

function printReport(fullSystem, baseline, gateResults) {
  console.log('\n' + '='.repeat(60));
  console.log('EVAL REPORT -- AI Soccer Companion');
  console.log(new Date().toISOString());
  console.log('='.repeat(60));

  console.log('\nOVERALL SCORES:');
  console.log(
    `  Full system:  ${fullSystem.summary.overall_pct}% ` +
    `(${fullSystem.summary.total_score.toFixed(1)}` +
    `/${fullSystem.summary.max_possible})`
  );
  if (baseline) {
    console.log(
      `  Baseline:     ${baseline.summary.overall_pct}% ` +
      `(${baseline.summary.total_score.toFixed(1)}` +
      `/${baseline.summary.max_possible})`
    );
    console.log(`  RAG lift:     +${gateResults.baselineDelta} points`);
  }

  console.log('\nDIMENSION SCORES:');
  console.log(`  Factual Accuracy: ${gateResults.dimensions.factual}%`);
  console.log(`  Relevance:        ${gateResults.dimensions.relevance}%`);
  console.log(`  Clarity:          ${gateResults.dimensions.clarity}%`);

  console.log('\nBY CATEGORY:');
  const breakdown = getCategoryBreakdown(fullSystem.results);
  for (const [cat, data] of Object.entries(breakdown)) {
    const icon = data.score_pct >= 80 ? '[PASS]' : '[WARN]';
    console.log(
      `  ${icon} ${cat}: ${data.score_pct}% ` +
      `(${data.failures.length} failures)`
    );
  }

  console.log('\nQUALITY GATES:');
  gateResults.gates.forEach(g => {
    const icon = g.pass ? '[PASS]' : '[FAIL]';
    console.log(
      `  ${icon} ${g.name}: ${g.value} ` +
      `(threshold: ${g.threshold})`
    );
  });

  console.log('\n' + '='.repeat(60));
  if (gateResults.allPass) {
    console.log('ALL GATES PASSED -- Ready to launch');
  } else {
    const failed = gateResults.gates.filter(g => !g.pass).length;
    console.log(`${failed} GATE(S) FAILED -- Fix before launch`);
  }
  console.log('='.repeat(60));

  // Show top failures
  const allFailures = fullSystem.results
    .filter(r => (r.scores?.total_score || 0) < 1.5)
    .sort((a, b) =>
      (a.scores?.total_score || 0) - (b.scores?.total_score || 0)
    )
    .slice(0, 10);

  if (allFailures.length > 0) {
    console.log('\nTOP FAILURES TO FIX:');
    allFailures.forEach(f => {
      console.log(`\n  ${f.id} (${f.scores?.total_score}/3.0):`);
      console.log(`  Q: ${f.question.slice(0, 60)}...`);
      if (f.scores?.flags) {
        console.log(`  Flag: ${f.scores.flags.slice(0, 100)}`);
      }
    });
  }

  console.log('');
}

// ─────────────────────────────────────────
// Save results to file
// ─────────────────────────────────────────

function saveResults(fullSystem, baseline, gateResults) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `eval-results-${date}.json`;
  const filepath = path.join(__dirname, filename);

  const output = {
    date,
    full_system: fullSystem,
    baseline: baseline || null,
    quality_gates: gateResults,
    category_breakdown: getCategoryBreakdown(fullSystem.results),
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));

  console.log(`\nResults saved to: backend/eval/${filename}`);
  return filepath;
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('AI SOCCER COMPANION -- EVAL RUNNER');
  console.log('Dataset 1: Static Golden Test Set');
  console.log('='.repeat(60));

  // Parse args
  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick');
  const skipBaseline = args.includes('--skip-baseline');

  // In quick mode only run first 10 questions to test the pipeline
  let referenceAnswers = REFERENCE_ANSWERS;
  if (quickMode) {
    console.log('\nQUICK MODE -- running first 10 questions only');
    const entries = Object.entries(REFERENCE_ANSWERS).slice(0, 10);
    referenceAnswers = Object.fromEntries(entries);
  }

  // Override REFERENCE_ANSWERS for this run (quick mode subset)
  Object.keys(REFERENCE_ANSWERS).forEach(k => delete REFERENCE_ANSWERS[k]);
  Object.assign(REFERENCE_ANSWERS, referenceAnswers);

  // Run full system eval
  const fullSystem = await runEval(true, 'full_system');

  // Run baseline (optional)
  let baseline = null;
  if (!skipBaseline) {
    console.log('\nRunning baseline comparison...');
    baseline = await runEval(false, 'baseline');
  }

  // Check quality gates
  const gateResults = checkQualityGates(fullSystem, baseline);

  // Print report
  printReport(fullSystem, baseline, gateResults);

  // Save results
  saveResults(fullSystem, baseline, gateResults);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
