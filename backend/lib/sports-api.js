// API-Football client — https://www.api-football.com
// Free tier: 100 requests/day

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function fetchMatchContext(matchId) {
  // TODO: Phase 4 — fetch live score, events, and lineups for match companion
  return null;
}

async function fetchLiveMatches() {
  // TODO: Phase 4 — fetch all live World Cup 2026 matches
  return [];
}

module.exports = { fetchMatchContext, fetchLiveMatches };
