const express = require('express');
const router = express.Router();
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const KEY = process.env.LIVESCORE_API_KEY;
const SECRET = process.env.LIVESCORE_API_SECRET;
const cache = new Map();
const TTL = 30 * 60 * 1000; // 30 mins

// GET /api/lineups/squad?team=Mexico&matchId=716178
router.get('/squad', async (req, res) => {
  const { team, matchId } = req.query;

  if (!team) return res.status(400).json({ error: 'team required' });

  const cacheKey = `${team.toLowerCase()}-${matchId || 'general'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return res.json({ squad: cached.data });
  }

  // PATH 1: Live API lineup — use when matchId available
  if (matchId) {
    try {
      console.log('[Lineup] Fetching from API:', matchId, 'for team:', team);

      const response = await axios.get(
        'https://livescore-api.com/api-client/matches/lineups.json',
        { params: { key: KEY, secret: SECRET, match_id: matchId }, timeout: 8000 }
      );

      const lineup = response.data?.data?.lineup;

      if (lineup) {
        const teamLower = team.toLowerCase();
        const homeName = lineup.home?.team?.name?.toLowerCase() || '';
        const isHome = homeName.includes(teamLower.split(' ')[0]) ||
                       teamLower.includes(homeName.split(' ')[0]);
        const teamData = isHome ? lineup.home : lineup.away;

        if (teamData?.players?.length) {
          const starters = teamData.players.filter(p => p.substitution === '0');
          const subs     = teamData.players.filter(p => p.substitution === '1');

          const squad = {
            team: teamData.team?.name || team,
            formation: isHome ? lineup.home_formation : lineup.away_formation,
            players: [
              ...starters.map(p => ({
                name: p.name,
                number: parseInt(p.shirt_number) || 0,
                position: p.position || 'CM',
                positionFull: expandPosition(p.position),
                isStarter: true,
                isKeyStar: false,
                photo: p.photo || null,
              })),
              ...subs.map(p => ({
                name: p.name,
                number: parseInt(p.shirt_number) || 0,
                position: p.position || 'CM',
                positionFull: expandPosition(p.position),
                isStarter: false,
                isKeyStar: false,
                photo: p.photo || null,
              })),
            ],
          };

          cache.set(cacheKey, { data: squad, ts: Date.now() });
          console.log('[Lineup] Got', squad.players.length, 'players for', team);
          return res.json({ squad });
        }
      }
    } catch (err) {
      console.error('[Lineup] API error:', err.message);
    }
  }

  // PATH 2: Claude web search fallback — upcoming matches without matchId
  console.log('[Lineup] Web search fallback for:', team);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: `Return ONLY valid JSON, nothing else.
{
  "team": "string",
  "formation": "4-3-3",
  "players": [{
    "name": "string",
    "number": 10,
    "position": "ST",
    "positionFull": "Striker",
    "isStarter": true,
    "isKeyStar": false
  }]
}`,
      messages: [{
        role: 'user',
        content: `Official 2026 World Cup squad for ${team}. Starting XI first.`,
      }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start !== -1 && end > start) {
      const squad = JSON.parse(text.slice(start, end + 1));
      if (squad?.players?.length) {
        cache.set(cacheKey, { data: squad, ts: Date.now() });
        return res.json({ squad });
      }
    }
  } catch (err) {
    console.error('[Lineup] Web search error:', err.message);
  }

  res.json({ squad: null });
});

function expandPosition(pos) {
  const map = {
    GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward',
    CB: 'Centre Back', RB: 'Right Back', LB: 'Left Back',
    CM: 'Central Midfielder', CAM: 'Attacking Midfielder', CDM: 'Defensive Midfielder',
    RW: 'Right Winger', LW: 'Left Winger', ST: 'Striker', CF: 'Centre Forward',
  };
  return map[pos] || pos || 'Player';
}

module.exports = router;
