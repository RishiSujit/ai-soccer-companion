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

// GET /api/matches/live
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
      timeout: 8000,
    });

    let fixtures = (liveRes.data.response || []).filter(
      m => m.league.id === LEAGUE_ID
    );

    console.log(`Live matches for league ${LEAGUE_ID}:`, fixtures.length);

    // Step 2 — fall back to today's scheduled/finished fixtures if nothing live
    if (fixtures.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayRes = await axios.get(`${BASE_URL}/fixtures`, {
        params: { league: LEAGUE_ID, season: SEASON, date: today },
        headers: HEADERS,
        timeout: 8000,
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

        const statusShort = m.fixture.status.short;
        const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE'].includes(statusShort);
        const isFinished = ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(statusShort);

        // Only fetch lineups for live or finished matches
        if (isLive || isFinished) {
          try {
            const lineupRes = await axios.get(`${BASE_URL}/fixtures/lineups`, {
              params: { fixture: m.fixture.id },
              headers: HEADERS,
              timeout: 5000,
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
        }

        return {
          id: String(m.fixture.id),
          homeTeam: m.teams.home.name,
          awayTeam: m.teams.away.name,
          homeScore: m.goals.home,
          awayScore: m.goals.away,
          minute: m.fixture.status.elapsed,
          stage: m.league.round || 'World Cup 2026',
          status: statusShort,
          kickoff: m.fixture.date,
          kickoffET: new Date(m.fixture.date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/New_York',
            hour12: true,
          }) + ' ET',
          homeFlag: getFlagEmoji(m.teams.home.name),
          awayFlag: getFlagEmoji(m.teams.away.name),
          isLive,
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
    console.error('/live error:', err.message);
    res.json({ matches: [] });
  }
});

// GET /api/matches/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const response = await axios.get(`${BASE_URL}/fixtures`, {
      params: {
        league: LEAGUE_ID,
        season: SEASON,
        from: today,
        to: today,
        status: 'NS',
      },
      headers: HEADERS,
      timeout: 8000,
    });

    const fixtures = response.data?.response || [];

    const matches = fixtures.map(f => ({
      id: String(f.fixture.id),
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeScore: null,
      awayScore: null,
      status: f.fixture.status.short,
      kickoff: f.fixture.date,
      kickoffET: new Date(f.fixture.date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
        hour12: true,
      }) + ' ET',
      stage: f.league.round || 'World Cup 2026',
      venue: f.fixture.venue.name,
      homeFlag: getFlagEmoji(f.teams.home.name),
      awayFlag: getFlagEmoji(f.teams.away.name),
      isLive: false,
    }));

    res.json({ matches });
  } catch (err) {
    console.error('/upcoming error:', err.message);
    res.json({ matches: [] });
  }
});

function getFlagEmoji(teamName) {
  const flags = {
    'Mexico': '🇲🇽',
    'South Africa': '🇿🇦',
    'South Korea': '🇰🇷',
    'Korea Republic': '🇰🇷',
    'Czechia': '🇨🇿',
    'Czech Republic': '🇨🇿',
    'Canada': '🇨🇦',
    'Bosnia & Herzegovina': '🇧🇦',
    'Bosnia': '🇧🇦',
    'Qatar': '🇶🇦',
    'Switzerland': '🇨🇭',
    'Brazil': '🇧🇷',
    'Morocco': '🇲🇦',
    'Haiti': '🇭🇹',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'Paraguay': '🇵🇾',
    'Australia': '🇦🇺',
    'Turkey': '🇹🇷',
    'Türkiye': '🇹🇷',
    'Germany': '🇩🇪',
    'Curacao': '🇨🇼',
    'Curaçao': '🇨🇼',
    'Ivory Coast': '🇨🇮',
    "Cote d'Ivoire": '🇨🇮',
    'Ecuador': '🇪🇨',
    'Netherlands': '🇳🇱',
    'Japan': '🇯🇵',
    'Sweden': '🇸🇪',
    'Tunisia': '🇹🇳',
    'Belgium': '🇧🇪',
    'Egypt': '🇪🇬',
    'Iran': '🇮🇷',
    'New Zealand': '🇳🇿',
    'Spain': '🇪🇸',
    'Cape Verde': '🇨🇻',
    'Saudi Arabia': '🇸🇦',
    'Uruguay': '🇺🇾',
    'France': '🇫🇷',
    'Senegal': '🇸🇳',
    'Iraq': '🇮🇶',
    'Norway': '🇳🇴',
    'Argentina': '🇦🇷',
    'Algeria': '🇩🇿',
    'Austria': '🇦🇹',
    'Jordan': '🇯🇴',
    'Portugal': '🇵🇹',
    'DR Congo': '🇨🇩',
    'Congo DR': '🇨🇩',
    'Uzbekistan': '🇺🇿',
    'Colombia': '🇨🇴',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Croatia': '🇭🇷',
    'Ghana': '🇬🇭',
    'Panama': '🇵🇦',
  };
  return flags[teamName] || '🌍';
}

module.exports = router;
