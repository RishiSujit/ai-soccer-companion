require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─────────────────────────────────────
// TEST UTILITIES
// ─────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function pass(testName) {
  console.log(`  ✅ ${testName}`);
  passed++;
}

function fail(testName, reason) {
  console.log(`  ❌ ${testName}`);
  console.log(`     Reason: ${reason}`);
  failed++;
  failures.push({ testName, reason });
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

async function apiCall(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, opts);
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// ─────────────────────────────────────
// TEST 1 — BACKEND HEALTH
// ─────────────────────────────────────

async function testBackendHealth() {
  section('1. BACKEND HEALTH');

  try {
    const { status, data } = await apiCall('GET', '/health');
    if (status === 200) {
      pass('Backend is running');
    } else {
      fail('Backend health check', `Status ${status}`);
    }
  } catch (err) {
    fail('Backend reachable', `Cannot connect to ${API_URL} — is the server running?`);
  }

  const required = [
    'REACT_APP_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'LIVESCORE_API_KEY',
    'LIVESCORE_API_SECRET',
  ];

  for (const key of required) {
    if (process.env[key]) {
      pass(`Env var set: ${key}`);
    } else {
      fail(`Env var missing: ${key}`, 'Not set in .env');
    }
  }
}

// ─────────────────────────────────────
// TEST 2 — DATABASE CONNECTION
// ─────────────────────────────────────

async function testDatabase() {
  section('2. DATABASE CONNECTION');

  const tables = [
    'users',
    'groups',
    'group_members',
    'matches',
    'daily_predictions',
    'daily_prediction_cards',
    'response_ratings',
    'match_recaps',
    'hot_takes',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        fail(`Table accessible: ${table}`, error.message);
      } else {
        pass(`Table accessible: ${table}`);
      }
    } catch (err) {
      fail(`Table accessible: ${table}`, err.message);
    }
  }
}

// ─────────────────────────────────────
// TEST 3 — WORLD CUP DATA
// ─────────────────────────────────────

async function testWorldCupData() {
  section('3. WORLD CUP DATA');

  // matches table uses stage='group', not league_id
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('kickoff_time');

  if (error) {
    fail('Matches table readable', error.message);
    return;
  }

  if (matches?.length >= 16) {
    pass(`WC matches seeded: ${matches.length} matches`);
  } else {
    fail(
      'WC matches seeded',
      `Only ${matches?.length || 0} matches found — run seed-wc-matches.js`
    );
  }

  // Check first match is correct
  const first = matches?.[0];
  if (first?.home_team === 'Mexico' && first?.away_team === 'South Africa') {
    pass('First match correct: Mexico vs South Africa Jun 11');
  } else {
    fail('First match correct', `Got: ${first?.home_team} vs ${first?.away_team}`);
  }

  // Check USA match exists
  const usaMatch = matches?.find(m => m.home_team === 'USA' || m.away_team === 'USA');
  if (usaMatch) {
    pass(`USA match seeded: USA vs ${usaMatch.away_team} — ${usaMatch.kickoff_et}`);
  } else {
    fail('USA match seeded', 'No USA match found in matches table');
  }
}

// ─────────────────────────────────────
// TEST 4 — AI COMPANION
// ─────────────────────────────────────

async function testCompanion() {
  section('4. AI COMPANION');

  // Test general mode
  try {
    const start = Date.now();
    const { status, data } = await apiCall('POST', '/api/chat', {
      message: 'what is offside?',
      matchContext: null,
      userContext: { knownSports: ['NFL', 'NBA'] },
      conversationHistory: [],
    });

    const elapsed = Date.now() - start;

    if (status !== 200) {
      fail('Companion responds (general)', `Status ${status}`);
      return;
    }

    if (data.reply) {
      pass(`Companion responds (general) — ${elapsed}ms`);
    } else {
      fail('Companion has reply field', `Got: ${JSON.stringify(Object.keys(data))}`);
    }

    if (data.followUps?.length >= 3) {
      pass(`Follow-up pills returned: ${data.followUps.length} pills`);
    } else {
      fail('Follow-up pills returned', `Got ${data.followUps?.length || 0} pills — expected 3`);
    }

    const wordCount = data.reply.split(' ').length;
    if (wordCount <= 150) {
      pass(`Response length OK: ${wordCount} words`);
    } else {
      fail('Response length under 150 words', `Got ${wordCount} words — check system prompt`);
    }

    if (!data.reply.includes('**') && !data.reply.includes('###')) {
      pass('No markdown in response');
    } else {
      fail('No markdown in response', 'Response contains ** or ###');
    }

    const hasAnalogy =
      data.analogy !== null ||
      data.reply.toLowerCase().includes('like a') ||
      data.reply.toLowerCase().includes('think of');

    if (hasAnalogy) {
      pass('Sports analogy present');
    } else {
      fail('Sports analogy present', 'No analogy found in response');
    }

  } catch (err) {
    fail('Companion API call', err.message);
  }

  // Test live mode
  try {
    const { status, data } = await apiCall('POST', '/api/chat', {
      message: 'what just happened?',
      matchContext: {
        homeTeam: 'Mexico',
        awayTeam: 'South Africa',
        homeScore: 1,
        awayScore: 0,
        minute: 34,
        stage: 'Group A',
        tournament: 'FIFA World Cup 2026',
        events: [
          {
            type: 'Goal',
            detail: 'Normal Goal',
            player: { name: 'Raul Jimenez' },
            team: { name: 'Mexico' },
            time: { elapsed: 32 },
          },
        ],
      },
      userContext: { knownSports: ['NFL', 'NBA'] },
      conversationHistory: [],
    });

    if (status === 200 && data.reply) {
      pass('Companion responds (live mode)');
    } else {
      fail('Companion live mode', `Status ${status}`);
    }

    const mentionsMexico =
      data.reply.toLowerCase().includes('mexico') ||
      data.reply.toLowerCase().includes('jimenez') ||
      data.reply.toLowerCase().includes('goal');

    if (mentionsMexico) {
      pass('Live response references match');
    } else {
      fail('Live response references match', 'Response does not mention Mexico, Jimenez, or goal');
    }

  } catch (err) {
    fail('Companion live mode API call', err.message);
  }
}

// ─────────────────────────────────────
// TEST 5 — DAILY PREDICTION CARD
// ─────────────────────────────────────

async function testPredictionCard() {
  section('5. DAILY PREDICTION CARD');

  try {
    // Route is mounted at /api/daily-card/today
    const { status, data } = await apiCall('GET', '/api/daily-card/today');

    if (status !== 200) {
      fail('Daily card loads', `Status ${status}`);
      return;
    }

    pass('Daily card endpoint responds');

    const card = data.card;

    if (card?.feature_match?.homeTeam) {
      pass(`Feature match: ${card.feature_match.homeTeam} vs ${card.feature_match.awayTeam}`);
    } else {
      fail('Feature match present', 'No feature_match in card');
    }

    // Check no test data
    const cardStr = JSON.stringify(card);
    const testData = [
      'Argentina vs France',
      'PSG',
      'UCL',
      'Champions League Final',
      'Mbappe',
    ];

    let hasTestData = false;
    for (const td of testData) {
      if (cardStr.includes(td)) {
        fail(`No test data in card: ${td}`, `Found "${td}" in prediction card`);
        hasTestData = true;
      }
    }
    if (!hasTestData) pass('No test data in card');

    if (card?.daily_questions?.length >= 3) {
      pass(`Daily questions: ${card.daily_questions.length} questions`);
    } else {
      fail('Daily questions present', `Got ${card?.daily_questions?.length || 0} questions`);
    }

    if (card?.bonus?.question) {
      pass('Bonus question present');
    } else {
      fail('Bonus question present', 'No bonus in card');
    }

    const totalPts = [
      ...(card?.daily_questions || []),
      ...(card?.feature_match?.props || []),
    ].reduce((sum, q) => sum + (q.points || 0), 0) + (card?.bonus?.points || 0);

    if (totalPts >= 20) {
      pass(`Total points available: ${totalPts}`);
    } else {
      fail('Sufficient points available', `Only ${totalPts} pts — expected 20+`);
    }

  } catch (err) {
    fail('Daily card API call', err.message);
  }
}

// ─────────────────────────────────────
// TEST 6 — GROUPS AND LEADERBOARD
// ─────────────────────────────────────

async function testGroups() {
  section('6. GROUPS & LEADERBOARD');

  const { data: groups, error: gErr } = await supabase.from('groups').select('*').limit(5);

  if (gErr) {
    fail('Groups table readable', gErr.message);
  } else {
    pass(`Groups table: ${groups?.length} groups found`);
  }

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select('*')
    .limit(10);

  if (mErr) {
    fail('group_members readable', mErr.message + ' — check RLS select policy');
  } else {
    pass(`group_members: ${members?.length} memberships found`);
  }

  const { data: memberCheck } = await supabase
    .from('group_members')
    .select('total_points')
    .limit(1);

  if (memberCheck !== null) {
    pass('total_points column exists in group_members');
  } else {
    fail('total_points column', 'Column may not exist or RLS is blocking');
  }

  try {
    // backend expects groupName (not name) and a valid UUID for userId
    const { randomUUID } = require('crypto');
    const testUserId = randomUUID();
    const { status, data } = await apiCall('POST', '/api/groups/create', {
      groupName: 'E2E Test Group',
      userId: testUserId,
    });

    // API returns inviteCode (camelCase)
    const inviteCode = data.inviteCode || data.invite_code;
    if (status === 200 && inviteCode) {
      pass(`Group creation: code = ${inviteCode}`);
      await supabase.from('groups').delete().eq('invite_code', inviteCode);
    } else {
      fail('Group creation endpoint', `Status ${status} — ${JSON.stringify(data)}`);
    }
  } catch (err) {
    fail('Group creation API call', err.message);
  }
}

// ─────────────────────────────────────
// TEST 7 — RATINGS
// ─────────────────────────────────────

async function testRatings() {
  section('7. RESPONSE RATINGS');

  // Use actual schema: id, user_id, session_id, message_index (NOT NULL), rating (NOT NULL)
  const testRating = {
    message_index: 9999,
    rating: 'up',
  };

  const { error: insertErr } = await supabase.from('response_ratings').insert(testRating);

  if (insertErr) {
    fail('Rating saves to Supabase', insertErr.message);
  } else {
    pass('Rating saves to Supabase');
    await supabase.from('response_ratings').delete().eq('message_index', 9999);
  }

  try {
    const { status } = await apiCall('GET', '/api/ratings/summary');
    if (status === 200) {
      pass('Ratings summary endpoint');
    } else {
      fail('Ratings summary endpoint', `Status ${status}`);
    }
  } catch (err) {
    fail('Ratings API call', err.message);
  }
}

// ─────────────────────────────────────
// TEST 8 — SPORTS API
// ─────────────────────────────────────

async function testSportsAPI() {
  section('8. SPORTS API CONNECTION');

  try {
    const { getTodayFixtures } = require('../lib/livescoreApi');
    const fixtures = await getTodayFixtures();

    if (Array.isArray(fixtures)) {
      pass(`livescore-api.com connected (competition_id=${process.env.LIVESCORE_COMPETITION_ID || '362'})`);
      pass(`Today's fixtures returned: ${fixtures.length} matches`);
    } else {
      fail('livescore-api response', 'Unexpected response shape');
    }
  } catch (err) {
    fail('livescore-api connection', err.message);
  }
}

// ─────────────────────────────────────
// TEST 9 — HOME SCREEN ROUTES
// ─────────────────────────────────────

async function testHomeRoutes() {
  section('9. HOME SCREEN ROUTES');

  const routes = [
    { path: '/api/home/hot-take', name: 'Hot take' },           // singular, not hot-takes
    { path: '/api/home/recap/Mexico', name: 'Match recap' },     // requires :team param
    { path: '/api/matches/live', name: 'Live matches' },         // only /live exists, not /upcoming
    { path: '/api/daily-card/today', name: 'Daily card' },       // mounted at /today
  ];

  for (const route of routes) {
    try {
      const { status } = await apiCall('GET', route.path);

      if (status === 200) {
        pass(`Route responds: ${route.name}`);
      } else if (status === 404) {
        fail(`Route exists: ${route.name}`, `404 — route not found at ${route.path}`);
      } else {
        fail(`Route responds: ${route.name}`, `Status ${status}`);
      }
    } catch (err) {
      fail(`Route reachable: ${route.name}`, err.message);
    }
  }
}

// ─────────────────────────────────────
// TEST 10 — PRE-LAUNCH CHECKLIST
// ─────────────────────────────────────

async function testPreLaunchChecklist() {
  section('10. PRE-LAUNCH CHECKLIST');

  const compId = process.env.LIVESCORE_COMPETITION_ID;
  if (compId === '362') {
    pass('LIVESCORE_COMPETITION_ID = 362 (World Cup 2026) ✅');
  } else {
    fail('LIVESCORE_COMPETITION_ID must be 362', `Currently set to ${compId}`);
  }

  const lsKey = process.env.LIVESCORE_API_KEY;
  if (lsKey) {
    pass('LIVESCORE_API_KEY set ✅');
  } else {
    fail('LIVESCORE_API_KEY missing', 'Set in .env and Render dashboard');
  }

  const testMode = process.env.REACT_APP_TEST_MATCH_ENABLED;
  if (!testMode || testMode === 'false') {
    pass('TEST_MATCH_ENABLED = false ✅');
  } else {
    fail('TEST_MATCH_ENABLED must be false', `Currently ${testMode} — set to false before June 11`);
  }

  const env = process.env.NODE_ENV;
  if (env === 'production') {
    pass('NODE_ENV = production ✅');
  } else {
    console.log(`  ⚠️  NODE_ENV = ${env} (OK for local testing, must be production on Render)`);
  }

  // matches table uses stage='group', not league_id
  const { data: matches } = await supabase
    .from('matches')
    .select('fixture_id')
    .eq('stage', 'group');

  if (matches?.length >= 16) {
    pass(`WC matches seeded: ${matches.length} ✅`);
  } else {
    fail(
      'WC matches seeded',
      `${matches?.length || 0} matches — run: node backend/scripts/seed-wc-matches.js`
    );
  }

  try {
    const { status, data } = await apiCall('GET', '/api/daily-card/today');

    if (status === 200) {
      const str = JSON.stringify(data);
      const testStrings = [
        'PSG', 'Arsenal', 'UCL', 'Champions League Final', 'Mbappe', 'Argentina vs France',
      ];

      const found = testStrings.filter(s => str.includes(s));

      if (found.length === 0) {
        pass('No test data in prediction card ✅');
      } else {
        fail('No test data in card', `Found: ${found.join(', ')}`);
      }
    }
  } catch (err) {
    console.log('  ⚠️  Could not check card for test data');
  }
}

// ─────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────

function printSummary() {
  const total = passed + failed;
  const pct = Math.round((passed / total) * 100);

  console.log('\n' + '═'.repeat(50));
  console.log('  E2E TEST RESULTS');
  console.log('═'.repeat(50));
  console.log(`  Total:  ${total} tests`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(`  Score:  ${pct}%`);
  console.log('─'.repeat(50));

  if (failures.length > 0) {
    console.log('\n  FAILURES TO FIX:\n');
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.testName}`);
      console.log(`     → ${f.reason}\n`);
    });
  }

  if (failed === 0) {
    console.log('\n  🚀 ALL TESTS PASSING');
    console.log('  App is ready for World Cup!\n');
  } else if (pct >= 80) {
    console.log('\n  ⚠️  MOSTLY READY');
    console.log('  Fix the failures above before June 11\n');
  } else {
    console.log('\n  🚨 NOT READY FOR LAUNCH');
    console.log('  Multiple critical failures\n');
  }

  console.log('═'.repeat(50) + '\n');
}

// ─────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────

async function runAll() {
  console.log('\n' + '═'.repeat(50));
  console.log('  AI SOCCER COMPANION — E2E TESTS');
  console.log('  World Cup Launch Readiness Check');
  console.log('═'.repeat(50));
  console.log(`  API: ${API_URL}`);
  console.log(`  Date: ${new Date().toLocaleDateString()}`);
  console.log(
    `  Days to kickoff: ${Math.ceil((new Date('2026-06-11') - new Date()) / (1000 * 60 * 60 * 24))}`
  );

  await testBackendHealth();
  await testDatabase();
  await testWorldCupData();
  await testCompanion();
  await testPredictionCard();
  await testGroups();
  await testRatings();
  await testSportsAPI();
  await testHomeRoutes();
  await testPreLaunchChecklist();

  printSummary();

  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
