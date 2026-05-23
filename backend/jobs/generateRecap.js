const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateRecapForMatch(match, userSports = ['NFL', 'NBA']) {
  const { data: existing } = await supabase
    .from('match_recaps')
    .select('*')
    .eq('match_id', match.id)
    .single();

  if (existing) return existing;

  let eventsContext = '';
  try {
    const axios = require('axios');
    const eventsRes = await axios.get(
      'https://v3.football.api-sports.io/fixtures/events',
      {
        params: { fixture: match.id },
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
      }
    );
    const events = eventsRes.data.response;
    if (events?.length) {
      eventsContext = events
        .map(e => `${e.time.elapsed}' — ${e.type}: ${e.player?.name} (${e.team?.name})`)
        .join('\n');
    }
  } catch (err) {
    console.log('No events data, using score only');
  }

  const sportsLine = userSports.length
    ? `Use analogies from ${userSports.join(' and ')} specifically.`
    : 'Use American sports analogies.';

  const prompt = `You are writing a match recap for a casual American sports fan.

Match: ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}
Stage: ${match.stage}
${eventsContext ? `Match events:\n${eventsContext}` : 'No detailed events available.'}

${sportsLine}

Write EXACTLY 3 bullet points recapping this match. Each bullet is 1-2 sentences max.
Make them punchy and interesting for someone who didn't watch.
Bold the key fact in each bullet.

Respond with ONLY a JSON array:
[
  "**Key fact** — explanation with sports analogy",
  "**Key fact** — explanation with sports analogy",
  "**Key fact** — explanation with sports analogy"
]
No preamble, no markdown wrapper, just the array.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  const bullets = JSON.parse(text);

  const { data } = await supabase
    .from('match_recaps')
    .upsert({
      match_id: match.id,
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      home_score: match.homeScore,
      away_score: match.awayScore,
      match_date: match.date || new Date().toISOString(),
      bullets,
    })
    .select()
    .single();

  return data;
}

module.exports = { generateRecapForMatch };
