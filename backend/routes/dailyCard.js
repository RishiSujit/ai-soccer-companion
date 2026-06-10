const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { generateDailyCards } = require('../jobs/generateDailyCard');
const { WC_PREDICTION_CARDS } = require('../lib/wcPredictionCards');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/daily-card/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Use static WC card for opening week — highest priority
    if (WC_PREDICTION_CARDS[today]) {
      console.log('[DailyCard] Using static WC card for:', today);
      return res.json({ card: WC_PREDICTION_CARDS[today], fromFallback: false, isWorldCup: true });
    }

    let { data: card } = await supabase
      .from('daily_prediction_cards')
      .select('*')
      .eq('date', today)
      .single();

    if (!card) {
      console.log('No card for today — generating...');
      await generateDailyCards();

      const { data: newCard } = await supabase
        .from('daily_prediction_cards')
        .select('*')
        .eq('date', today)
        .single();

      card = newCard;
    }

    if (!card) {
      return res.json({ card: getPreTournamentCard(today), fromFallback: true });
    }

    res.json({ card, fromFallback: false });
  } catch (err) {
    console.error('Daily card error:', err.message);
    const today = new Date().toISOString().split('T')[0];
    res.json({ card: getPreTournamentCard(today), fromFallback: true });
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

    // Check kickoff from static WC card first, then DB
    const wcCard = WC_PREDICTION_CARDS[today];
    const matchesForLockCheck = wcCard?.matches ?? null;

    if (!matchesForLockCheck) {
      const { data: dbCard } = await supabase
        .from('daily_prediction_cards')
        .select('matches')
        .eq('date', today)
        .single();
      if (dbCard?.matches?.length > 0) {
        const firstKickoff = dbCard.matches
          .map(m => new Date(m.kickoff))
          .sort((a, b) => a - b)[0];
        if (new Date() >= firstKickoff) {
          return res.status(400).json({ error: 'Card locked — first match has started' });
        }
      }
    } else if (matchesForLockCheck.length > 0) {
      const firstKickoff = matchesForLockCheck
        .map(m => new Date(m.kickoff))
        .sort((a, b) => a - b)[0];
      if (new Date() >= firstKickoff) {
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
// Upserts answers without locking — does NOT set or clear locked_at
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
// Clears locked_at only if kickoff has not passed
router.post('/unlock', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const today = new Date().toISOString().split('T')[0];

    const wcCard = WC_PREDICTION_CARDS[today];
    const matchesForCheck = wcCard?.matches ?? null;
    if (matchesForCheck?.length > 0) {
      const firstKickoff = matchesForCheck.map(m => new Date(m.kickoff)).sort((a, b) => a - b)[0];
      if (new Date() >= firstKickoff) {
        return res.status(400).json({ error: 'Cannot unlock — first match has started' });
      }
    } else {
      const { data: dbCard } = await supabase
        .from('daily_prediction_cards')
        .select('matches')
        .eq('date', today)
        .single();
      if (dbCard?.matches?.length > 0) {
        const firstKickoff = dbCard.matches.map(m => new Date(m.kickoff)).sort((a, b) => a - b)[0];
        if (new Date() >= firstKickoff) {
          return res.status(400).json({ error: 'Cannot unlock — first match has started' });
        }
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

// Pre-tournament fallback for dates with no AI-generated card.
// Shows the nearest upcoming WC match rather than fake data.
function getPreTournamentCard(date) {
  // Find the nearest static WC card to show as preview
  const wcDates = Object.keys(WC_PREDICTION_CARDS).sort();
  const nearest = wcDates.find(d => d >= date) || wcDates[0];
  const previewCard = WC_PREDICTION_CARDS[nearest];

  return {
    ...previewCard,
    date,
    _isPreview: true,
    _previewFor: nearest,
  };
}

module.exports = router;
