/**
 * Test script: score today's predictions using livescore-api results.
 * Run: node backend/scripts/test-scoring.js [YYYY-MM-DD]
 */

require('dotenv').config();
const { scoreDate, buildActualResults } = require('../lib/scoringEngine');
const { getFinishedMatches } = require('../lib/livescoreApi');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const date = process.argv[2] || new Date().toISOString().split('T')[0];

async function previewResults() {
  console.log('\n=== LIVESCORE-API RESULTS PREVIEW ===');
  console.log('Date:', date);

  const fixtures = await getFinishedMatches(date);
  console.log(`\nFinished fixtures: ${fixtures.length}`);

  fixtures.forEach(m => {
    const h = parseInt(m.score) || 0;
    const a = parseInt(m.away_score) || 0;
    console.log(`  ${m.home_name} ${h} - ${a} ${m.away_name} [${m.time}]`);
  });

  const { data: card } = await supabase
    .from('daily_prediction_cards')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (fixtures.length && card) {
    const results = buildActualResults(fixtures, card);
    console.log('\nDerived results:');
    console.log(`  Total goals: ${results.totalGoals}`);
    console.log(`  Most goals match: ${results.mostGoalsMatch || 'N/A'}`);
    console.log(`  Red card: ${results.hasRedCard}`);
    console.log(`  Feature result: ${results.featureResult || 'N/A'}`);
    console.log(`  Feature goals: ${results.featureGoals ?? 'N/A'}`);
  }

  return fixtures.length;
}

async function main() {
  console.log('\n=== PREDICTION SCORING TEST ===');

  let fixtureCount = 0;
  try {
    fixtureCount = await previewResults();
  } catch (err) {
    console.error('Livescore-api fetch failed:', err.message);
    console.log('Continuing to score with whatever is in DB...');
  }

  if (fixtureCount === 0) {
    console.log('\nNo finished fixtures found for', date);
    console.log('Either matches are still in progress or date is wrong.');
    console.log('Usage: node backend/scripts/test-scoring.js 2026-06-11');
    process.exit(0);
  }

  console.log('\n=== RUNNING SCORER ===');
  const result = await scoreDate(date);

  console.log('\n=== RESULT ===');
  if (result.skipped) {
    console.log('Skipped:', result.skipped);
  } else {
    console.log(`Scored ${result.scored} predictions`);
  }

  console.log('\n=== LEADERBOARD SNAPSHOT ===');
  const { data: leaderboard } = await supabase
    .from('group_members')
    .select('user_id, display_name, total_points, group_id')
    .order('total_points', { ascending: false })
    .limit(20);

  if (leaderboard?.length) {
    leaderboard.forEach((row, i) => {
      const name = row.display_name || row.user_id.slice(0, 8) + '...';
      console.log(`  ${i + 1}. ${name} — ${row.total_points} pts`);
    });
  } else {
    console.log('  No group members found');
  }

  console.log('\n=== DONE ===\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
