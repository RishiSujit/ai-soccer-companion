const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/chat', require('./routes/companion'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/player-card', require('./routes/playerCard'));
app.use('/api/home', require('./routes/home'));
app.use('/api/matches', require('./routes/matches'));

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
