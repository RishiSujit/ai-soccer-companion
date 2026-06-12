const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { generateDailyCards } = require('../jobs/generateDailyCard');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/daily-card/today
// Serves the card from DB only — generated once at midnight by the scheduled job.
// Never triggers generation on-demand to prevent questions changing mid-day.
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: card } = await supabase
      .from('daily_prediction_cards')
      .select('*')
      .eq('date', today)
      .single();

    if (!card) {
      console.log('[DailyCard] No card for today yet');
      return res.json({ card: null, fromFallback: false });
    }

    res.json({ card, fromFallback: false });
  } catch (err) {
    console.error('Daily card error:', err.message);
    res.json({ card: null, fromFallback: false });
  }
});

// POST /api/daily-card/submit
router.post('/submit', async (req, res) => {
  try {
    const { userId, answers, bonusTaken } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check kickoff from DB card
    const { data: dbCard } = await supabase
      .from('daily_prediction_cards')
      .select('matches')
      .eq('date', today)
      .single();

    if (dbCard?.matches?.length > 0) {
      const firstKickoff = dbCard.matches
        .map(m => new Date(m.kickoff))
        .sort((a, b) => a - b)[0];
      if (firstKickoff && new Date() >= firstKickoff) {
        return res.status(400).json({ error: 'Card locked — first match has started' });
      }
    }

    const { data, error } = await supabase
      .from('daily_predictions')
      .upsert({
        user_id: userId,
        date: today,
        answers: answers || {},
        bonus_taken: bonusTaken || false,
        locked_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, prediction: data });
  } catch (err) {
    console.error('Submit card error:', err.message);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

// POST /api/daily-card/save-progress
router.post('/save-progress', async (req, res) => {
  try {
    const { userId, answers, bonusTaken } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('daily_predictions')
      .select('id, locked_at')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('daily_predictions')
        .update({ answers: answers || {}, bonus_taken: bonusTaken || false })
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabase
        .from('daily_predictions')
        .insert({ user_id: userId, date: today, answers: answers || {}, bonus_taken: bonusTaken || false });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Save progress error:', err.message);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// POST /api/daily-card/unlock
router.post('/unlock', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const today = new Date().toISOString().split('T')[0];

    const { data: dbCard } = await supabase
      .from('daily_prediction_cards')
      .select('matches')
      .eq('date', today)
      .single();

    if (dbCard?.matches?.length > 0) {
      const firstKickoff = dbCard.matches
        .map(m => new Date(m.kickoff))
        .sort((a, b) => a - b)[0];
      if (firstKickoff && new Date() >= firstKickoff) {
        return res.status(400).json({ error: 'Cannot unlock — first match has started' });
      }
    }

    const { error } = await supabase
      .from('daily_predictions')
      .update({ locked_at: null })
      .eq('user_id', userId)
      .eq('date', today);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Unlock error:', err.message);
    res.status(500).json({ error: 'Failed to unlock' });
  }
});

// GET /api/daily-card/my-prediction
router.get('/my-prediction', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ prediction: null });

    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    res.json({ prediction: data || null });
  } catch (err) {
    res.json({ prediction: null });
  }
});

// POST /api/daily-card/admin/regenerate
// Deletes the existing card for a date and regenerates from the fixture API.
// Body: { date: "YYYY-MM-DD", secret: "..." }  — date defaults to today
router.post('/admin/regenerate', async (req, res) => {
  const { date, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const { error: delErr } = await supabase
      .from('daily_prediction_cards')
      .delete()
      .eq('date', targetDate);
    if (delErr) throw delErr;

    console.log(`[DailyCard] Admin deleted card for ${targetDate}, regenerating...`);
    await generateDailyCards();

    const { data: newCard } = await supabase
      .from('daily_prediction_cards')
      .select('date, feature_match, matches')
      .eq('date', targetDate)
      .single();

    if (!newCard) {
      return res.json({ success: false, message: `No fixtures found for ${targetDate}` });
    }

    res.json({
      success: true,
      date: newCard.date,
      matchCount: newCard.matches?.length || 0,
      featureMatch: `${newCard.feature_match?.homeTeam} vs ${newCard.feature_match?.awayTeam}`,
    });
  } catch (err) {
    console.error('[DailyCard] Regenerate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
