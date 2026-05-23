'use strict';

const { buildDerivedSignals } = require('../lib/matchSignals');

// Scenario 1: Late knockout, tied, VAR disallowed goal
const scenario1 = buildDerivedSignals(
  {
    homeTeam: 'Argentina',
    awayTeam: 'France',
    homeScore: 1,
    awayScore: 1,
    minute: 87,
    stage: 'Quarter-finals',
    isExtraTime: false,
  },
  [
    { time: { elapsed: 85 }, type: 'VAR', detail: 'Goal disallowed - Offside', team: { name: 'Argentina' }, player: { name: 'Messi' } },
    { time: { elapsed: 82 }, type: 'Shot', team: { name: 'Argentina' } },
    { time: { elapsed: 80 }, type: 'Corner', team: { name: 'Argentina' } },
  ],
  { possession: { home: 58, away: 42 } }
);

console.log('Scenario 1 — Late knockout, VAR disallowed goal:');
console.log(JSON.stringify(scenario1, null, 2));

// Scenario 2: Comfortable group stage lead
const scenario2 = buildDerivedSignals(
  {
    homeTeam: 'USA',
    awayTeam: 'Mexico',
    homeScore: 3,
    awayScore: 0,
    minute: 55,
    stage: 'Group Stage',
  },
  [],
  { possession: { home: 62, away: 38 } }
);

console.log('\nScenario 2 — Comfortable group stage lead:');
console.log(JSON.stringify(scenario2, null, 2));

// Scenario 3: Penalty shootout semifinal
const scenario3 = buildDerivedSignals(
  {
    homeTeam: 'England',
    awayTeam: 'France',
    homeScore: 1,
    awayScore: 1,
    minute: 120,
    stage: 'Semi-finals',
    isPenaltyShootout: true,
  },
  [],
  {}
);

console.log('\nScenario 3 — Penalty shootout semifinal:');
console.log(JSON.stringify(scenario3, null, 2));
