const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/predictions/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        match_props (
          id,
          question,
          options,
          prop_type
        )
      `)
      .gte('kickoff_time', now)
      .eq('status', 'scheduled')
      .order('kickoff_time', { ascending: true })
      .limit(10);

    if (error) throw error;

    if (!matches || matches.length === 0) {
      return res.json({ matches: getFallbackMatches(), fromFallback: true });
    }

    res.json({ matches, fromFallback: false });
  } catch (err) {
    console.error('Upcoming predictions error:', err.message);
    res.json({ matches: getFallbackMatches(), fromFallback: true });
  }
});

// POST /api/predictions/submit
router.post('/submit', async (req, res) => {
  try {
    const { userId, matchId, resultPrediction, propPredictions } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('kickoff_time')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (new Date() >= new Date(match.kickoff_time)) {
      return res.status(400).json({ error: 'Predictions locked — match has started' });
    }

    const { data, error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId,
        match_id: matchId,
        result_prediction: resultPrediction,
        prop_predictions: propPredictions || {},
        locked_at: new Date().toISOString(),
      }, { onConflict: 'user_id,match_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, prediction: data });
  } catch (err) {
    console.error('Submit prediction error:', err.message);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

// GET /api/predictions/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ predictions: data || [] });
  } catch (err) {
    res.json({ predictions: [] });
  }
});

function getFallbackMatches() {
  return [
    {
      id: 'fallback-1',
      home_team: 'Argentina',
      away_team: 'France',
      kickoff_time: '2026-06-14T19:00:00.000Z',
      stage: 'group',
      status: 'scheduled',
      match_props: [
        {
          id: 'fp-1',
          question: 'Will Messi score?',
          options: ['Yes', 'No'],
          prop_type: 'player_performance',
        },
        {
          id: 'fp-2',
          question: 'Will there be a red card?',
          options: ['Yes', 'No'],
          prop_type: 'match_events',
        },
        {
          id: 'fp-3',
          question: 'Total goals in the match?',
          options: ['0-1', '2-3', '4+'],
          prop_type: 'match_events',
        },
      ],
    },
    {
      id: 'fallback-2',
      home_team: 'USA',
      away_team: 'Mexico',
      kickoff_time: '2026-06-22T00:00:00.000Z',
      stage: 'group',
      status: 'scheduled',
      match_props: [
        {
          id: 'fp-4',
          question: 'Will Pulisic score?',
          options: ['Yes', 'No'],
          prop_type: 'player_performance',
        },
        {
          id: 'fp-5',
          question: 'Will there be a red card?',
          options: ['Yes', 'No'],
          prop_type: 'match_events',
        },
        {
          id: 'fp-6',
          question: 'First half goals?',
          options: ['0', '1', '2+'],
          prop_type: 'match_events',
        },
      ],
    },
  ];
}

module.exports = router;
