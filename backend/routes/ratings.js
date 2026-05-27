'use strict';

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/ratings/summary
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('response_ratings')
      .select('rating');

    if (error) throw error;

    const total = data.length;
    const up = data.filter(r => r.rating === 'up').length;
    const down = data.filter(r => r.rating === 'down').length;

    res.json({
      total,
      up,
      down,
      thumbs_up_rate: total > 0 ? Math.round((up / total) * 100) : 0,
      thumbs_down_rate: total > 0 ? Math.round((down / total) * 100) : 0,
    });
  } catch (err) {
    console.error('Ratings summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ratings/low — most recent downvoted responses for quality review
router.get('/low', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('response_ratings')
      .select('*')
      .eq('rating', 'down')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ responses: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
