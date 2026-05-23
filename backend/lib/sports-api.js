const axios = require('axios');
const { buildDerivedSignals } = require('./matchSignals');

const FALLBACK = {
  homeTeam: 'Argentina',
  awayTeam: 'France',
  homeScore: null,
  awayScore: null,
  minute: null,
  stage: 'Group Stage',
  isLive: false,
  events: [],
  stats: {},
  derivedSignals: null,
  recentEventsText: 'No events yet',
};

const FIFA_WORLD_CUP_LEAGUE_ID = 1;

const api = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
  timeout: 5000,
});

const matchCache = { data: null, lastFetched: null };
const CACHE_TTL = 2 * 60 * 1000;

function buildRecentEventsText(events, count = 5) {
  if (!events?.length) return 'No events yet';
  return events
    .slice(-count)
    .map(e => {
      const min = e.time?.elapsed || '?';
      const team = e.team?.name || '';
      const player = e.player?.name || '';
      const type = e.type || '';
      const detail = e.detail || '';
      return `${min}' — ${type}` +
        (detail ? ` (${detail})` : '') +
        (player ? ` — ${player}` : '') +
        (team ? ` [${team}]` : '');
    })
    .join('\n');
}

async function fetchEventsAndStats(fixtureId) {
  let events = [];
  let stats = {};

  try {
    const eventsRes = await api.get('/fixtures/events', {
      params: { fixture: fixtureId },
    });
    events = eventsRes.data.response || [];
  } catch (err) {
    console.log('Events fetch failed:', err.message);
  }

  try {
    const statsRes = await api.get('/fixtures/statistics', {
      params: { fixture: fixtureId },
    });
    const homeStats = statsRes.data.response?.[0]?.statistics || [];
    const awayStats = statsRes.data.response?.[1]?.statistics || [];

    const getPossession = (arr) => {
      const p = arr.find(s => s.type === 'Ball Possession');
      return parseInt(p?.value || '50%') || 50;
    };

    stats = {
      possession: {
        home: getPossession(homeStats),
        away: getPossession(awayStats),
      },
      shots: {
        home: homeStats.find(s => s.type === 'Total Shots')?.value || 0,
        away: awayStats.find(s => s.type === 'Total Shots')?.value || 0,
      },
    };
  } catch (err) {
    console.log('Stats fetch failed:', err.message);
  }

  return { events, stats };
}

async function buildFullMatchContext(fixture, isLive) {
  const { teams, goals, fixture: details, league } = fixture;

  const matchState = {
    homeTeam: teams.home.name,
    awayTeam: teams.away.name,
    homeScore: goals.home || 0,
    awayScore: goals.away || 0,
    minute: details.status.elapsed || 0,
    stage: league.round || 'World Cup 2026',
    isExtraTime: details.status.short === 'ET',
    isPenaltyShootout: details.status.short === 'P',
  };

  const { events, stats } = isLive
    ? await fetchEventsAndStats(details.id)
    : { events: [], stats: {} };

  const derivedSignals = buildDerivedSignals(matchState, events, stats);

  return {
    homeTeam: matchState.homeTeam,
    awayTeam: matchState.awayTeam,
    homeScore: goals.home,
    awayScore: goals.away,
    minute: details.status.elapsed,
    stage: league.round,
    isLive,
    isExtraTime: matchState.isExtraTime,
    isPenaltyShootout: matchState.isPenaltyShootout,
    events: events.slice(-10),
    stats,
    derivedSignals,
    recentEventsText: buildRecentEventsText(events, 5),
  };
}

async function getLiveMatchContext() {
  // Return cached data if still fresh
  if (matchCache.data && matchCache.lastFetched &&
      (Date.now() - matchCache.lastFetched) < CACHE_TTL) {
    return matchCache.data;
  }

  try {
    // Step 1 — check for live World Cup matches
    const liveRes = await api.get('/fixtures', { params: { live: 'all' } });
    const liveFixtures = liveRes.data.response ?? [];
    const liveWCMatch = liveFixtures.find(f => f.league.id === FIFA_WORLD_CUP_LEAGUE_ID);

    if (liveWCMatch) {
      const ctx = await buildFullMatchContext(liveWCMatch, true);
      matchCache.data = ctx;
      matchCache.lastFetched = Date.now();
      return ctx;
    }

    // Step 2 — no live match, fetch next upcoming World Cup fixture
    const nextRes = await api.get('/fixtures', {
      params: { league: FIFA_WORLD_CUP_LEAGUE_ID, season: 2026, next: 1 },
    });
    const nextFixtures = nextRes.data.response ?? [];

    if (nextFixtures.length > 0) {
      const ctx = await buildFullMatchContext(nextFixtures[0], false);
      matchCache.data = ctx;
      matchCache.lastFetched = Date.now();
      return ctx;
    }

    return FALLBACK;
  } catch (error) {
    console.error('Sports API error:', error.message);
    return matchCache.data || FALLBACK;
  }
}

module.exports = { getLiveMatchContext, buildRecentEventsText };
