const axios = require('axios');

const BASE = 'https://livescore-api.com/api-client';
const KEY = process.env.LIVESCORE_API_KEY;
const SECRET = process.env.LIVESCORE_API_SECRET;
const COMP = process.env.LIVESCORE_COMPETITION_ID || '362';

// Simple in-process cache
const cache = new Map();

async function call(endpoint, params = {}) {
  const allParams = { key: KEY, secret: SECRET, ...params };
  const cacheKey = endpoint + JSON.stringify(allParams);
  const ttl = endpoint.includes('live') ? 30000 : 300000;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttl) return cached.data;

  try {
    const res = await axios.get(`${BASE}${endpoint}`, {
      params: allParams,
      timeout: 8000,
    });
    cache.set(cacheKey, { data: res.data, ts: Date.now() });
    return res.data;
  } catch (err) {
    console.error('[LivescoreAPI]', endpoint, err.message);
    return null;
  }
}

async function getLiveMatches() {
  const data = await call('/matches/live.json', { competition_id: COMP });
  if (!data?.data?.match) return [];

  return data.data.match.map(m => ({
    id: String(m.id),
    homeTeam: m.home_name,
    awayTeam: m.away_name,
    homeScore: parseInt(m.score) || 0,
    awayScore: parseInt(m.away_score) || 0,
    minute: m.time === 'HT' || m.time === 'FT' ? m.time : parseInt(m.time) || 0,
    status: m.time === 'HT' ? 'HT' : m.time === 'FT' ? 'FT' : '1H',
    stage: m.competition?.name || 'Group Stage',
    venue: m.location || '',
    homeFlag: getFlagEmoji(m.home_name),
    awayFlag: getFlagEmoji(m.away_name),
    isLive: true,
    matchId: String(m.id),
  }));
}

async function getTodayFixtures() {
  const today = new Date().toISOString().split('T')[0];
  const data = await call('/fixtures/matches.json', {
    competition_id: COMP,
    date_from: today,
    date_to: today,
  });
  if (!data?.data?.fixtures) return [];

  return data.data.fixtures.map(f => ({
    id: String(f.id),
    homeTeam: f.home_name,
    awayTeam: f.away_name,
    homeScore: null,
    awayScore: null,
    status: 'NS',
    kickoff: toISOKickoff(f.date, f.time),
    kickoffET: convertToET(f.date, f.time),
    stage: f.round || 'Group Stage',
    venue: f.location || '',
    homeFlag: getFlagEmoji(f.home_name),
    awayFlag: getFlagEmoji(f.away_name),
    isLive: false,
  }));
}

async function getUpcomingFixtures(daysAhead = 7) {
  const today = new Date();
  const end = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = end.toISOString().split('T')[0];

  const data = await call('/fixtures/matches.json', {
    competition_id: COMP,
    date_from: dateFrom,
    date_to: dateTo,
  });
  if (!data?.data?.fixtures) return [];

  return data.data.fixtures.map(f => ({
    id: String(f.id),
    homeTeam: f.home_name,
    awayTeam: f.away_name,
    status: 'NS',
    kickoff: toISOKickoff(f.date, f.time),
    kickoffET: convertToET(f.date, f.time),
    date: f.date,
    stage: f.round || 'Group Stage',
    venue: f.location || '',
    homeFlag: getFlagEmoji(f.home_name),
    awayFlag: getFlagEmoji(f.away_name),
    isLive: false,
  }));
}

async function getFixturesForDate(date) {
  const data = await call('/fixtures/matches.json', {
    competition_id: COMP,
    date_from: date,
    date_to: date,
  });
  if (!data?.data?.fixtures) return [];

  return data.data.fixtures.map(f => ({
    id: String(f.id),
    home_name: f.home_name,
    away_name: f.away_name,
    homeTeam: f.home_name,
    awayTeam: f.away_name,
    date: f.date,
    time: f.time,
    kickoff: toISOKickoff(f.date, f.time),
    kickoffET: convertToET(f.date, f.time),
    stage: f.round || 'Group Stage',
    venue: f.location || '',
  }));
}

async function getFinishedMatches(date) {
  const data = await call('/scores/history.json', {
    competition_id: COMP,
    from: date,
    to: date,
  });
  if (!data?.data?.match) return [];
  return data.data.match.filter(m => m.time === 'FT' || m.time === 'AET' || m.time === 'PEN');
}

async function getMatchEvents(matchId) {
  const data = await call('/matches/events.json', { match_id: matchId });
  if (!data?.data?.event) return [];

  return data.data.event.map(e => ({
    type: e.type,
    minute: e.time,
    player: { name: e.player },
    team: { name: e.home_away === 'h' ? 'home' : 'away' },
    detail: e.extra || e.type,
  }));
}

async function getMatchLineups(matchId) {
  const data = await call('/matches/lineups.json', { match_id: matchId });
  return data?.data || null;
}

async function getStandings() {
  const data = await call('/league-tables/standings.json', { competition_id: COMP });
  return data?.data || null;
}

function toISOKickoff(date, time) {
  // time may be 'HH:MM' or 'HH:MM:SS' — normalise to HH:MM
  const t = time.length > 5 ? time.slice(0, 5) : time;
  return date + 'T' + t + ':00Z';
}

function convertToET(date, time) {
  try {
    const dt = new Date(toISOKickoff(date, time));
    return dt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
      hour12: true,
    }) + ' ET';
  } catch {
    return time + ' UTC';
  }
}

function getFlagEmoji(teamName) {
  const flags = {
    'Mexico': '🇲🇽',
    'South Africa': '🇿🇦',
    'South Korea': '🇰🇷',
    'Korea Republic': '🇰🇷',
    'Czechia': '🇨🇿',
    'Czech Republic': '🇨🇿',
    'Canada': '🇨🇦',
    'Bosnia': '🇧🇦',
    'Bosnia & Herzegovina': '🇧🇦',
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

module.exports = {
  getLiveMatches,
  getTodayFixtures,
  getUpcomingFixtures,
  getFixturesForDate,
  getFinishedMatches,
  getMatchEvents,
  getMatchLineups,
  getStandings,
  getFlagEmoji,
  convertToET,
};
