const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const KNOCKOUT_ROUNDS = [
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  'Final',
];

async function updateBracket() {
  try {
    for (const round of KNOCKOUT_ROUNDS) {
      const res = await axios.get(
        'https://v3.football.api-sports.io/fixtures',
        {
          params: { league: 1, season: 2026, round },
          headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
        }
      );

      const fixtures = res.data.response || [];

      for (const fixture of fixtures) {
        await supabase
          .from('bracket_rounds')
          .upsert({
            round,
            match_id: String(fixture.fixture.id),
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            match_date: fixture.fixture.date,
            venue: fixture.fixture.venue?.name,
            status: fixture.fixture.status.short,
          }, { onConflict: 'round,home_team,away_team' });
      }
    }
    console.log('Bracket updated successfully');
  } catch (err) {
    console.error('Bracket update failed:', err);
  }
}

module.exports = { updateBracket };
