const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/predictions/options/:matchId
router.get('/options/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError) {
      console.error('Match fetch error:', matchError);
      return res.status(404).json({ error: 'Match not found' });
    }

    const { data: props, error: propsError } = await supabase
      .from('match_props')
      .select('*')
      .eq('match_id', matchId);

    if (propsError) {
      console.error('Props fetch error:', propsError);
      return res.status(500).json({ error: 'Failed to fetch match props' });
    }

    res.json({ match, props: props ?? [] });
  } catch (error) {
    console.error('Predictions options error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/predictions/submit
router.post('/submit', async (req, res) => {
  try {
    const { userId, matchId, resultPrediction, propPredictions } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }

    // Fetch the match to validate kickoff_time
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('kickoff_time, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('Match fetch error:', matchError);
      return res.status(404).json({ error: 'Match not found' });
    }

    // Reject submissions after kickoff
    if (new Date() >= new Date(match.kickoff_time)) {
      return res.status(400).json({
        success: false,
        message: 'Predictions are locked — this match has already kicked off.',
      });
    }

    // Upsert — allows updating prediction before kickoff, enforces unique(user_id, match_id)
    const { error: upsertError } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: userId,
          match_id: matchId,
          result_prediction: resultPrediction ?? null,
          prop_predictions: propPredictions ?? null,
          locked_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_id' }
      );

    if (upsertError) {
      console.error('Prediction upsert error:', upsertError);
      return res.status(500).json({ error: 'Failed to save prediction' });
    }

    res.json({ success: true, message: 'Prediction saved!' });
  } catch (error) {
    console.error('Prediction submit error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
