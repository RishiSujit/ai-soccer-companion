const express = require('express');
const router = express.Router();
const axios = require('axios');
const { parseLineupForTeam } = require('../lib/livescoreApi');

const KEY = process.env.LIVESCORE_API_KEY;
const SECRET = process.env.LIVESCORE_API_SECRET;
const cache = new Map();
const TTL = 60 * 60 * 1000; // 1 hour

// GET /api/lineups/squad?team=Mexico&matchId=716178
router.get('/squad', async (req, res) => {
  const { team, matchId } = req.query;

  if (!team) return res.status(400).json({ error: 'team required' });

  if (!matchId) {
    // No matchId — lineups only available once match starts
    return res.json({ squad: null });
  }

  const cacheKey = `${team.toLowerCase()}-${matchId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return res.json({ squad: cached.data });
  }

  try {
    console.log('[Lineup] Fetching for matchId:', matchId, 'team:', team);

    const response = await axios.get(
      'https://livescore-api.com/api-client/matches/lineups.json',
      {
        params: { key: KEY, secret: SECRET, match_id: matchId },
        timeout: 8000,
      }
    );

    const lineup = response.data?.data?.lineup;
    const squad = parseLineupForTeam(lineup, team);

    if (squad?.players?.length) {
      cache.set(cacheKey, { data: squad, ts: Date.now() });
      console.log('[Lineup] Got', squad.players.length, 'players for', team);
      return res.json({ squad });
    }

    console.log('[Lineup] No lineup data for', team, 'matchId:', matchId);
    res.json({ squad: null });
  } catch (err) {
    console.error('[Lineup] API error:', err.message);
    res.json({ squad: null });
  }
});

module.exports = router;
