const express = require('express');
const router = express.Router();
const { fetchMatchOdds, fetchLiveWinProbability } = require('../lib/oddsService');

// GET /api/odds/match?home=USA&away=Mexico&date=2026-06-22
router.get('/match', async (req, res) => {
  try {
    const { home, away, date } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'home and away required' });
    const matchDate = date || new Date().toISOString().split('T')[0];
    const odds = await fetchMatchOdds(home, away, matchDate);
    res.json({ odds: odds || null });
  } catch (err) {
    console.error('[Odds route] match error:', err.message);
    res.json({ odds: null });
  }
});

// GET /api/odds/live?home=USA&away=Mexico&homeScore=1&awayScore=0&minute=67
router.get('/live', async (req, res) => {
  try {
    const { home, away, homeScore, awayScore, minute } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'home and away required' });
    const prob = await fetchLiveWinProbability(
      home, away,
      parseInt(homeScore) || 0,
      parseInt(awayScore) || 0,
      parseInt(minute) || 45
    );
    res.json({ probability: prob || null });
  } catch (err) {
    console.error('[Odds route] live error:', err.message);
    res.json({ probability: null });
  }
});

module.exports = router;
