const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LEAGUE_ID = parseInt(process.env.ACTIVE_LEAGUE_ID) || 1;
const SEASON = parseInt(process.env.ACTIVE_SEASON) || 2026;
const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

// ─────────────────────────────────────────
// Fetch upcoming fixtures for next 48 hours
// ─────────────────────────────────────────
async function fetchUpcomingFixtures() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0];

    const results = [];

    for (const date of [today, tomorrow]) {
      const res = await axios.get(`${BASE_URL}/fixtures`, {
        params: {
          league: LEAGUE_ID,
          season: SEASON,
          date,
        },
        headers: { 'x-apisports-key': API_KEY },
      });
      const fixtures = res.data.response || [];
      const upcoming = fixtures.filter(f => f.fixture.status.short === 'NS');
      results.push(...upcoming);
    }

    console.log(`Upcoming fixtures found: ${results.length}`);
    return results;
  } catch (err) {
    console.error('Fetch fixtures error:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────
// Generate props for one match via Claude
// ─────────────────────────────────────────
async function generatePropsForMatch(fixture) {
  const homeTeam = fixture.teams.home.name;
  const awayTeam = fixture.teams.away.name;
  const stage = fixture.league.round || 'Group Stage';
  const kickoff = fixture.fixture.date;

  const prompt = `You are generating prop bet questions for a World Cup prediction game for casual American sports fans.

Match: ${homeTeam} vs ${awayTeam}
Stage: ${stage}
Kickoff: ${kickoff}

Generate exactly 3 prop bet questions for this match. Make them:
- Simple enough for someone who doesn't know soccer
- Interesting and debatable
- Mix of match events and player props
- Written in plain English

Respond with ONLY a JSON array:
[
  {
    "question": "Will there be a red card?",
    "options": ["Yes", "No"],
    "prop_type": "match_events"
  },
  {
    "question": "Will ${homeTeam} score in the first half?",
    "options": ["Yes", "No"],
    "prop_type": "match_events"
  },
  {
    "question": "Total goals in the match?",
    "options": ["0-1", "2-3", "4+"],
    "prop_type": "match_events"
  }
]

Make the questions specific to these two teams. Reference key players by name if they are well known (Messi, Mbappe, Pulisic, etc).
No preamble, no markdown, just the array.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const props = JSON.parse(text);
    console.log(`Generated ${props.length} props for ${homeTeam} vs ${awayTeam}`);
    return props;
  } catch (err) {
    console.error('Generate props error:', err.message);
    return [
      {
        question: 'Will there be a red card?',
        options: ['Yes', 'No'],
        prop_type: 'match_events',
      },
      {
        question: `Will ${homeTeam} win?`,
        options: ['Yes', 'No'],
        prop_type: 'match_result',
      },
      {
        question: 'Total goals in the match?',
        options: ['0-1', '2-3', '4+'],
        prop_type: 'match_events',
      },
    ];
  }
}

// ─────────────────────────────────────────
// Save fixture + props to Supabase
// ─────────────────────────────────────────
async function saveMatchWithProps(fixture, props) {
  const fixtureId = String(fixture.fixture.id);
  const homeTeam = fixture.teams.home.name;
  const awayTeam = fixture.teams.away.name;
  const kickoff = fixture.fixture.date;
  const stage = fixture.league.round || 'Group Stage';

  try {
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .upsert({
        id: fixtureId,
        home_team: homeTeam,
        away_team: awayTeam,
        kickoff_time: kickoff,
        stage: normalizeStage(stage),
        status: 'scheduled',
      }, { onConflict: 'id' })
      .select()
      .single();

    if (matchError) {
      console.error('Match upsert error:', matchError);
      return false;
    }

    const { data: existingProps } = await supabase
      .from('match_props')
      .select('id')
      .eq('match_id', fixtureId)
      .limit(1);

    if (existingProps?.length > 0) {
      console.log(`Props already exist for ${homeTeam} vs ${awayTeam} — skipping`);
      return true;
    }

    const propsToInsert = props.map(p => ({
      match_id: fixtureId,
      prop_type: p.prop_type,
      question: p.question,
      options: p.options,
    }));

    const { error: propsError } = await supabase
      .from('match_props')
      .insert(propsToInsert);

    if (propsError) {
      console.error('Props insert error:', propsError);
      return false;
    }

    console.log(`Saved match + props: ${homeTeam} vs ${awayTeam}`);
    return true;
  } catch (err) {
    console.error('Save error:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// Normalize stage string for DB enum
// ─────────────────────────────────────────
function normalizeStage(stage) {
  const s = stage.toLowerCase();
  if (s.includes('final') && !s.includes('semi') && !s.includes('quarter')) return 'final';
  if (s.includes('semi')) return 'semifinal';
  if (s.includes('quarter')) return 'quarterfinal';
  if (s.includes('round of 16') || s.includes('round of sixteen')) return 'round_of_16';
  return 'group';
}

// ─────────────────────────────────────────
// Main export — run the full job
// ─────────────────────────────────────────
async function generatePropsForUpcoming() {
  console.log('\n=== PROP GENERATION JOB ===');
  console.log(new Date().toISOString());

  const fixtures = await fetchUpcomingFixtures();

  if (fixtures.length === 0) {
    console.log('No upcoming fixtures — skipping');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    try {
      const props = await generatePropsForMatch(fixture);
      const saved = await saveMatchWithProps(fixture, props);
      if (saved) success++;
      else failed++;
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('Fixture error:', err.message);
      failed++;
    }
  }

  console.log(`\nProp generation complete: ${success} saved, ${failed} failed`);
  console.log('===========================\n');
}

module.exports = { generatePropsForUpcoming };
