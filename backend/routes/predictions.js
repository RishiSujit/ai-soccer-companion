const express = require('express');
const router = express.Router();

router.get('/options', async (req, res) => {
  try {
    const { matchId } = req.query;
    // TODO: Phase 5 — fetch match props from Supabase
    res.json({ props: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { userId, matchId, resultPrediction, propPredictions } = req.body;
    // TODO: Phase 5 — validate kickoff_time, persist to Supabase
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
