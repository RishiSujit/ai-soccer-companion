const { client } = require('./anthropic');
require('dotenv').config();

const oddsCache = new Map();
const CACHE_TTL_PRE = 30 * 60 * 1000;
const CACHE_TTL_LIVE = 5 * 60 * 1000;

function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(text.slice(start, end + 1));
}

async function fetchMatchOdds(homeTeam, awayTeam, matchDate) {
  const cacheKey = `${homeTeam}-${awayTeam}-${matchDate}`;

  const cached = oddsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_PRE) {
    console.log('[Odds] Cache hit:', cacheKey);
    return cached.data;
  }

  console.log('[Odds] Fetching odds for:', `${homeTeam} vs ${awayTeam}`);

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are a sports analyst estimating World Cup 2026 match probabilities based on team quality, form, and tournament context. Return ONLY valid JSON, no other text.

Return this exact structure:
{
  "homeTeam": "team name",
  "awayTeam": "team name",
  "homeOdds": "+120",
  "drawOdds": "+240",
  "awayOdds": "-140",
  "homeWinPct": 45,
  "drawPct": 28,
  "awayWinPct": 27,
  "totalGoalsLine": 2.5,
  "overOdds": "-110",
  "underOdds": "-110",
  "source": "AI estimate",
  "asOf": "pre-match"
}

homeWinPct + drawPct + awayWinPct must equal 100. Base estimates on team rankings, squad quality, and historical head-to-head.`,
      messages: [{
        role: 'user',
        content: `Estimate win probabilities and approximate betting odds for ${homeTeam} vs ${awayTeam} FIFA World Cup 2026. Return JSON only.`,
      }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    if (!text) {
      console.log('[Odds] No text in response');
      return null;
    }

    const odds = extractJSON(text);
    if (!odds) {
      console.log('[Odds] Could not parse JSON from response');
      return null;
    }

    if (odds.available === false) {
      console.log('[Odds] Not available yet for', cacheKey);
      return null;
    }

    oddsCache.set(cacheKey, { data: odds, timestamp: Date.now() });
    console.log('[Odds] Fetched:', JSON.stringify(odds).slice(0, 120));
    return odds;
  } catch (err) {
    console.error('[Odds] Fetch error:', err.message);
    return null;
  }
}

async function fetchLiveWinProbability(homeTeam, awayTeam, homeScore, awayScore, minute) {
  const bucket = Math.floor(minute / 10) * 10;
  const cacheKey = `live-${homeTeam}-${awayTeam}-${homeScore}-${awayScore}-${bucket}`;

  const cached = oddsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_LIVE) {
    return cached.data;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are a sports probability analyst. Return ONLY valid JSON, no other text.

Return this structure:
{
  "homeWinPct": 65,
  "drawPct": 20,
  "awayWinPct": 15,
  "context": "one sentence explaining the probability in plain English",
  "momentum": "home" or "away" or "even"
}

homeWinPct + drawPct + awayWinPct must equal 100.`,
      messages: [{
        role: 'user',
        content: `${homeTeam} vs ${awayTeam}, minute ${minute}, score ${homeScore}-${awayScore}. Estimate each team's current probability of winning based on the score and time remaining.`,
      }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    if (!text) return null;

    const prob = extractJSON(text);
    if (!prob) return null;

    oddsCache.set(cacheKey, { data: prob, timestamp: Date.now() });
    return prob;
  } catch (err) {
    console.error('[Odds] Live prob error:', err.message);
    return null;
  }
}

module.exports = { fetchMatchOdds, fetchLiveWinProbability };
