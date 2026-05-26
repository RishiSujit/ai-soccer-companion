'use strict';

const { buildDerivedSignals } = require('../lib/matchSignals');

const SIGNAL_TEST_CASES = [
  {
    id: 'SIG-01',
    description: 'Late knockout, tied -- should be critical pressure',
    matchState: {
      homeTeam: 'Argentina',
      awayTeam: 'France',
      homeScore: 1,
      awayScore: 1,
      minute: 87,
      stage: 'Quarter-finals',
      isExtraTime: false,
    },
    events: [
      {
        time: { elapsed: 85 },
        type: 'VAR',
        detail: 'Goal disallowed - Offside',
        team: { name: 'Argentina' },
        player: { name: 'Messi' },
      },
    ],
    stats: { possession: { home: 58, away: 42 } },
    expected: {
      pressure: 'critical',
      emotional_intensity_contains: 'spike',
      stakes_contains: 'maximum',
    },
  },
  {
    id: 'SIG-02',
    description: 'Comfortable group stage lead -- should be low pressure',
    matchState: {
      homeTeam: 'USA',
      awayTeam: 'Mexico',
      homeScore: 3,
      awayScore: 0,
      minute: 55,
      stage: 'Group Stage',
    },
    events: [],
    stats: { possession: { home: 62, away: 38 } },
    expected: {
      pressure: 'low',
      emotional_intensity_contains: 'low',
    },
  },
  {
    id: 'SIG-03',
    description: 'Penalty shootout semifinal -- maximum stakes and spike intensity',
    matchState: {
      homeTeam: 'England',
      awayTeam: 'France',
      homeScore: 1,
      awayScore: 1,
      minute: 120,
      stage: 'Semi-finals',
      isPenaltyShootout: true,
    },
    events: [
      {
        time: { elapsed: 120 },
        type: 'Missed Penalty',
        team: { name: 'England' },
        player: { name: 'Saka' },
      },
    ],
    stats: {},
    expected: {
      stakes_contains: 'maximum',
      emotional_intensity_contains: 'spike',
    },
  },
  {
    id: 'SIG-04',
    description: 'VAR disallowed goal 87th minute -- spike intensity',
    matchState: {
      homeTeam: 'Brazil',
      awayTeam: 'Germany',
      homeScore: 2,
      awayScore: 2,
      minute: 87,
      stage: 'Quarter-finals',
    },
    events: [
      {
        time: { elapsed: 87 },
        type: 'VAR',
        detail: 'Goal disallowed - Offside',
        team: { name: 'Brazil' },
        player: { name: 'Vinicius Jr' },
      },
    ],
    stats: { possession: { home: 55, away: 45 } },
    expected: {
      emotional_intensity_contains: 'spike',
      pressure: 'critical',
    },
  },
  {
    id: 'SIG-05',
    description: 'Early group stage, 0-0 -- low pressure and neutral momentum',
    matchState: {
      homeTeam: 'Spain',
      awayTeam: 'Portugal',
      homeScore: 0,
      awayScore: 0,
      minute: 15,
      stage: 'Group Stage',
    },
    events: [],
    stats: { possession: { home: 50, away: 50 } },
    expected: {
      pressure: 'low',
    },
  },
  {
    id: 'SIG-06',
    description: 'Final, tied at 90 minutes -- maximum stakes',
    matchState: {
      homeTeam: 'Argentina',
      awayTeam: 'France',
      homeScore: 2,
      awayScore: 2,
      minute: 90,
      stage: 'Final',
      isExtraTime: false,
    },
    events: [],
    stats: {},
    expected: {
      stakes_contains: 'maximum',
      pressure: 'critical',
    },
  },
  {
    id: 'SIG-07',
    description: 'Team winning 3-0, late group stage -- low pressure',
    matchState: {
      homeTeam: 'Brazil',
      awayTeam: 'Canada',
      homeScore: 3,
      awayScore: 0,
      minute: 80,
      stage: 'Group Stage',
    },
    events: [],
    stats: { possession: { home: 70, away: 30 } },
    expected: {
      pressure: 'low',
    },
  },
  {
    id: 'SIG-08',
    description: 'Last minute knockout, losing by 1 -- critical pressure',
    matchState: {
      homeTeam: 'USA',
      awayTeam: 'Netherlands',
      homeScore: 0,
      awayScore: 1,
      minute: 88,
      stage: 'Round of 16',
    },
    events: [],
    stats: {},
    expected: {
      pressure: 'critical',
      stakes_contains: 'high',
    },
  },
  {
    id: 'SIG-09',
    description: 'Red card in extra time of knockout -- spike intensity',
    matchState: {
      homeTeam: 'Mexico',
      awayTeam: 'Argentina',
      homeScore: 1,
      awayScore: 1,
      minute: 105,
      stage: 'Round of 16',
      isExtraTime: true,
    },
    events: [
      {
        time: { elapsed: 104 },
        type: 'Red Card',
        team: { name: 'Mexico' },
        player: { name: 'Ochoa' },
      },
    ],
    stats: {},
    expected: {
      pressure: 'critical',
      emotional_intensity_contains: 'spike',
    },
  },
  {
    id: 'SIG-10',
    description: 'Goal scored in 80th minute of group stage, 1-0',
    matchState: {
      homeTeam: 'England',
      awayTeam: 'Iran',
      homeScore: 1,
      awayScore: 0,
      minute: 80,
      stage: 'Group Stage',
    },
    events: [
      {
        time: { elapsed: 80 },
        type: 'Goal',
        team: { name: 'England' },
        player: { name: 'Bellingham' },
      },
    ],
    stats: { possession: { home: 60, away: 40 } },
    expected: {
      momentum_contains: 'England',
    },
  },
];

function runSignalEval() {
  console.log('\n' + '='.repeat(60));
  console.log('SIGNAL ACCURACY EVAL -- Dataset 2b');
  console.log(`${SIGNAL_TEST_CASES.length} test cases`);
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;
  const failures = [];

  SIGNAL_TEST_CASES.forEach(tc => {
    const signals = buildDerivedSignals(
      tc.matchState,
      tc.events || [],
      tc.stats || {}
    );

    const checks = [];
    let allPass = true;

    const exp = tc.expected;

    if (exp.pressure) {
      const pass = signals.pressure === exp.pressure;
      checks.push({
        field: 'pressure',
        expected: exp.pressure,
        actual: signals.pressure,
        pass,
      });
      if (!pass) allPass = false;
    }

    if (exp.emotional_intensity_contains) {
      const pass = signals.emotional_intensity
        .toLowerCase()
        .includes(exp.emotional_intensity_contains);
      checks.push({
        field: 'emotional_intensity',
        expected: `contains "${exp.emotional_intensity_contains}"`,
        actual: signals.emotional_intensity,
        pass,
      });
      if (!pass) allPass = false;
    }

    if (exp.stakes_contains) {
      const pass = signals.stakes
        .toLowerCase()
        .includes(exp.stakes_contains);
      checks.push({
        field: 'stakes',
        expected: `contains "${exp.stakes_contains}"`,
        actual: signals.stakes,
        pass,
      });
      if (!pass) allPass = false;
    }

    if (exp.momentum_contains) {
      const pass = signals.momentum
        .toLowerCase()
        .includes(exp.momentum_contains.toLowerCase());
      checks.push({
        field: 'momentum',
        expected: `contains "${exp.momentum_contains}"`,
        actual: signals.momentum,
        pass,
      });
      if (!pass) allPass = false;
    }

    const icon = allPass ? '[PASS]' : '[FAIL]';
    console.log(`\n${icon} ${tc.id}: ${tc.description}`);

    checks.forEach(c => {
      const ci = c.pass ? '  ok' : '  FAIL';
      console.log(
        `${ci} ${c.field}: expected ${c.expected}, got "${c.actual}"`
      );
    });

    if (allPass) {
      passed++;
    } else {
      failed++;
      failures.push({
        id: tc.id,
        description: tc.description,
        checks: checks.filter(c => !c.pass),
      });
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(
    `Signal Accuracy: ${passed}/${SIGNAL_TEST_CASES.length} passed ` +
    `(${Math.round(passed / SIGNAL_TEST_CASES.length * 100)}%)`
  );

  const threshold = 0.9;
  const passRate = passed / SIGNAL_TEST_CASES.length;

  if (passRate >= threshold) {
    console.log(`SIGNAL GATE PASSED (>=90% required)`);
  } else {
    console.log(
      `SIGNAL GATE FAILED -- ` +
      `${Math.round(passRate * 100)}% (90% required)`
    );
    console.log('\nFailures to fix:');
    failures.forEach(f => {
      console.log(`  ${f.id}: ${f.description}`);
      f.checks.forEach(c => {
        console.log(
          `    ${c.field}: expected ${c.expected}, got "${c.actual}"`
        );
      });
    });
  }
  console.log('='.repeat(60) + '\n');

  return { passed, failed, passRate };
}

runSignalEval();
