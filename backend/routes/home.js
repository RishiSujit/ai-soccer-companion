const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { generateDailyHotTake } = require('../jobs/generateHotTake');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

module.exports = router;
