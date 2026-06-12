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

// Normalize team names to handle API inconsistencies between feeds
// e.g. 'Korea Republic' (live feed) vs 'South Korea' (fixtures feed)
function normTeam(name) {
  const MAP = {
    'korea republic': 'south korea',
    'united states': 'usa',
    "cote d'ivoire": 'ivory coast',
    'bosnia': 'bosnia and herzegovina',
    'bosnia & herzegovina': 'bosnia and herzegovina',
    'türkiye': 'turkey',
  };
  if (!name) return '';
  const lower = name.toLowerCase();
  return MAP[lower] || lower;
}

function pairKey(home, away) {
  return `${normTeam(home)}|${normTeam(away)}`;
}

// GET /api/matches/live
// Returns today's fixtures enriched with live scores where available.
// Also includes any matches that dropped off the fixtures feed after kickoff —
// the livescore API moves in-play games to the live feed only.
router.get('/live', async (req, res) => {
  try {
    const [liveMatches, todayFixtures] = await Promise.all([
      getLiveMatches(),
      getTodayFixtures(),
    ]);
    console.log('[Matches] Live feed:', liveMatches.length, '| Today fixtures:', todayFixtures.length);

    // Build lookup of in-play data by normalized team pair
    const liveByPair = {};
    for (const m of liveMatches) {
      liveByPair[pairKey(m.homeTeam, m.awayTeam)] = m;
    }

    // Start with fixtures as canonical list; overlay live scores where matched
    const coveredKeys = new Set();
    const matches = todayFixtures.map(f => {
      const key = pairKey(f.homeTeam, f.awayTeam);
      coveredKeys.add(key);
      const live = liveByPair[key];
      return live ? { ...f, ...live, kickoffET: f.kickoffET } : f;
    });

    // Add any live/finished matches that dropped off the fixtures feed after kickoff
    for (const m of liveMatches) {
      if (!coveredKeys.has(pairKey(m.homeTeam, m.awayTeam))) {
        matches.push(m);
      }
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
