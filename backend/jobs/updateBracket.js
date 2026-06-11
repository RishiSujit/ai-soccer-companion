const { createClient } = require('@supabase/supabase-js');
const { getFixturesInRange } = require('../lib/livescoreApi');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Knockout stage runs June 27 – July 19, 2026
const KNOCKOUT_DATE_FROM = '2026-06-27';
const KNOCKOUT_DATE_TO   = '2026-07-19';

function inferRound(date) {
  if (date <= '2026-06-30') return 'Round of 32';
  if (date <= '2026-07-03') return 'Round of 16';
  if (date <= '2026-07-06') return 'Quarter-finals';
  if (date <= '2026-07-13') return 'Semi-finals';
  return 'Final';
}

async function updateBracket() {
  try {
    const fixtures = await getFixturesInRange(KNOCKOUT_DATE_FROM, KNOCKOUT_DATE_TO);

    for (const fixture of fixtures) {
      const round = inferRound(fixture.date);
      await supabase
        .from('bracket_rounds')
        .upsert({
          round,
          match_id: fixture.id,
          home_team: fixture.homeTeam,
          away_team: fixture.awayTeam,
          home_score: null,
          away_score: null,
          match_date: fixture.kickoff,
          venue: fixture.venue || null,
          status: 'NS',
        }, { onConflict: 'round,home_team,away_team' });
    }
    console.log(`Bracket updated: ${fixtures.length} fixtures`);
  } catch (err) {
    console.error('Bracket update failed:', err);
  }
}

module.exports = { updateBracket };
