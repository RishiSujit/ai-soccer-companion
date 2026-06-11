const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { getFixturesForDate } = require('../lib/livescoreApi');

async function fetchTomorrowsFixtures() {
  try {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const fixtures = await getFixturesForDate(tomorrow);
    console.log(`Tomorrow's fixtures: ${fixtures.length}`);
    return fixtures;
  } catch (err) {
    console.error('Fetch fixtures error:', err.message);
    return [];
  }
}

async function fetchTodaysFixtures() {
  try {
    const today = new Date().toISOString().split('T')[0];
    return await getFixturesForDate(today);
  } catch (err) {
    console.error('Fetch today fixtures error:', err.message);
    return [];
  }
}

async function generateDailyCard(fixtures, targetDate) {
  if (!fixtures || fixtures.length === 0) {
    console.log('No fixtures — skipping card');
    return null;
  }

  const { data: existing } = await supabase
    .from('daily_prediction_cards')
    .select('id')
    .eq('date', targetDate)
    .single();

  if (existing) {
    console.log(`Card already exists for ${targetDate}`);
    return existing;
  }

  const matchSummary = fixtures.map(f => ({
    homeTeam: f.homeTeam || f.home_name,
    awayTeam: f.awayTeam || f.away_name,
    kickoff: f.kickoff || f.date,
    stage: f.stage || 'Group Stage',
    fixtureId: f.id,
  }));

  const prompt = `You are generating a daily prediction card for World Cup 2026 fans.

Today's matches:
${matchSummary.map((m, i) => `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.stage})`).join('\n')}

Generate a daily prediction card with EXACTLY this structure. All questions must reference the actual teams listed above.

Rules:
- daily_questions: exactly 3 questions that span multiple matches
- feature_match: pick the most compelling match based on teams/stage. For knockout stages always pick the knockout match. For group stage pick the highest profile teams or biggest rivalry.
- feature_match.props: exactly 3 props specific to that match
- bonus: combine 2 interesting outcomes from today into one high-stakes parlay. Must be achievable but not guaranteed. No "all matches end 0-0" type bonuses.
- points must match exactly: Yes/No questions: 2 pts, 3-4 option questions: 3 pts, Bonus: always 10 pts

Return ONLY this JSON, no preamble:
{
  "daily_questions": [
    {
      "id": "dq1",
      "question": "Will there be a red card in any match today?",
      "options": ["Yes", "No"],
      "points": 2,
      "type": "yes_no"
    },
    {
      "id": "dq2",
      "question": "How many total goals across all matches today?",
      "options": ["0-3", "4-6", "7-9", "10+"],
      "points": 3,
      "type": "multi"
    },
    {
      "id": "dq3",
      "question": "Which match will have the most goals?",
      "options": [${matchSummary.map(m => `"${m.homeTeam} vs ${m.awayTeam}"`).join(', ')}],
      "points": 3,
      "type": "multi"
    }
  ],
  "feature_match": {
    "homeTeam": "<team name>",
    "awayTeam": "<team name>",
    "stage": "<stage>",
    "reason": "<1 sentence why this is the feature match>",
    "props": [
      {
        "id": "fm1",
        "question": "Match result?",
        "options": ["<homeTeam> win", "Draw", "<awayTeam> win"],
        "points": 3,
        "type": "multi"
      },
      {
        "id": "fm2",
        "question": "<player specific prop based on a star player>",
        "options": ["Yes", "No"],
        "points": 2,
        "type": "yes_no"
      },
      {
        "id": "fm3",
        "question": "Total goals in this match?",
        "options": ["0-1", "2-3", "4+"],
        "points": 2,
        "type": "multi"
      }
    ]
  },
  "bonus": {
    "id": "bonus1",
    "question": "<compelling parlay combining 2 outcomes from today>",
    "points": 10,
    "type": "bonus",
    "components": ["<outcome 1>", "<outcome 2>"]
  }
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const card = JSON.parse(text);

    const { data, error } = await supabase
      .from('daily_prediction_cards')
      .insert({
        date: targetDate,
        matches: matchSummary,
        daily_questions: card.daily_questions,
        feature_match: card.feature_match,
        bonus: card.bonus,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Daily card generated for ${targetDate}`);
    console.log(`Feature match: ${card.feature_match.homeTeam} vs ${card.feature_match.awayTeam}`);
    return data;
  } catch (err) {
    console.error('Generate card error:', err.message);
    return null;
  }
}

async function generateDailyCards() {
  console.log('\n=== DAILY CARD GENERATION ===');
  console.log(new Date().toISOString());

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayFixtures = await fetchTodaysFixtures();
  if (todayFixtures.length > 0) {
    await generateDailyCard(todayFixtures, today);
  }

  const tomorrowFixtures = await fetchTomorrowsFixtures();
  if (tomorrowFixtures.length > 0) {
    await generateDailyCard(tomorrowFixtures, tomorrow);
  }

  console.log('=== DONE ===\n');
}

module.exports = { generateDailyCards };
