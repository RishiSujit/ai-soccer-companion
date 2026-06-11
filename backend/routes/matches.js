const express = require('express');
const router = express.Router();
const {
  getLiveMatches,
  getTodayFixtures,
  getUpcomingFixtures,
  getMatchEvents,
  getMatchLineups,
} = require('../lib/livescoreApi');

// GET /api/matches/live
// Returns live matches + today's fixtures if nothing live
router.get('/live', async (req, res) => {
  try {
    let matches = await getLiveMatches();
    console.log('[Matches] Live:', matches.length);

    if (matches.length === 0) {
      matches = await getTodayFixtures();
      console.log('[Matches] Today fallback:', matches.length);
    }

    res.json({ matches });
  } catch (err) {
    console.error('/live error:', err.message);
    res.json({ matches: [] });
  }
});

// GET /api/matches/upcoming
// Returns upcoming fixtures for the next 7 days
router.get('/upcoming', async (req, res) => {
  try {
    const matches = await getUpcomingFixtures();
    console.log('[Matches] Upcoming:', matches.length);
    res.json({ matches });
  } catch (err) {
    console.error('/upcoming error:', err.message);
    res.json({ matches: [] });
  }
});

// GET /api/matches/today
// Returns today's fixtures only
router.get('/today', async (req, res) => {
  try {
    const matches = await getTodayFixtures();
    res.json({ matches });
  } catch (err) {
    console.error('/today error:', err.message);
    res.json({ matches: [] });
  }
});

// GET /api/matches/events/:matchId
router.get('/events/:matchId', async (req, res) => {
  try {
    const events = await getMatchEvents(req.params.matchId);
    res.json({ events });
  } catch (err) {
    console.error('/events error:', err.message);
    res.json({ events: [] });
  }
});

// GET /api/matches/lineups/:matchId
router.get('/lineups/:matchId', async (req, res) => {
  try {
    const lineups = await getMatchLineups(req.params.matchId);
    res.json({ lineups: lineups || null });
  } catch (err) {
    console.error('/lineups error:', err.message);
    res.json({ lineups: null });
  }
});

module.exports = router;
