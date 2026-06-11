const express = require('express');
const router = express.Router();
const {
  getLiveMatches,
  getTodayFixtures,
  getUpcomingFixtures,
  getHistoryMatches,
  getMatchEvents,
  getMatchLineups,
  getLineupsByUrl,
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
    const { matchId } = req.params;
    const lineupsUrl = `https://livescore-api.com/api-client/matches/lineups.json?match_id=${matchId}`;
    const lineup = await getLineupsByUrl(lineupsUrl);
    res.json({ lineup: lineup || null });
  } catch (err) {
    console.error('/lineups error:', err.message);
    res.json({ lineup: null });
  }
});

// GET /api/matches/results
// Returns finished matches from the last 7 days
router.get('/results', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const matches = await getHistoryMatches(weekAgo, today);
    console.log('[Matches] Results:', matches.length);
    res.json({ matches });
  } catch (err) {
    console.error('/results error:', err);
    res.json({ matches: [] });
  }
});

module.exports = router;
