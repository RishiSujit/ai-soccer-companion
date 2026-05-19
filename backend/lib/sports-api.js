const axios = require('axios');

const FALLBACK = {
  homeTeam: 'Argentina',
  awayTeam: 'France',
  homeScore: null,
  awayScore: null,
  minute: null,
  stage: 'Group Stage',
  isLive: false,
};

const FIFA_WORLD_CUP_LEAGUE_ID = 1;

const api = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': process.env.API_FOOTBALL_KEY,
  },
  timeout: 5000,
});

function extractMatchContext(fixture, isLive) {
  const { teams, goals, fixture: details, league } = fixture;
  return {
    homeTeam: teams.home.name,
    awayTeam: teams.away.name,
    homeScore: goals.home,
    awayScore: goals.away,
    minute: details.status.elapsed ?? null,
    stage: league.round ?? 'World Cup 2026',
    isLive,
  };
}

async function getLiveMatchContext() {
  try {
    // Step 1 — check for live World Cup matches
    const liveRes = await api.get('/fixtures', { params: { live: 'all' } });
    const liveFixtures = liveRes.data.response ?? [];
    const liveWCMatch = liveFixtures.find(
      f => f.league.id === FIFA_WORLD_CUP_LEAGUE_ID
    );

    if (liveWCMatch) {
      return extractMatchContext(liveWCMatch, true);
    }

    // Step 2 — no live match, fetch the next upcoming World Cup fixture
    const nextRes = await api.get('/fixtures', {
      params: { league: FIFA_WORLD_CUP_LEAGUE_ID, season: 2026, next: 1 },
    });
    const nextFixtures = nextRes.data.response ?? [];

    if (nextFixtures.length > 0) {
      return extractMatchContext(nextFixtures[0], false);
    }

    return FALLBACK;
  } catch (error) {
    console.error('Sports API error:', error.message);
    return FALLBACK;
  }
}

module.exports = { getLiveMatchContext };
