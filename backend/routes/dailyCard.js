const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { generateDailyCards } = require('../jobs/generateDailyCard');
const { getUpcomingFixtures } = require('../lib/livescoreApi');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/daily-card/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let { data: card } = await supabase
      .from('daily_prediction_cards')
      .select('*')
      .eq('date', today)
      .single();

    if (!card) {
      console.log('[DailyCard] No card for today — generating...');
      await generateDailyCards();

      const { data: newCard } = await supabase
        .from('daily_prediction_cards')
        .select('*')
        .eq('date', today)
        .single();

      card = newCard;
    }

    if (!card) {
      return res.json({ card: await getPreTournamentCard(today), fromFallback: true });
    }

    res.json({ card, fromFallback: false });
  } catch (err) {
    console.error('Daily card error:', err.message);
    const today = new Date().toISOString().split('T')[0];
    res.json({ card: await getPreTournamentCard(today), fromFallback: true });
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

// Fallback: pull the nearest upcoming fixture from live API to show as preview
async function getPreTournamentCard(date) {
  try {
    // Check DB for a future card first
    const { data: futureCard } = await supabase
      .from('daily_prediction_cards')
      .select('*')
      .gte('date', date)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (futureCard) {
      return { ...futureCard, _isPreview: true, _previewFor: futureCard.date };
    }

    // Otherwise build a minimal card from the next upcoming fixture
    const fixtures = await getUpcomingFixtures(7);
    if (!fixtures.length) return null;

    const f = fixtures[0];
    return {
      date,
      matches: [{ homeTeam: f.homeTeam, awayTeam: f.awayTeam, kickoff: f.kickoff, kickoffET: f.kickoffET, venue: f.venue, stage: f.stage }],
      daily_questions: [],
      feature_match: { homeTeam: f.homeTeam, awayTeam: f.awayTeam, stage: f.stage, venue: f.venue, props: [] },
      bonus: null,
      _isPreview: true,
      _previewFor: f.date,
    };
  } catch (err) {
    console.error('getPreTournamentCard error:', err.message);
    return null;
  }
}

module.exports = router;
