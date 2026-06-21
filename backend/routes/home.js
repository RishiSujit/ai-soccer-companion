const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const { generateDailyHotTake } = require('../jobs/generateHotTake');
const { WC_SCHEDULE } = require('../lib/wcSchedule');
const { getLiveMatches: getLivescoreMatches, getHistoryMatches } = require('../lib/livescoreApi');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cache team headlines for the day — no need to regenerate per request
const headlineCache = new Map();
const headlineCacheDate = { date: '' };
function getHeadlineCache(team) {
  const today = new Date().toISOString().split('T')[0];
  if (headlineCacheDate.date !== today) { headlineCache.clear(); headlineCacheDate.date = today; }
  return headlineCache.get(team) || null;
}
function setHeadlineCache(team, headline) {
  headlineCache.set(team, headline);
}

// GET /api/home/recap/:team
router.get('/recap/:team', async (req, res) => {
  try {
    const { team } = req.params;
    const { data } = await supabase
      .from('match_recaps')
      .select('*')
      .or(`home_team.eq.${team},away_team.eq.${team}`)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ recap: data || null });
  } catch (err) {
    res.json({ recap: null });
  }
});

// GET /api/home/hot-take
router.get('/hot-take', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let { data } = await supabase
      .from('hot_takes')
      .select('*')
      .eq('date', today)
      .single();

    if (!data) {
      data = await generateDailyHotTake();
    }

    res.json({ hotTake: data });
  } catch (err) {
    res.json({ hotTake: null });
  }
});

// POST /api/home/hot-take/:id/vote
router.post('/hot-take/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;

    const field = vote === 'yes' ? 'yes_votes' : 'no_votes';

    const { data: current } = await supabase
      .from('hot_takes')
      .select(field)
      .eq('id', id)
      .single();

    const { data } = await supabase
      .from('hot_takes')
      .update({ [field]: (current?.[field] || 0) + 1 })
      .eq('id', id)
      .select()
      .single();

    res.json({ hotTake: data });
  } catch (err) {
    res.status(500).json({ error: 'Vote failed' });
  }
});

// Normalize team names to a canonical lowercase form for bracket matching
function normTeamBracket(name) {
  const MAP = {
    'united states': 'usa',
    'korea republic': 'south korea',
    "cote d'ivoire": 'ivory coast',
    "côte d'ivoire": 'ivory coast',
    'bosnia and herzegovina': 'bosnia & herzegovina',
    'bosnia': 'bosnia & herzegovina',
    'turkey': 'türkiye',
    'curacao': 'curaçao',
    'czech republic': 'czechia',
    'congo dr': 'dr congo',
  };
  const lower = (name || '').toLowerCase();
  return MAP[lower] || lower;
}

function bracketPairKey(home, away) {
  return `${normTeamBracket(home)}|${normTeamBracket(away)}`;
}

// GET /api/home/bracket/:team
// Built live from wcSchedule + livescore API — updates after every finished match.
router.get('/bracket/:team', async (req, res) => {
  try {
    const { team } = req.params;
    const teamNorm = normTeamBracket(team);

    // Collect this team's 3 group stage matches from the schedule
    const teamMatches = [];
    for (const [date, matches] of Object.entries(WC_SCHEDULE)) {
      for (const m of matches) {
        if (normTeamBracket(m.homeTeam) === teamNorm || normTeamBracket(m.awayTeam) === teamNorm) {
          teamMatches.push({ ...m, scheduleDate: date });
        }
      }
    }
    teamMatches.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

    if (teamMatches.length === 0) return res.json({ bracket: [] });

    // Fetch finished results + currently live matches in parallel
    const today = new Date().toISOString().split('T')[0];
    const [results, liveNow] = await Promise.all([
      getHistoryMatches('2026-06-11', today).catch(() => []),
      getLivescoreMatches().catch(() => []),
    ]);

    const resultMap = {};
    for (const r of results) resultMap[bracketPairKey(r.homeTeam, r.awayTeam)] = r;
    const liveMap = {};
    for (const l of liveNow) liveMap[bracketPairKey(l.homeTeam, l.awayTeam)] = l;

    const bracket = teamMatches.map((m, i) => {
      const key = bracketPairKey(m.homeTeam, m.awayTeam);
      const result = resultMap[key];
      const live = liveMap[key];

      const base = {
        round: `Group ${m.group} · Match ${i + 1}`,
        home_team: m.homeTeam,
        away_team: m.awayTeam,
        kickoffET: m.kickoffET,
        venue: m.venue,
        group: m.group,
        scheduleDate: m.scheduleDate,
      };

      if (result) {
        return { ...base, home_score: result.homeScore, away_score: result.awayScore, status: 'FT' };
      }
      if (live) {
        return { ...base, home_score: live.homeScore, away_score: live.awayScore, status: live.status || 'LIVE', minute: live.minute };
      }
      return { ...base, status: 'scheduled' };
    });

    res.json({ bracket });
  } catch (err) {
    console.error('Bracket error:', err.message);
    res.json({ bracket: [] });
  }
});

// GET /api/home/team-headline?team=Argentina&userSports=NFL,NBA
router.get('/team-headline', async (req, res) => {
  try {
    const { team, userSports } = req.query;

    if (!team) return res.json({ headline: null });

    const sports = userSports ? userSports.split(',') : ['NFL', 'NBA'];

    const prompt = `Write a single compelling headline about ${team} at the 2026 World Cup for a casual American ${sports[0]} fan.

Under 20 words.
Make it feel like a sports headline.
Capture what makes ${team} interesting or what their storyline is.
No quotes, no punctuation at the end.
Plain text only.

Examples of good style:
"The defending champions looking to prove 2022 was no fluke"
"America's team on home soil for the first time in 32 years"
"The aging legend's last shot at glory"`;

    const cached = getHeadlineCache(team);
    if (cached) return res.json({ headline: cached, team });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{ role: 'user', content: prompt }],
    });

    const headline = response.content[0].text.trim();
    setHeadlineCache(team, headline);
    res.json({ headline, team });
  } catch (err) {
    console.error('Headline error:', err.message);
    res.json({
      headline: `Follow ${req.query.team || 'this team'}'s World Cup journey`,
      team: req.query.team,
    });
  }
});

module.exports = router;
