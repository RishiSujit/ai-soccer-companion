'use strict';

/**
 * Ground-Truth Accuracy Eval — tests companion against real 2026 WC API data.
 * Scores each response as PASS / PARTIAL / FAIL based on required keywords.
 *
 * Run:  node backend/eval/ground-truth-eval.js
 */

require('dotenv').config();
// Native fetch is available in Node 18+ — no node-fetch needed

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── Ground-truth test cases ────────────────────────────────────────────────────
// Each test has:
//   message        — what the user asks
//   matchContext   — optional (simulates an open match)
//   mustContain    — ALL of these strings must appear in the reply (case-insensitive)
//   mustNotContain — NONE of these strings should appear (hallucination guard)
//   description    — what this tests

const TEST_CASES = [
  // ─── Match Results ───────────────────────────────────────────────────────────
  {
    id: 'result-usa-paraguay',
    description: 'USA vs Paraguay final score',
    message: 'What was the final score of USA vs Paraguay?',
    mustContain: ['4', '1', 'USA', 'Paraguay'],
    mustNotContain: [],
  },
  {
    id: 'result-brazil-morocco',
    description: 'Brazil vs Morocco final score',
    message: 'What was the result when Brazil played Morocco?',
    mustContain: ['1', 'Brazil', 'Morocco'],
    mustNotContain: ['3-1', '2-0', '2-1'], // common hallucinations
  },
  {
    id: 'result-brazil-haiti',
    description: 'Brazil vs Haiti final score',
    message: 'What was the score in the Brazil vs Haiti match?',
    mustContain: ['3', '0', 'Brazil', 'Haiti'],
    mustNotContain: ['1-0', '2-1', '4-0'],
  },
  {
    id: 'result-usa-turkey',
    description: 'USA lost to Turkey 3-2',
    message: 'Did USA win their final group game against Turkey?',
    mustContain: ['Turkey', '3', '2'],
    mustNotContain: ['USA won', 'USA beat Turkey', 'beat Turkey 3-2'],
  },

  // ─── Scorers ─────────────────────────────────────────────────────────────────
  {
    id: 'scorer-usa-paraguay',
    description: 'Goals scored in USA vs Paraguay',
    message: 'Who scored in the USA vs Paraguay match?',
    matchContext: { homeTeam: 'USA', awayTeam: 'Paraguay', matchId: '716234', homeScore: 4, awayScore: 1 },
    mustContain: ['Balogun', 'Reyna'],
    mustNotContain: ['Pulisic scored', 'Weah scored', 'McKennie scored'],
  },
  {
    id: 'scorer-usa-australia',
    description: 'Goals scored in USA vs Australia',
    message: 'Who scored in this USA vs Australia match?',
    matchContext: { homeTeam: 'USA', awayTeam: 'Australia', matchId: '716700', homeScore: 2, awayScore: 0 },
    mustContain: ['Freeman', 'Burgess'],
    mustNotContain: ['Pulisic scored', 'Roldan scored'],
  },

  // ─── Standings ───────────────────────────────────────────────────────────────
  {
    id: 'standings-mexico-points',
    description: 'Mexico points in Group A',
    message: 'How many points does Mexico have in the standings?',
    mustContain: ['Mexico', '9'],
    mustNotContain: [],
  },
  {
    id: 'standings-group-e',
    description: 'Group E top teams',
    message: 'Who are the top 2 teams in Group E?',
    mustContain: ['Germany', 'Ivory Coast', '6'],
    mustNotContain: [],
  },
  {
    id: 'standings-usa-group',
    description: 'USA group standing',
    message: 'How many points did USA finish with in the group stage?',
    mustContain: ['USA', '6'],
    mustNotContain: ['9 points', '3 points'],
  },

  // ─── Lineups ─────────────────────────────────────────────────────────────────
  {
    id: 'lineup-mexico-gk',
    description: 'Mexico goalkeeper vs South Africa',
    message: 'Who is Mexico\'s goalkeeper?',
    matchContext: { homeTeam: 'Mexico', awayTeam: 'South Africa', matchId: '716178', homeScore: 2, awayScore: 0 },
    mustContain: ['Rangel'],
    mustNotContain: ['Guillermo Ochoa', 'Memo Ochoa'],
  },
  {
    id: 'lineup-usa-starters',
    description: 'USA squad midfielders',
    message: 'Who are the midfielders on the USA team?',
    matchContext: { homeTeam: 'USA', awayTeam: 'Australia', matchId: '716700', homeScore: 2, awayScore: 0 },
    mustContain: ['Adams', 'McKennie'],
    mustNotContain: [],
  },

  // ─── Tournament History ───────────────────────────────────────────────────────
  {
    id: 'history-brazil-full',
    description: 'Brazil full group stage results',
    message: 'What were all of Brazil\'s group stage results?',
    mustContain: ['Brazil', 'Morocco', '1', 'Haiti', '3', 'Scotland'],
    mustNotContain: ['3-1', '2-0 Haiti', '4-0'],
  },
  {
    id: 'history-usa-qualified',
    description: 'USA advanced to knockout stage',
    message: 'Did USA qualify for the knockout stage?',
    mustContain: ['yes', '6'],
    mustNotContain: ['eliminated', 'did not qualify', 'failed to qualify'],
  },

  // ─── Rules / Concepts (training knowledge OK) ────────────────────────────────
  {
    id: 'rules-offside',
    description: 'Offside rule explanation',
    message: 'What is the offside rule?',
    mustContain: ['offside'],
    mustNotContain: [],
  },
  {
    id: 'rules-penalty',
    description: 'Penalty kick explanation',
    message: 'What is a penalty kick?',
    mustContain: ['penalty', '12 yards', 'box'],
    mustNotContain: [],
  },
];

// ── Runner ─────────────────────────────────────────────────────────────────────

async function callCompanion(testCase) {
  const body = {
    message: testCase.message,
    conversationHistory: [],
  };
  if (testCase.matchContext) body.matchContext = testCase.matchContext;

  const resp = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.reply || '';
}

function scoreResponse(reply, testCase) {
  const lReply = reply.toLowerCase();

  const missing = testCase.mustContain.filter(kw => !lReply.includes(kw.toLowerCase()));
  const hallucinations = testCase.mustNotContain.filter(kw => lReply.includes(kw.toLowerCase()));

  if (missing.length === 0 && hallucinations.length === 0) return { score: 'PASS', missing, hallucinations };
  if (hallucinations.length > 0) return { score: 'FAIL', missing, hallucinations };
  if (missing.length <= 1) return { score: 'PARTIAL', missing, hallucinations };
  return { score: 'FAIL', missing, hallucinations };
}

const COLOURS = { PASS: '\x1b[32m', PARTIAL: '\x1b[33m', FAIL: '\x1b[31m', RESET: '\x1b[0m' };

async function run() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  COMPANION GROUND-TRUTH ACCURACY EVAL');
  console.log(`  ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(60)}\n`);

  let pass = 0, partial = 0, fail = 0;
  const results = [];

  for (const tc of TEST_CASES) {
    process.stdout.write(`  [${tc.id}] ... `);
    try {
      const reply = await callCompanion(tc);
      const { score, missing, hallucinations } = scoreResponse(reply, tc);

      const col = COLOURS[score];
      console.log(`${col}${score}${COLOURS.RESET}`);

      if (score === 'PASS') pass++;
      else if (score === 'PARTIAL') { partial++; console.log(`    ⚠ Missing: ${missing.join(', ')}`); }
      else { fail++; console.log(`    ✗ Missing: ${missing.join(', ')}`); if (hallucinations.length) console.log(`    🚨 Hallucination: ${hallucinations.join(', ')}`); }

      if (process.env.VERBOSE) console.log(`    Reply: ${reply.slice(0, 120)}...`);
      results.push({ id: tc.id, description: tc.description, score, reply: reply.slice(0, 200), missing, hallucinations });
    } catch (e) {
      console.log(`\x1b[31mERROR: ${e.message}\x1b[0m`);
      fail++;
      results.push({ id: tc.id, description: tc.description, score: 'ERROR', error: e.message });
    }

    // Gentle rate limiting between calls
    await new Promise(r => setTimeout(r, 1500));
  }

  const total = TEST_CASES.length;
  const pct = Math.round((pass / total) * 100);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  RESULTS: ${pass}/${total} PASS (${pct}%) | ${partial} PARTIAL | ${fail} FAIL`);
  console.log(`${'─'.repeat(60)}\n`);

  if (fail > 0) {
    console.log('  Failed tests:');
    results.filter(r => r.score === 'FAIL' || r.score === 'ERROR').forEach(r => {
      console.log(`    - ${r.id}: ${r.description}`);
    });
    console.log('');
  }

  // Save results
  const outPath = `backend/eval/ground-truth-results-${new Date().toISOString().split('T')[0]}.json`;
  require('fs').writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), pass, partial, fail, total, pct, results }, null, 2));
  console.log(`  Results saved → ${outPath}\n`);

  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
