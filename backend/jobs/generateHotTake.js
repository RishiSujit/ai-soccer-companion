const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateDailyHotTake(matchContext = null) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('hot_takes')
    .select('*')
    .eq('date', today)
    .single();

  if (existing) return existing;

  const contextLine = matchContext
    ? `Today's most controversial moment: ${matchContext}`
    : `Generate a pre-tournament debate question about World Cup 2026 — teams, players, predictions, or controversies.`;

  const prompt = `${contextLine}

Generate a debate question for casual American sports fans watching World Cup 2026.

Rules:
- One punchy sentence, max 15 words
- Should spark genuine debate
- Yes/No format works best
- Make it accessible to non-soccer fans
- Reference real players or teams if relevant

Respond with ONLY a JSON object:
{
  "question": "Your debate question here?",
  "yes_label": "Short yes label (max 20 chars)",
  "no_label": "Short no label (max 20 chars)"
}
No preamble, no markdown, just the JSON.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  const hotTake = JSON.parse(text);

  const { data } = await supabase
    .from('hot_takes')
    .upsert({
      question: hotTake.question,
      date: today,
      yes_label: hotTake.yes_label,
      no_label: hotTake.no_label,
      yes_votes: 0,
      no_votes: 0,
      match_id: matchContext?.matchId || null,
    })
    .select()
    .single();

  return data;
}

module.exports = { generateDailyHotTake };
