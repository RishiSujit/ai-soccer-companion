const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:3002',
  'http://localhost:3000',
  'https://ai-soccer-companion.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(allowed =>
      origin.startsWith(allowed) ||
      allowed.includes(origin.replace('https://', '').replace('http://', ''))
    )) {
      return callback(null, true);
    }

    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    league: process.env.ACTIVE_LEAGUE_ID,
    season: process.env.ACTIVE_SEASON,
  });
});

app.post('/api/admin/score-today', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== process.env.ADMIN_KEY && key !== 'worldcup2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { scoreDate } = require('./lib/scoringEngine');
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const result = await scoreDate(date);
    res.json({ date, ...result });
  } catch (err) {
    console.error('/api/admin/score-today error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/chat', require('./routes/companion'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/player-card', require('./routes/playerCard'));
app.use('/api/home', require('./routes/home'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/daily-card', require('./routes/dailyCard'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/briefing', require('./routes/briefing'));
app.use('/api/odds', require('./routes/odds'));
app.use('/api/lineups', require('./routes/lineups'));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

// ── Background jobs ──────────────────────────────────────────
const { generateRecapForMatch } = require('./jobs/generateRecap');
const { generateDailyHotTake } = require('./jobs/generateHotTake');
const { updateBracket } = require('./jobs/updateBracket');

console.log("Generating today's hot take...");
generateDailyHotTake().catch(console.error);

setInterval(async () => {
  try {
    const axios = require('axios');
    const res = await axios.get(
      'https://v3.football.api-sports.io/fixtures',
      {
        params: { league: 1, season: 2026, status: 'FT', last: 5 },
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
      }
    );

    const finished = res.data.response || [];

    for (const fixture of finished) {
      const match = {
        id: String(fixture.fixture.id),
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeScore: fixture.goals.home,
        awayScore: fixture.goals.away,
        stage: fixture.league.round,
      };
      await generateRecapForMatch(match).catch(console.error);
    }

    await updateBracket().catch(console.error);
  } catch (err) {
    console.error('Polling error:', err);
  }
}, 5 * 60 * 1000);

console.log('Background jobs started');

// ── Daily scoring (every 30 min) ─────────────────────────────
const { runDailyScoring } = require('./jobs/runDailyScoring');

setInterval(() => {
  runDailyScoring().catch(console.error);
}, 30 * 60 * 1000);

// ── Daily card generation ────────────────────────────────────
const { generateDailyCards } = require('./jobs/generateDailyCard');

generateDailyCards().catch(console.error);

const _dcNow = new Date();
const _dcMidnight = new Date(_dcNow.getFullYear(), _dcNow.getMonth(), _dcNow.getDate() + 1, 0, 0, 0);
const _dcMsUntilMidnight = _dcMidnight.getTime() - _dcNow.getTime();

setTimeout(() => {
  generateDailyCards().catch(console.error);
  setInterval(() => {
    generateDailyCards().catch(console.error);
  }, 24 * 60 * 60 * 1000);
}, _dcMsUntilMidnight);

// ── Prop generation ──────────────────────────────────────────
const { generatePropsForUpcoming } = require('./jobs/generateProps');

generatePropsForUpcoming().catch(console.error);

const now = new Date();
const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
const msUntilMidnight = midnight.getTime() - now.getTime();

setTimeout(() => {
  generatePropsForUpcoming().catch(console.error);
  setInterval(() => {
    generatePropsForUpcoming().catch(console.error);
  }, 24 * 60 * 60 * 1000);
}, msUntilMidnight);

console.log(`Next prop generation in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
