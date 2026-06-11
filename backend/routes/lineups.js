const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { getMatchLineups } = require('../lib/livescoreApi');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const squadCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const LIVE_CACHE_TTL = 5 * 60 * 1000;

function mapPosition(pos) {
  const map = { GK: 'GK', DF: 'CB', MF: 'CM', FW: 'ST' };
  return map[pos] || pos;
}

// GET /api/lineups/squad?team=Mexico&opponent=SouthAfrica&date=2026-06-11&lineupsUrl=...
router.get('/squad', async (req, res) => {
  const { team, opponent, date, lineupsUrl } = req.query;

  if (!team) return res.status(400).json({ error: 'team required' });

  // ── Live lineups path — use livescore API directly ─────────
  if (lineupsUrl) {
    let matchId;
    try {
      const url = new URL(decodeURIComponent(lineupsUrl));
      matchId = url.searchParams.get('match_id');
    } catch {}

    if (matchId) {
      const liveCacheKey = `live_${matchId}_${team.toLowerCase()}`;
      const liveCached = squadCache.get(liveCacheKey);
      if (liveCached && Date.now() - liveCached.ts < LIVE_CACHE_TTL) {
        console.log('[Lineup] Live cache hit:', team);
        return res.json({ squad: liveCached.data, cached: true });
      }

      try {
        console.log('[Lineup] Fetching live lineups for match:', matchId, 'team:', team);
        const lineupData = await getMatchLineups(matchId);
        const lineup = lineupData?.lineup;

        if (lineup?.home || lineup?.away) {
          const homeTeamName = lineup.home?.team?.name || '';
          const teamLower = team.toLowerCase();
          const isHome = homeTeamName.toLowerCase().includes(teamLower.split(' ')[0]) ||
                         teamLower.includes(homeTeamName.toLowerCase().split(' ')[0]);
          const teamData = isHome ? lineup.home : lineup.away;

          if (teamData?.players?.length) {
            const squad = {
              team: teamData.team?.name || team,
              coach: '',
              formation: '',
              players: teamData.players.map(p => ({
                name: p.name,
                number: parseInt(p.shirt_number) || 0,
                position: mapPosition(p.position),
                positionFull: p.position || '',
                club: '',
                age: 0,
                caps: 0,
                goals: 0,
                isKeyStar: false,
                starReason: null,
                photo: p.photo || null,
              })),
            };
            squadCache.set(liveCacheKey, { data: squad, ts: Date.now() });
            console.log('[Lineup] Live squad fetched:', squad.players.length, 'players for', team);
            return res.json({ squad });
          }
        }
      } catch (err) {
        console.error('[Lineup] Live fetch error:', err.message);
      }
      // Fall through to Claude web search if live lineup fetch fails
    }
  }

  // ── Claude web search path — upcoming matches ──────────────
  const cacheKey = team.toLowerCase();
  const cached = squadCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log('[Lineup] Cache hit:', team);
    return res.json({ squad: cached.data, cached: true });
  }

  try {
    console.log('[Lineup] Fetching squad for:', team);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: `You are a sports data assistant for the 2026 FIFA World Cup.
Search for the confirmed official squad and return ONLY valid JSON.

Return this exact structure:
{
  "team": "team name",
  "coach": "coach name",
  "formation": "4-3-3",
  "players": [
    {
      "name": "Player Name",
      "number": 10,
      "position": "ST",
      "positionFull": "Striker",
      "club": "Club Name",
      "age": 26,
      "caps": 45,
      "goals": 12,
      "isKeyStar": true,
      "starReason": "one sentence why they matter"
    }
  ]
}

Position codes: GK, RB, CB, LB, CDM, CM, CAM, RM, LM, RW, LW, ST
Include the full 26-man squad. Mark the likely starting XI as the first 11 players.
isKeyStar: true only for the 2-3 most famous/important players.
If you cannot find data return: { "available": false }
Return ONLY JSON. No other text.`,
      messages: [{
        role: 'user',
        content: `Find the complete official confirmed 2026 FIFA World Cup squad for ${team}. Search for their confirmed 26-player roster submitted to FIFA. Include shirt numbers, positions, clubs, ages, and international caps.${opponent ? ` They play ${opponent}${date ? ` on ${date}` : ''}.` : ''}`,
      }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return res.json({ squad: null });

    const squad = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (squad.available === false) return res.json({ squad: null });

    squadCache.set(cacheKey, { data: squad, ts: Date.now() });
    console.log('[Lineup] Fetched squad:', squad.players?.length, 'players for', team);
    res.json({ squad });

  } catch (err) {
    console.error('[Lineup] Error:', err.message);
    res.json({ squad: null });
  }
});

module.exports = router;
