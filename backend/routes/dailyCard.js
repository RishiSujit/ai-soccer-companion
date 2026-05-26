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
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

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
      return res.json({ card: getFallbackCard(today), fromFallback: true });
    }

    res.json({ card, fromFallback: false });
  } catch (err) {
    console.error('Daily card error:', err.message);
    const today = new Date().toISOString().split('T')[0];
    res.json({ card: getFallbackCard(today), fromFallback: true });
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

    const { data: card } = await supabase
      .from('daily_prediction_cards')
      .select('matches')
      .eq('date', today)
      .single();

    if (card?.matches?.length > 0) {
      const firstKickoff = card.matches
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

function getFallbackCard(date) {
  return {
    date,
    matches: [
      {
        homeTeam: 'Argentina',
        awayTeam: 'France',
        stage: 'Group B',
        kickoff: '2026-06-14T19:00:00Z',
      },
      {
        homeTeam: 'USA',
        awayTeam: 'Mexico',
        stage: 'Group D',
        kickoff: '2026-06-22T00:00:00Z',
      },
      {
        homeTeam: 'Brazil',
        awayTeam: 'Germany',
        stage: 'Group A',
        kickoff: '2026-06-15T21:00:00Z',
      },
    ],
    daily_questions: [
      {
        id: 'dq1',
        question: 'Will there be a red card in any match today?',
        options: ['Yes', 'No'],
        points: 2,
        type: 'yes_no',
      },
      {
        id: 'dq2',
        question: 'How many total goals across all matches today?',
        options: ['0-3', '4-6', '7-9', '10+'],
        points: 3,
        type: 'multi',
      },
      {
        id: 'dq3',
        question: 'Which match will have the most goals?',
        options: ['Argentina vs France', 'USA vs Mexico', 'Brazil vs Germany'],
        points: 3,
        type: 'multi',
      },
    ],
    feature_match: {
      homeTeam: 'Argentina',
      awayTeam: 'France',
      stage: 'Group B',
      reason: 'Defending champions vs tournament favorites — highest stakes match of the group stage',
      props: [
        {
          id: 'fm1',
          question: 'Match result?',
          options: ['Argentina win', 'Draw', 'France win'],
          points: 3,
          type: 'multi',
        },
        {
          id: 'fm2',
          question: 'Will Messi score?',
          options: ['Yes', 'No'],
          points: 2,
          type: 'yes_no',
        },
        {
          id: 'fm3',
          question: 'Total goals in this match?',
          options: ['0-1', '2-3', '4+'],
          points: 2,
          type: 'multi',
        },
      ],
    },
    bonus: {
      id: 'bonus1',
      question: 'Argentina win AND at least one goal in every match today',
      points: 10,
      type: 'bonus',
      components: [
        'Argentina beat France',
        'Every match has at least one goal',
      ],
    },
  };
}

module.exports = router;
