// backend/scripts/test-api-companion.js
// Fetches live or today's fixture data from livescore-api.com
// and runs it through the full companion pipeline.
//
// Run with: node backend/scripts/test-api-companion.js

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { getLiveMatches, getTodayFixtures, getMatchEvents } = require('../lib/livescoreApi');
const { buildDerivedSignals } = require('../lib/matchSignals');
const { retrieve } = require('../lib/rag');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const USER_CONTEXT = {
  knownSports: ['NFL', 'NBA'],
  favoriteTeams: ['Seattle Seahawks'],
  team: 'USA',
  name: 'Rishi',
};

// ─────────────────────────────────────────────
// STEP 1 — Fetch a fixture to test with
// ─────────────────────────────────────────────

async function findFixture() {
  console.log('Checking for live matches...');
  const live = await getLiveMatches();
  if (live.length > 0) {
    console.log(`Live match found: ${live[0].homeTeam} vs ${live[0].awayTeam}`);
    return { match: live[0], isLive: true };
  }

  console.log('No live matches — checking today\'s fixtures...');
  const today = await getTodayFixtures();
  if (today.length > 0) {
    console.log(`Using upcoming match: ${today[0].homeTeam} vs ${today[0].awayTeam}`);
    return { match: today[0], isLive: false };
  }

  return { match: null, isLive: false };
}

// ─────────────────────────────────────────────
// STEP 2 — Fetch events for match
// ─────────────────────────────────────────────

async function fetchEvents(matchId) {
  try {
    const events = await getMatchEvents(matchId);
    console.log(`Events fetched: ${events.length}`);
    return events;
  } catch (err) {
    console.log(`Events fetch failed: ${err.message} — using empty`);
    return [];
  }
}

// ─────────────────────────────────────────────
// STEP 3 — Build match state
// ─────────────────────────────────────────────

function buildMatchState(match, isLive) {
  const minute = typeof match.minute === 'number' ? match.minute : 0;
  return {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    minute,
    stage: match.stage || 'Group Stage',
    isExtraTime: minute > 90,
    isPenaltyShootout: match.status === 'PEN',
  };
}

// ─────────────────────────────────────────────
// STEP 4 — Run companion questions
// ─────────────────────────────────────────────

function buildUserContextString() {
  const { knownSports, favoriteTeams } = USER_CONTEXT;
  return `This user follows ${knownSports.join(' and ')}. Favorite teams: ${favoriteTeams.join(', ')}. Always use analogies from these sports.`;
}

function buildMatchContextString(matchState, events, stats, signals) {
  const recentEvents = (events || [])
    .slice(-5)
    .map(e =>
      `${e.time?.elapsed || '?'}' — ${e.type}` +
      (e.detail ? ` (${e.detail})` : '') +
      (e.player?.name ? ` — ${e.player.name}` : '') +
      (e.team?.name ? ` [${e.team.name}]` : '')
    )
    .join('\n');

  return `
LIVE MATCH:
${matchState.homeTeam} ${matchState.homeScore} - ${matchState.awayScore} ${matchState.awayTeam}
Minute: ${matchState.minute}'
Stage: ${matchState.stage}

RECENT EVENTS:
${recentEvents || 'No events yet'}

MATCH STATS:
Possession: ${matchState.homeTeam} 50% vs ${matchState.awayTeam} 50%

MATCH INTELLIGENCE:
Pressure: ${signals.pressure}
Momentum: ${signals.momentum}
Stakes: ${signals.stakes}
Emotional intensity: ${signals.emotional_intensity}
Narrative: ${signals.narrative}
`;
}

async function askCompanion(question, matchState, events, stats, signals) {
  const ragContext = retrieve(question, 3);
  const systemPrompt = `You are an AI soccer companion helping a casual American fan enjoy a live World Cup 2026 match.

USER SPORTS CONTEXT:
${buildUserContextString()}

${buildMatchContextString(matchState, events, stats, signals)}

RELEVANT KNOWLEDGE:
${ragContext}

Keep responses under 150 words. Never fabricate statistics.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 250,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }],
  });

  return response.content[0].text;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log('API COMPANION TEST — livescore-api.com');
  console.log(`Competition ID: ${process.env.LIVESCORE_COMPETITION_ID || '362'}`);
  console.log('='.repeat(60) + '\n');

  console.log('--- STEP 1: Finding fixture ---');
  const { match, isLive } = await findFixture();

  if (!match) {
    console.log('❌ No fixtures found for today. Check API credentials.');
    process.exit(1);
  }

  console.log(`\nMatch: ${match.homeTeam} vs ${match.awayTeam}`);
  console.log(`Status: ${isLive ? 'LIVE' : 'Upcoming'}`);
  console.log(`Venue: ${match.venue || 'TBD'}`);
  console.log(`Kickoff ET: ${match.kickoffET || match.kickoff || 'Unknown'}`);

  console.log('\n--- STEP 2: Fetching events ---');
  const events = isLive ? await fetchEvents(match.id) : [];

  console.log('\n--- STEP 3: Building match state & signals ---');
  const matchState = buildMatchState(match, isLive);
  const signals = buildDerivedSignals(matchState, events, {});

  console.log('Match state:', matchState);
  console.log('\nDerived signals:');
  console.log(JSON.stringify(signals, null, 2));

  console.log('\n--- STEP 4: Compatibility checks ---');

  const checks = [
    { name: 'Fixture found', test: () => !!match },
    { name: 'homeTeam string', test: () => typeof match.homeTeam === 'string' && match.homeTeam.length > 0 },
    { name: 'awayTeam string', test: () => typeof match.awayTeam === 'string' && match.awayTeam.length > 0 },
    { name: 'venue present', test: () => typeof match.venue === 'string' },
    { name: 'kickoffET present', test: () => !!match.kickoffET },
    { name: 'homeFlag emoji', test: () => typeof match.homeFlag === 'string' },
    { name: 'awayFlag emoji', test: () => typeof match.awayFlag === 'string' },
    { name: 'stage not raw number', test: () => isNaN(parseInt(match.stage)) || match.stage === 'Group Stage' },
    { name: 'signals computed', test: () => !!signals.pressure && !!signals.momentum },
    { name: 'narrative generated', test: () => typeof signals.narrative === 'string' && signals.narrative.length > 10 },
  ];

  const checkResults = checks.map(c => {
    let passed = false;
    try { passed = c.test(); } catch { passed = false; }
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${passed ? 'PASS' : 'FAIL'} — ${c.name}`);
    return passed;
  });

  const checksPassed = checkResults.filter(Boolean).length;

  console.log('\n--- STEP 5: Running companion questions ---');

  const questions = [
    'what is offside?',
    'who is the best player in this match?',
    'what just happened?',
  ];

  const companionResults = [];

  for (const question of questions) {
    console.log(`\n🔵 "${question}"`);
    console.log('-'.repeat(40));

    try {
      const reply = await askCompanion(question, matchState, events, {}, signals);
      const wordCount = reply.split(' ').length;
      const mentionsTeam = reply.includes(match.homeTeam) || reply.includes(match.awayTeam);

      console.log('💬 RESPONSE:');
      console.log(reply);
      console.log(`\n📏 Word count: ${wordCount}`);
      console.log(`  ${wordCount <= 150 ? '✅' : '❌'} Under 150 words`);
      console.log(`  ${mentionsTeam ? '✅' : '⚠️ '} References match teams`);

      companionResults.push({ question, wordCount, mentionsTeam, good: wordCount <= 150 });
    } catch (err) {
      console.error(`  ❌ ERROR: ${err.message}`);
      companionResults.push({ question, error: err.message, good: false });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // ── Final report ─────────────────────────
  const companionGood = companionResults.filter(r => r.good).length;

  console.log('\n\n' + '═'.repeat(48));
  console.log('API COMPATIBILITY REPORT');
  console.log(`${match.homeTeam} vs ${match.awayTeam} — livescore-api.com`);
  console.log('═'.repeat(48));
  console.log(`Match ID: ${match.id}`);
  console.log(`Status: ${isLive ? 'LIVE' : 'Upcoming'}`);
  console.log(`Events: ${events.length}`);
  console.log('');
  console.log(`COMPATIBILITY CHECKS: ${checksPassed}/${checks.length} passed`);
  console.log(`COMPANION QUALITY: ${companionGood}/3 questions good`);
  console.log('═'.repeat(48) + '\n');
}

run().catch(console.error);
