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

  return data.data.match
    .filter(m => m.home?.name && m.away?.name)
    .map(m => {
      const scoreStr = m.scores?.score || '? - ?';
      const scores = scoreStr.split(' - ');
      const homeScore = parseInt(scores[0]) || 0;
      const awayScore = parseInt(scores[1]) || 0;
      const isLive = m.status !== 'NOT STARTED';

      return {
        id: String(m.id),
        fixtureId: String(m.fixture_id),
        homeTeam: m.home.name,
        awayTeam: m.away.name,
        homeScore: isLive ? homeScore : null,
        awayScore: isLive ? awayScore : null,
        minute: isLive ? parseInt(m.time) || 0 : null,
        status: m.status,
        isLive,
        stage: 'Group Stage',
        venue: m.location || '',
        homeFlag: getFlagEmoji(m.home.name),
        awayFlag: getFlagEmoji(m.away.name),
        matchId: String(m.id),
        scheduled: m.scheduled || m.time || null,
        kickoffET: m.scheduled ? convertToET(new Date().toISOString().split('T')[0], m.scheduled) : null,
        lineupsUrl: m.urls?.lineups,
        eventsUrl: m.urls?.events,
      };
    });
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
    stage: inferStage(f.round),
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
    stage: inferStage(f.round),
    venue: f.location || '',
    homeFlag: getFlagEmoji(f.home_name),
    awayFlag: getFlagEmoji(f.away_name),
    isLive: false,
  }));
}

async function getFixturesInRange(dateFrom, dateTo) {
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
    home_name: f.home_name,
    away_name: f.away_name,
    status: 'NS',
    kickoff: toISOKickoff(f.date, f.time),
    kickoffET: convertToET(f.date, f.time),
    date: f.date,
    time: f.time,
    stage: inferStage(f.round),
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
    stage: inferStage(f.round),
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
  const events = data?.data?.event;
  if (!events?.length) {
    console.log('[Events] No events for:', matchId);
    return [];
  }
  console.log('[Events] Got', events.length, 'events for match', matchId);
  return events.map(e => ({
    type: e.event,
    label: e.label || formatEventLabel(e.event),
    minute: e.time,
    player: { name: e.player?.name || e.player || '' },
    assist: e.info?.name || null,
    isHome: e.is_home === true,
    isAway: e.is_away === true,
  }));
}

function formatEventLabel(eventType) {
  const labels = {
    GOAL: 'Goal',
    YELLOW_CARD: 'Yellow Card',
    RED_CARD: 'Red Card',
    SUBSTITUTION: 'Sub',
    OWN_GOAL: 'Own Goal',
    PENALTY_SCORED: 'Penalty Goal',
    PENALTY_MISSED: 'Penalty Missed',
    VAR: 'VAR Review',
  };
  return labels[eventType] || eventType;
}

async function getMatchLineups(matchId) {
  const data = await call('/matches/lineups.json', { match_id: matchId });
  return data?.data || null;
}

// Returns finished matches for a date range from the history feed
async function getHistoryMatches(from, to) {
  const data = await call('/scores/history.json', {
    competition_id: COMP,
    from,
    to,
  });
  if (!data?.data?.match) return [];

  return data.data.match.map(m => {
    const ftParts = (m.ft_score || m.score || '0 - 0').split(' - ');
    return {
      id: String(m.id),
      fixtureId: String(m.fixture_id || ''),
      homeTeam: m.home_name,
      awayTeam: m.away_name,
      homeId: m.home_id,
      awayId: m.away_id,
      homeScore: parseInt(ftParts[0]) || 0,
      awayScore: parseInt(ftParts[1]) || 0,
      htScore: m.ht_score || '',
      ftScore: m.ft_score || m.score || '',
      status: m.status || 'FINISHED',
      date: m.date,
      venue: m.location || '',
      stage: 'Group Stage',
      homeFlag: getFlagEmoji(m.home_name),
      awayFlag: getFlagEmoji(m.away_name),
      isLive: false,
      isFinished: true,
      matchId: String(m.id),
      eventsUrl: m.events || '',
      lineupsUrl: m.has_lineups
        ? `${BASE}/matches/lineups.json?match_id=${m.id}`
        : '',
    };
  });
}

// Fetch events using the events URL stored on the match object
async function getMatchEventsByUrl(eventsUrl) {
  if (!eventsUrl) return [];
  try {
    const url = new URL(eventsUrl);
    const matchId = url.searchParams.get('id');
    if (!matchId) return [];
    return getMatchEvents(matchId);
  } catch {
    return [];
  }
}

// Fetch lineup using the lineups URL stored on the match object
async function getLineupsByUrl(lineupsUrl) {
  if (!lineupsUrl) return null;
  try {
    const url = new URL(lineupsUrl);
    const matchId = url.searchParams.get('match_id');
    if (!matchId) return null;
    const data = await call('/matches/lineups.json', { match_id: matchId });
    return data?.data?.lineup || null;
  } catch {
    return null;
  }
}

// Parse raw lineup object into squad format for a specific team
function parseLineupForTeam(lineup, teamName) {
  if (!lineup) return null;
  const teamLower = teamName.toLowerCase();
  const homeName = lineup.home?.team?.name?.toLowerCase() || '';
  const isHome =
    homeName.includes(teamLower.split(' ')[0]) ||
    teamLower.includes(homeName.split(' ')[0]);
  const teamData = isHome ? lineup.home : lineup.away;
  if (!teamData?.players?.length) return null;

  const starters = teamData.players.filter(p => p.substitution === '0');
  const subs = teamData.players.filter(p => p.substitution === '1');

  return {
    team: teamData.team?.name || teamName,
    formation: isHome ? lineup.home_formation : lineup.away_formation,
    players: [
      ...starters.map(p => ({
        name: p.name,
        number: parseInt(p.shirt_number) || 0,
        position: p.position || 'MF',
        positionFull: expandPosition(p.position),
        isStarter: true,
        isKeyStar: false,
        photo: p.photo || null,
      })),
      ...subs.map(p => ({
        name: p.name,
        number: parseInt(p.shirt_number) || 0,
        position: p.position || 'MF',
        positionFull: expandPosition(p.position),
        isStarter: false,
        isKeyStar: false,
        photo: p.photo || null,
      })),
    ],
  };
}

async function getStandings() {
  const data = await call('/league-tables/standings.json', { competition_id: COMP });
  return data?.data || null;
}

function expandPosition(pos) {
  const map = {
    GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward',
    CB: 'Centre Back', RB: 'Right Back', LB: 'Left Back',
    CM: 'Central Midfielder', CAM: 'Attacking Midfielder', CDM: 'Defensive Midfielder',
    RW: 'Right Winger', LW: 'Left Winger', ST: 'Striker', CF: 'Centre Forward',
  };
  return map[pos] || pos || 'Player';
}

function inferStage(round) {
  if (!round) return 'Group Stage';
  const r = String(round).toLowerCase().trim();
  if (/^\d+$/.test(r)) return 'Group Stage';
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 'Final';
  if (r.includes('semi')) return 'Semi-finals';
  if (r.includes('quarter')) return 'Quarter-finals';
  if (r.includes('round of 16') || r.includes('round of sixteen')) return 'Round of 16';
  if (r.includes('round of 32')) return 'Round of 32';
  return String(round);
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
  getFixturesInRange,
  getFixturesForDate,
  getFinishedMatches,
  getHistoryMatches,
  getMatchEvents,
  getMatchEventsByUrl,
  getMatchLineups,
  getLineupsByUrl,
  parseLineupForTeam,
  getStandings,
  getFlagEmoji,
  convertToET,
};
