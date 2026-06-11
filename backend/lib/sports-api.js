'use strict';

const { getLiveMatches, getUpcomingFixtures, getMatchEvents } = require('./livescoreApi');
const { buildDerivedSignals } = require('./matchSignals');

const FALLBACK = {
  homeTeam: 'Mexico',
  awayTeam: 'South Africa',
  homeScore: null,
  awayScore: null,
  minute: null,
  stage: 'Group Stage',
  venue: 'Estadio Azteca, Mexico City',
  isLive: false,
  events: [],
  stats: {},
  derivedSignals: null,
  recentEventsText: 'No events yet',
};

const matchCache = { data: null, lastFetched: null };
const CACHE_TTL = 30 * 1000;

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
        (detail && detail !== type ? ` (${detail})` : '') +
        (player ? ` — ${player}` : '') +
        (team ? ` [${team}]` : '');
    })
    .join('\n');
}

// livescoreApi returns team.name as 'home'/'away' — remap to actual team names
// matchSignals expects time.elapsed (number) and team.name (team name string)
function normalizeEvents(rawEvents, homeTeam, awayTeam) {
  return (rawEvents || []).map(e => ({
    type: e.type,
    time: { elapsed: typeof e.minute === 'string' ? parseInt(e.minute) || 0 : (e.minute || 0) },
    team: { name: e.team?.name === 'home' ? homeTeam : awayTeam },
    player: e.player,
    detail: e.detail,
  }));
}

function parseMinute(minuteVal) {
  if (typeof minuteVal === 'number') return minuteVal;
  if (minuteVal === 'HT') return 45;
  if (minuteVal === 'FT' || minuteVal === 'AET') return 90;
  return parseInt(minuteVal) || 0;
}

async function getLiveMatchContext() {
  if (matchCache.data && matchCache.lastFetched &&
      (Date.now() - matchCache.lastFetched) < CACHE_TTL) {
    return matchCache.data;
  }

  try {
    const liveMatches = await getLiveMatches();

    if (liveMatches.length > 0) {
      const m = liveMatches[0];
      const minuteNum = parseMinute(m.minute);
      const isExtraTime = minuteNum > 90 || m.status === 'ET';
      const isPenaltyShootout = m.status === 'PEN';

      const rawEvents = await getMatchEvents(m.id);
      const normalizedEvents = normalizeEvents(rawEvents, m.homeTeam, m.awayTeam);

      const matchState = {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        minute: minuteNum,
        stage: m.stage || 'Group Stage',
        isExtraTime,
        isPenaltyShootout,
      };

      const derivedSignals = buildDerivedSignals(matchState, normalizedEvents, {});

      const ctx = {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        minute: minuteNum,
        stage: m.stage || 'Group Stage',
        venue: m.venue || '',
        isLive: true,
        isExtraTime,
        isPenaltyShootout,
        events: normalizedEvents.slice(-10),
        stats: {},
        derivedSignals,
        recentEventsText: buildRecentEventsText(normalizedEvents, 5),
      };

      matchCache.data = ctx;
      matchCache.lastFetched = Date.now();
      return ctx;
    }

    // No live match — return next upcoming fixture for pre-match context
    const upcoming = await getUpcomingFixtures(1);
    if (upcoming.length > 0) {
      const f = upcoming[0];
      const ctx = {
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        homeScore: null,
        awayScore: null,
        minute: null,
        stage: f.stage || 'Group Stage',
        venue: f.venue || '',
        kickoffET: f.kickoffET,
        isLive: false,
        events: [],
        stats: {},
        derivedSignals: null,
        recentEventsText: 'Match has not started yet',
      };
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
