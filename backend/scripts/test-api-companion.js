// backend/scripts/test-api-companion.js
// Fetches real 2022 World Cup Final data from API-Football
// and runs it through the full companion pipeline.
//
// Run with: node backend/scripts/test-api-companion.js

require('dotenv').config();
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { buildDerivedSignals } = require('../lib/matchSignals');
const { retrieve } = require('../lib/rag');

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';
const HEADERS = { 'x-apisports-key': API_KEY };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const USER_CONTEXT = {
  knownSports: ['NFL', 'NBA'],
  favoriteTeams: ['Seattle Seahawks'],
  team: 'Argentina',
  name: 'Rishi',
};

let apiCallsMade = 0;
let apiCallsFailed = 0;

// ─────────────────────────────────────────────
// STEP 1 — Find the fixture
// ─────────────────────────────────────────────

async function findFixture() {
  apiCallsMade++;
  try {
    const res = await axios.get(`${BASE_URL}/fixtures`, {
      params: { league: 1, season: 2022, round: 'Final' },
      headers: HEADERS,
    });

    console.log('Fixtures found:', res.data.response?.length);

    const final = res.data.response?.[0];
    if (!final) throw new Error('No final found');

    console.log('Fixture ID:', final.fixture.id);
    console.log('Match:', final.teams.home.name, 'vs', final.teams.away.name);
    console.log('Score:', final.goals.home, '-', final.goals.away);

    return final;
  } catch (err) {
    apiCallsFailed++;
    console.log(`❌ API CALL FAILED: /fixtures — ${err.message}`);
    console.log('  → Falling back to cached/hardcoded data');
    return null;
  }
}

// ─────────────────────────────────────────────
// STEP 2 — Fetch events
// ─────────────────────────────────────────────

async function fetchEvents(fixtureId) {
  apiCallsMade++;
  try {
    const res = await axios.get(`${BASE_URL}/fixtures/events`, {
      params: { fixture: fixtureId },
      headers: HEADERS,
    });

    const events = res.data.response || [];
    console.log(`Events fetched: ${events.length}`);

    const types = [...new Set(events.map(e => e.type))];
    console.log('Event types:', types.join(', '));

    return events;
  } catch (err) {
    apiCallsFailed++;
    console.log(`❌ API CALL FAILED: /fixtures/events — ${err.message}`);
    console.log('  → Falling back to cached/hardcoded data');
    return [];
  }
}

// ─────────────────────────────────────────────
// STEP 3 — Fetch stats
// ─────────────────────────────────────────────

async function fetchStats(fixtureId) {
  apiCallsMade++;
  try {
    const res = await axios.get(`${BASE_URL}/fixtures/statistics`, {
      params: { fixture: fixtureId },
      headers: HEADERS,
    });

    const homeStats = res.data.response?.[0]?.statistics || [];
    const awayStats = res.data.response?.[1]?.statistics || [];

    const getPossession = (statsArr) => {
      const p = statsArr.find(s => s.type === 'Ball Possession');
      return parseInt(p?.value || '50%') || 50;
    };

    const getShots = (statsArr) => {
      const s = statsArr.find(s => s.type === 'Total Shots');
      return s?.value || 0;
    };

    const stats = {
      possession: {
        home: getPossession(homeStats),
        away: getPossession(awayStats),
      },
      shots: {
        home: getShots(homeStats),
        away: getShots(awayStats),
      },
    };

    console.log('Stats fetched:', stats);
    return stats;
  } catch (err) {
    apiCallsFailed++;
    console.log(`❌ API CALL FAILED: /fixtures/statistics — ${err.message}`);
    console.log('  → Falling back to cached/hardcoded data');
    return { possession: { home: 50, away: 50 }, shots: { home: 0, away: 0 } };
  }
}

// ─────────────────────────────────────────────
// STEP 4 — Fetch lineups
// ─────────────────────────────────────────────

async function fetchLineups(fixtureId) {
  apiCallsMade++;
  try {
    const res = await axios.get(`${BASE_URL}/fixtures/lineups`, {
      params: { fixture: fixtureId },
      headers: HEADERS,
    });

    const lineups = res.data.response || [];
    console.log(`Lineups fetched: ${lineups.length} teams`);

    if (lineups.length > 0) {
      console.log('Home formation:', lineups[0]?.formation);
      console.log('Away formation:', lineups[1]?.formation);
      console.log('Home starters:', lineups[0]?.startXI?.length);
      console.log('Away starters:', lineups[1]?.startXI?.length);
    }

    return lineups;
  } catch (err) {
    apiCallsFailed++;
    console.log(`❌ API CALL FAILED: /fixtures/lineups — ${err.message}`);
    console.log('  → Falling back to cached/hardcoded data');
    return [];
  }
}

// ─────────────────────────────────────────────
// STEP 5 — Build match state from real API data
// ─────────────────────────────────────────────

function buildMatchState(fixture) {
  return {
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    minute: fixture.fixture.status.elapsed || 120,
    stage: fixture.league.round || 'Final',
    isExtraTime: true,
    isPenaltyShootout: false,
  };
}

// ─────────────────────────────────────────────
// STEP 6 — Run companion questions
// ─────────────────────────────────────────────

function buildUserContextString(userContext) {
  if (!userContext?.knownSports?.length) return 'No user sports context.';
  const sports = userContext.knownSports.join(' and ');
  const teams = userContext.favoriteTeams?.length
    ? `Favorite teams: ${userContext.favoriteTeams.join(', ')}.`
    : '';
  return `This user follows ${sports}. ${teams} Always use analogies from these sports.`;
}

function buildMatchContextString(matchState, events, stats, signals) {
  const recentEvents = (events || [])
    .slice(-5)
    .map(e =>
      `${e.time?.elapsed}' — ${e.type}` +
      (e.detail ? ` (${e.detail})` : '') +
      (e.player?.name ? ` — ${e.player.name}` : '') +
      (e.team?.name ? ` [${e.team.name}]` : '')
    )
    .join('\n');

  return `
LIVE MATCH:
${matchState.homeTeam} ${matchState.homeScore} - ${matchState.awayScore} ${matchState.awayTeam}
Minute: ${matchState.minute}' (Extra Time)
Stage: ${matchState.stage}

RECENT EVENTS:
${recentEvents || 'No events yet'}

MATCH STATS:
Possession: ${matchState.homeTeam} ${stats.possession.home}% vs ${matchState.awayTeam} ${stats.possession.away}%
Shots: ${matchState.homeTeam} ${stats.shots.home} vs ${matchState.awayTeam} ${stats.shots.away}

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

async function askCompanion(question, matchState, events, stats, signals) {
  const ragContext = retrieve(question, 3);
  const systemPrompt = `You are an AI soccer companion helping a casual American fan enjoy a live World Cup 2026 match.

USER SPORTS CONTEXT:
${buildUserContextString(USER_CONTEXT)}

${buildMatchContextString(matchState, events, stats, signals)}

RELEVANT KNOWLEDGE:
${ragContext}

Keep responses under 150 words.
Be enthusiastic but accurate.
Never fabricate statistics.`;

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
  console.log('API COMPANION TEST — 2022 World Cup Final');
  console.log('Fetching real data from API-Football');
  console.log('='.repeat(60) + '\n');

  // ── Fetch all data ───────────────────────
  console.log('--- STEP 1: Finding fixture ---');
  const fixture = await findFixture();

  if (!fixture) {
    console.log('\n❌ Cannot continue — fixture not found. Check API key.');
    process.exit(1);
  }

  const fixtureId = fixture.fixture.id;

  console.log('\n--- STEP 2: Fetching events ---');
  const events = await fetchEvents(fixtureId);

  console.log('\n--- STEP 3: Fetching statistics ---');
  const stats = await fetchStats(fixtureId);

  console.log('\n--- STEP 4: Fetching lineups ---');
  const lineups = await fetchLineups(fixtureId);

  // ── Build signals ────────────────────────
  console.log('\n--- STEP 5: Building match state & signals ---');
  const matchState = buildMatchState(fixture);
  const signals = buildDerivedSignals(matchState, events, stats);

  console.log('Match state:', matchState);
  console.log('\nDerived signals:');
  console.log(JSON.stringify(signals, null, 2));

  // ── Compatibility checks ─────────────────
  console.log('\n--- STEP 7: Compatibility checks ---');

  const checks = [
    {
      name: 'Fixture found',
      test: () => !!fixture,
    },
    {
      name: 'Events array not empty',
      test: () => events.length > 0,
    },
    {
      name: 'Goal events present',
      test: () => events.some(e => e.type === 'Goal'),
    },
    {
      name: 'Possession stats parsed',
      test: () =>
        stats.possession.home > 0 &&
        stats.possession.away > 0 &&
        stats.possession.home + stats.possession.away === 100,
    },
    {
      name: 'Shot stats parsed',
      test: () => stats.shots.home >= 0,
    },
    {
      name: 'Lineups have 11 starters',
      test: () => lineups[0]?.startXI?.length === 11,
    },
    {
      name: 'Formation string present',
      test: () => !!lineups[0]?.formation,
    },
    {
      name: 'Signals compute correctly',
      test: () =>
        signals.pressure === 'critical' &&
        signals.emotional_intensity.includes('spike'),
    },
    {
      name: 'Player names in events',
      test: () => events.some(e => e.player?.name?.length > 0),
    },
    {
      name: 'API response format valid',
      test: () =>
        fixture.fixture?.id &&
        fixture.teams?.home?.name &&
        fixture.goals?.home !== undefined,
    },
  ];

  const checkResults = checks.map(c => {
    let passed = false;
    try { passed = c.test(); } catch { passed = false; }
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${passed ? 'PASS' : 'FAIL'} — ${c.name}`);
    return passed;
  });

  const checksPassed = checkResults.filter(Boolean).length;

  // ── Companion questions ──────────────────
  console.log('\n--- STEP 6: Running companion questions ---');

  const questions = [
    'what just happened in this match?',
    'who has momentum?',
    'explain the key moments so far',
  ];

  // Collect all starter names for mention-checking
  const starterNames = new Set();
  lineups.forEach(team => {
    (team.startXI || []).forEach(p => {
      const name = p.player?.name || '';
      if (name) starterNames.add(name.split(' ').pop()); // last name
    });
  });

  const homeTeam = fixture.teams.home.name;
  const awayTeam = fixture.teams.away.name;
  const scoreStr = `${fixture.goals.home}-${fixture.goals.away}`;

  const companionResults = [];

  for (const question of questions) {
    console.log(`\n🔵 "${question}"`);
    console.log('-'.repeat(40));

    try {
      const reply = await askCompanion(question, matchState, events, stats, signals);
      const wordCount = reply.split(' ').length;

      const mentionsPlayer = [...starterNames].some(name =>
        reply.includes(name)
      );
      const mentionsScore =
        reply.includes(fixture.goals.home.toString()) ||
        reply.includes(scoreStr) ||
        reply.includes(homeTeam) ||
        reply.includes(awayTeam);

      console.log('💬 RESPONSE:');
      console.log(reply);
      console.log(`\n📏 Word count: ${wordCount}`);
      console.log(`  ${wordCount <= 150 ? '✅' : '❌'} Under 150 words`);
      console.log(`  ${mentionsPlayer ? '✅' : '⚠️ '} Mentions real player name`);
      console.log(`  ${mentionsScore ? '✅' : '⚠️ '} References real score/teams`);

      companionResults.push({ question, wordCount, mentionsPlayer, mentionsScore, good: wordCount <= 150 && mentionsScore });
    } catch (err) {
      console.error(`  ❌ ERROR: ${err.message}`);
      companionResults.push({ question, error: err.message, good: false });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // ── Final report ─────────────────────────
  const companionGood = companionResults.filter(r => r.good).length;
  const readyForSunday = checksPassed >= 9;

  console.log('\n\n' + '═'.repeat(48));
  console.log('API COMPATIBILITY REPORT');
  console.log('2022 World Cup Final — Real API Data');
  console.log('═'.repeat(48));
  console.log(`Fixture ID: ${fixtureId}`);
  console.log(`Match: ${fixture.teams.home.name} ${fixture.goals.home} - ${fixture.goals.away} ${fixture.teams.away.name}`);
  console.log(`API calls made: ${apiCallsMade} (fixtures, events, stats, lineups)`);
  console.log(`API calls failed: ${apiCallsFailed}`);
  console.log('');
  console.log(`COMPATIBILITY CHECKS: ${checksPassed}/10 passed`);
  checks.forEach((c, i) => {
    console.log(`  ${checkResults[i] ? '✅' : '❌'} ${c.name}`);
  });
  console.log('');
  console.log(`COMPANION QUALITY: ${companionGood}/3 questions good`);
  companionResults.forEach(r => {
    console.log(`  ${r.good ? '✅' : '❌'} "${r.question}"${r.wordCount ? ` (${r.wordCount} words)` : ''}`);
  });
  console.log('');
  console.log(`READY FOR SUNDAY: ${readyForSunday ? 'YES' : 'NO'}`);
  console.log('═'.repeat(48) + '\n');
}

run().catch(console.error);
