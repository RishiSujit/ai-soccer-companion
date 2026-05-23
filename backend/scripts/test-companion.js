// backend/scripts/test-companion.js
// Tests the full companion pipeline using
// 2022 World Cup Final historical data.
// No live API calls needed.
//
// Run with: node backend/scripts/test-companion.js

require('dotenv').config();
const { buildDerivedSignals } =
  require('../lib/matchSignals');
const Anthropic = require('@anthropic-ai/sdk');
const { retrieve } = require('../lib/rag');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────
// HISTORICAL MATCH DATA
// 2022 World Cup Final · Argentina vs France
// Scenario: 116' extra time, score 3-3
// Mbappe just equalized with a stunning volley
// ─────────────────────────────────────────

const MATCH_STATE = {
  homeTeam: 'Argentina',
  awayTeam: 'France',
  homeScore: 3,
  awayScore: 3,
  minute: 116,
  stage: 'Final',
  isExtraTime: true,
  isPenaltyShootout: false,
};

const MATCH_EVENTS = [
  { time: { elapsed: 23 }, type: 'Penalty',
    team: { name: 'Argentina' },
    player: { name: 'Messi' },
    detail: 'Penalty scored' },
  { time: { elapsed: 36 }, type: 'Goal',
    team: { name: 'Argentina' },
    player: { name: 'Di Maria' },
    detail: 'Normal Goal' },
  { time: { elapsed: 71 }, type: 'Substitution',
    team: { name: 'France' },
    player: { name: 'Mbappe' },
    detail: 'Substitution 1' },
  { time: { elapsed: 80 }, type: 'Penalty',
    team: { name: 'France' },
    player: { name: 'Mbappe' },
    detail: 'Penalty scored' },
  { time: { elapsed: 81 }, type: 'Goal',
    team: { name: 'France' },
    player: { name: 'Mbappe' },
    detail: 'Normal Goal' },
  { time: { elapsed: 109 }, type: 'Goal',
    team: { name: 'Argentina' },
    player: { name: 'Messi' },
    detail: 'Normal Goal' },
  { time: { elapsed: 115 }, type: 'VAR',
    team: { name: 'France' },
    player: { name: 'Mbappe' },
    detail: 'Goal disallowed - Offside' },
  { time: { elapsed: 116 }, type: 'Goal',
    team: { name: 'France' },
    player: { name: 'Mbappe' },
    detail: 'Normal Goal' },
];

const MATCH_STATS = {
  possession: { home: 44, away: 56 },
  shots: { home: 14, away: 22 },
};

// ─────────────────────────────────────────
// TEST QUESTIONS
// Mix of factual, contextual, and emotional
// ─────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    id: 'Q1',
    question: 'what just happened?',
    expectedSignals: {
      pressure: 'critical',
      intensity: 'spike',
    },
    notes: 'Tests narrative awareness — ' +
      'should reference Mbappe equalizer',
  },
  {
    id: 'Q2',
    question: 'who has momentum right now?',
    expectedSignals: {
      momentum: 'France',
    },
    notes: 'Tests momentum signal — ' +
      'France scored twice in a row',
  },
  {
    id: 'Q3',
    question: 'what happens if it stays tied?',
    expectedSignals: {
      stakes: 'maximum',
    },
    notes: 'Tests stakes awareness — ' +
      'should explain penalty shootout',
  },
  {
    id: 'Q4',
    question: 'why did they disallow that goal?',
    expectedSignals: {
      intensity: 'spike',
    },
    notes: 'Tests VAR explanation with context',
  },
  {
    id: 'Q5',
    question: 'is Argentina going to win?',
    expectedSignals: {
      pressure: 'critical',
    },
    notes: 'Tests stakes + emotional framing — ' +
      'should not give a definitive answer',
  },
];

// ─────────────────────────────────────────
// USER CONTEXT (NFL fan)
// ─────────────────────────────────────────

const USER_CONTEXT = {
  knownSports: ['NFL', 'NBA'],
  favoriteTeams: ['Seattle Seahawks'],
  team: 'Argentina',
  name: 'Rishi',
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function buildUserContextString(userContext) {
  if (!userContext?.knownSports?.length)
    return 'No user sports context.';
  const sports = userContext.knownSports
    .join(' and ');
  const teams = userContext.favoriteTeams?.length
    ? `Favorite teams: ${
        userContext.favoriteTeams.join(', ')}.`
    : '';
  return `This user follows ${sports}. ${teams}
    Always use analogies from these sports.`;
}

function buildMatchContextString(
  matchState, events, stats, signals) {

  const recentEvents = (events || [])
    .slice(-5)
    .map(e => `${e.time?.elapsed}' — ` +
      `${e.type}` +
      (e.detail ? ` (${e.detail})` : '') +
      ` — ${e.player?.name || ''}` +
      ` [${e.team?.name || ''}]`)
    .join('\n');

  return `
LIVE MATCH:
${matchState.homeTeam} ${matchState.homeScore} \
- ${matchState.awayScore} ${matchState.awayTeam}
Minute: ${matchState.minute}' (Extra Time)
Stage: ${matchState.stage}

RECENT EVENTS:
${recentEvents}

MATCH STATS:
Possession: ${matchState.homeTeam} \
${stats.possession.home}% vs \
${matchState.awayTeam} ${stats.possession.away}%
Shots: ${matchState.homeTeam} \
${stats.shots.home} vs \
${matchState.awayTeam} ${stats.shots.away}

MATCH INTELLIGENCE:
Pressure: ${signals.pressure}
Momentum: ${signals.momentum}
Stakes: ${signals.stakes}
Emotional intensity: ${signals.emotional_intensity}
Narrative: ${signals.narrative}

INSTRUCTIONS:
- If pressure is critical: convey urgency
- If intensity is spike: acknowledge drama first
- Match your energy to the moment
- Keep response under 150 words
`;
}

// ─────────────────────────────────────────
// MAIN TEST RUNNER
// ─────────────────────────────────────────

async function runTest() {
  console.log('\n' + '='.repeat(60));
  console.log('COMPANION TEST — 2022 World Cup Final');
  console.log('Argentina 3-3 France · 116\' Extra Time');
  console.log('='.repeat(60));

  // Build derived signals once
  const signals = buildDerivedSignals(
    MATCH_STATE,
    MATCH_EVENTS,
    MATCH_STATS
  );

  console.log('\n📊 DERIVED SIGNALS:');
  console.log(JSON.stringify(signals, null, 2));
  console.log('='.repeat(60));

  // Verify expected signals
  console.log('\n✅ SIGNAL CHECKS:');
  const checks = [
    ['pressure', 'critical'],
    ['emotional_intensity', 'spike'],
    ['stakes', 'maximum'],
  ];
  checks.forEach(([field, expected]) => {
    const actual = signals[field] || '';
    const pass = actual.toLowerCase()
      .includes(expected.toLowerCase());
    console.log(
      `  ${pass ? '✅' : '❌'} ${field}: ` +
      `expected "${expected}", ` +
      `got "${actual}"`
    );
  });

  console.log('\n' + '='.repeat(60));

  // Run each test question
  const results = [];

  for (const test of TEST_QUESTIONS) {
    console.log(`\n🔵 ${test.id}: "${test.question}"`);
    console.log(`   Notes: ${test.notes}`);
    console.log('-'.repeat(40));

    try {
      // Get RAG context
      const ragContext = retrieve(
        test.question, 3
      );

      // Build system prompt
      const systemPrompt = `
You are an AI soccer companion helping a
casual American fan enjoy a live World Cup
2026 match.

USER SPORTS CONTEXT:
${buildUserContextString(USER_CONTEXT)}

${buildMatchContextString(
  MATCH_STATE,
  MATCH_EVENTS,
  MATCH_STATS,
  signals
)}

RELEVANT KNOWLEDGE:
${ragContext}

Keep responses under 150 words.
Be enthusiastic but accurate.
Never fabricate statistics.
`;

      // Call Claude
      const response = await client
        .messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: test.question
          }],
        });

      const reply = response.content[0].text;

      console.log('💬 RESPONSE:');
      console.log(reply);
      console.log('\n📏 Word count:',
        reply.split(' ').length);

      // Basic checks
      const wordCount = reply.split(' ').length;
      const hasAnalogy =
        /NFL|NBA|football|basketball|touchdown|quarter|playoff|Super Bowl|coach|Wilson|Mahomes|LeBron|Seahawks|Patriots|Warriors|Curry|Brady|Kobe|Jordan/i
        .test(reply);
      const mentionsTeam =
        reply.includes('Argentina') ||
        reply.includes('France') ||
        reply.includes('Mbappe') ||
        reply.includes('Messi');

      console.log('\n🔍 AUTO-CHECKS:');
      console.log(
        `  ${wordCount <= 150 ? '✅' : '❌'} ` +
        `Under 150 words (${wordCount})`
      );
      console.log(
        `  ${hasAnalogy ? '✅' : '⚠️ '} ` +
        `Contains sports analogy`
      );
      console.log(
        `  ${mentionsTeam ? '✅' : '⚠️ '} ` +
        `References match context`
      );

      results.push({
        id: test.id,
        question: test.question,
        response: reply,
        wordCount,
        hasAnalogy,
        mentionsTeam,
        passed: wordCount <= 150 &&
                hasAnalogy &&
                mentionsTeam,
      });

    } catch (err) {
      console.error(`  ❌ ERROR: ${err.message}`);
      results.push({
        id: test.id,
        question: test.question,
        error: err.message,
        passed: false,
      });
    }

    // Small delay between calls
    await new Promise(r => setTimeout(r, 500));
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed)
    .length;
  const total = results.length;

  results.forEach(r => {
    console.log(
      `  ${r.passed ? '✅' : '❌'} ` +
      `${r.id}: "${r.question}"`
    );
  });

  console.log(
    `\nResult: ${passed}/${total} passed`
  );
  console.log(
    passed === total
      ? '🎉 All tests passed!'
      : `⚠️  ${total - passed} test(s) need review`
  );
  console.log('='.repeat(60) + '\n');
}

runTest().catch(console.error);
