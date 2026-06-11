const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Knockout stage runs June 27 – July 19, 2026
const KNOCKOUT_DATE_FROM = '2026-06-27';
const KNOCKOUT_DATE_TO   = '2026-07-19';

// Map approximate fixture counts to round names
function inferRound(date) {
  if (date <= '2026-06-30') return 'Round of 32';
  if (date <= '2026-07-03') return 'Round of 16';
  if (date <= '2026-07-06') return 'Quarter-finals';
  if (date <= '2026-07-13') return 'Semi-finals';
  return 'Final';
}

async function updateBracket() {
  try {
    const { getFixturesForDate } = require('../lib/livescoreApi');
    const axios = require('axios');
    const COMP = process.env.LIVESCORE_COMPETITION_ID || '362';

    const res = await axios.get(
      'https://livescore-api.com/api-client/fixtures/matches.json',
      {
        params: {
          key: process.env.LIVESCORE_API_KEY,
          secret: process.env.LIVESCORE_API_SECRET,
          competition_id: COMP,
          date_from: KNOCKOUT_DATE_FROM,
          date_to: KNOCKOUT_DATE_TO,
        },
        timeout: 8000,
      }
    );

    const fixtures = res.data?.data?.fixtures || [];

    for (const fixture of fixtures) {
      const round = inferRound(fixture.date);
      await supabase
        .from('bracket_rounds')
        .upsert({
          round,
          match_id: String(fixture.id),
          home_team: fixture.home_name,
          away_team: fixture.away_name,
          home_score: parseInt(fixture.score) || null,
          away_score: parseInt(fixture.away_score) || null,
          match_date: fixture.date + 'T' + (fixture.time || '00:00').slice(0, 5) + ':00Z',
          venue: fixture.location || null,
          status: fixture.status || 'NS',
        }, { onConflict: 'round,home_team,away_team' });
    }
    console.log(`Bracket updated: ${fixtures.length} fixtures`);
  } catch (err) {
    console.error('Bracket update failed:', err);
  }
}

module.exports = { updateBracket };
