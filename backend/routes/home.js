const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const { generateDailyHotTake } = require('../jobs/generateHotTake');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/home/recap/:team
router.get('/recap/:team', async (req, res) => {
  try {
    const { team } = req.params;
    const { data } = await supabase
      .from('match_recaps')
      .select('*')
      .or(`home_team.eq.${team},away_team.eq.${team}`)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ recap: data || null });
  } catch (err) {
    res.json({ recap: null });
  }
});

// GET /api/home/hot-take
router.get('/hot-take', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let { data } = await supabase
      .from('hot_takes')
      .select('*')
      .eq('date', today)
      .single();

    if (!data) {
      data = await generateDailyHotTake();
    }

    res.json({ hotTake: data });
  } catch (err) {
    res.json({ hotTake: null });
  }
});

// POST /api/home/hot-take/:id/vote
router.post('/hot-take/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;

    const field = vote === 'yes' ? 'yes_votes' : 'no_votes';

    const { data: current } = await supabase
      .from('hot_takes')
      .select(field)
      .eq('id', id)
      .single();

    const { data } = await supabase
      .from('hot_takes')
      .update({ [field]: (current?.[field] || 0) + 1 })
      .eq('id', id)
      .select()
      .single();

    res.json({ hotTake: data });
  } catch (err) {
    res.status(500).json({ error: 'Vote failed' });
  }
});

// GET /api/home/bracket/:team
router.get('/bracket/:team', async (req, res) => {
  try {
    const { team } = req.params;
    const { data } = await supabase
      .from('bracket_rounds')
      .select('*')
      .or(`home_team.eq.${team},away_team.eq.${team}`)
      .order('match_date', { ascending: true });

    res.json({ bracket: data || [] });
  } catch (err) {
    res.json({ bracket: [] });
  }
});

// GET /api/home/team-headline?team=Argentina&userSports=NFL,NBA
router.get('/team-headline', async (req, res) => {
  try {
    const { team, userSports } = req.query;

    if (!team) return res.json({ headline: null });

    const sports = userSports ? userSports.split(',') : ['NFL', 'NBA'];

    const prompt = `Write a single compelling headline about ${team} at the 2026 World Cup for a casual American ${sports[0]} fan.

Under 20 words.
Make it feel like a sports headline.
Capture what makes ${team} interesting or what their storyline is.
No quotes, no punctuation at the end.
Plain text only.

Examples of good style:
"The defending champions looking to prove 2022 was no fluke"
"America's team on home soil for the first time in 32 years"
"The aging legend's last shot at glory"`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 60,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ headline: response.content[0].text.trim(), team });
  } catch (err) {
    console.error('Headline error:', err.message);
    res.json({
      headline: `Follow ${req.query.team || 'this team'}'s World Cup journey`,
      team: req.query.team,
    });
  }
});

module.exports = router;
