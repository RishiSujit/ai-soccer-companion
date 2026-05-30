const express = require('express');
const router = express.Router();
const axios = require('axios');

const LEAGUE_ID = parseInt(process.env.ACTIVE_LEAGUE_ID) || 1;
const SEASON = parseInt(process.env.ACTIVE_SEASON) || 2026;
const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';
const HEADERS = { 'x-apisports-key': API_KEY };

let matchesCache = { data: null, lastFetched: null };
const CACHE_TTL = 60 * 1000; // 1 minute

router.get('/live', async (req, res) => {
  try {
    const now = Date.now();

    if (matchesCache.data && matchesCache.lastFetched &&
        (now - matchesCache.lastFetched) < CACHE_TTL) {
      return res.json({ matches: matchesCache.data, fromCache: true });
    }

    // Step 1 — fetch all live matches, filter to active league
    const liveRes = await axios.get(`${BASE_URL}/fixtures`, {
      params: { live: 'all' },
      headers: HEADERS,
    });

    let fixtures = (liveRes.data.response || []).filter(
      m => m.league.id === LEAGUE_ID
    );

    console.log(`Live matches for league ${LEAGUE_ID}:`, fixtures.length);

    // Step 2 — fall back to today's scheduled fixtures if nothing live
    if (fixtures.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayRes = await axios.get(`${BASE_URL}/fixtures`, {
        params: { league: LEAGUE_ID, season: SEASON, date: today },
        headers: HEADERS,
      });
      fixtures = todayRes.data.response || [];
      console.log('Today fixtures fallback:', fixtures.length);
    }

    // Step 3 — enrich each match with lineups (parallel, fail silently)
    const formatted = await Promise.all(
      fixtures.slice(0, 10).map(async (m) => {
        let homePlayers = [];
        let awayPlayers = [];
        let homeFormation = 'TBA';
        let awayFormation = 'TBA';

        try {
          const lineupRes = await axios.get(`${BASE_URL}/fixtures/lineups`, {
            params: { fixture: m.fixture.id },
            headers: HEADERS,
          });
          const lineups = lineupRes.data.response || [];

          if (lineups[0]) {
            homeFormation = lineups[0].formation || 'TBA';
            homePlayers = (lineups[0].startXI || []).map(p => ({
              num: p.player.number,
              name: p.player.name,
              pos: p.player.pos,
            }));
          }
          if (lineups[1]) {
            awayFormation = lineups[1].formation || 'TBA';
            awayPlayers = (lineups[1].startXI || []).map(p => ({
              num: p.player.number,
              name: p.player.name,
              pos: p.player.pos,
            }));
          }
        } catch {
          console.log('Lineup fetch failed for', m.fixture.id);
        }

        const isNotStarted = m.fixture.status.short === 'NS';

        return {
          id: String(m.fixture.id),
          homeTeam: m.teams.home.name,
          awayTeam: m.teams.away.name,
          homeScore: m.goals.home,
          awayScore: m.goals.away,
          minute: m.fixture.status.elapsed,
          stage: m.league.round || 'Serie A',
          status: isNotStarted ? 'upcoming' : 'live',
          kickoff: isNotStarted
            ? new Date(m.fixture.date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/New_York',
              }) + ' ET'
            : null,
          homePlayers,
          awayPlayers,
          homeFormation,
          awayFormation,
        };
      })
    );

    matchesCache.data = formatted;
    matchesCache.lastFetched = now;

    res.json({ matches: formatted, fromCache: false, total: formatted.length });
  } catch (err) {
    console.error('Matches route error:', err.message);
    res.json({ matches: [] });
  }
});

module.exports = router;
