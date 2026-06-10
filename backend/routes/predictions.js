const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory cache for score predictions (6-hour TTL)
const predCache = new Map();
const PRED_TTL = 6 * 60 * 60 * 1000;

// POST /api/predictions/scores
// Body: { matches: [{homeTeam, awayTeam, group, date}] }
router.post('/scores', async (req, res) => {
  const { matches } = req.body;
  if (!matches?.length) return res.status(400).json({ error: 'matches array required' });

  const results = {};
  const toFetch = [];

  matches.forEach(m => {
    const key = `${m.homeTeam}-${m.awayTeam}`;
    const cached = predCache.get(key);
    if (cached && Date.now() - cached.ts < PRED_TTL) {
      results[key] = cached.data;
    } else {
      toFetch.push(m);
    }
  });

  if (toFetch.length === 0) return res.json({ predictions: results });

  try {
    console.log('[ScorePredictions] Fetching for', toFetch.length, 'matches');

    const matchList = toFetch
      .map((m, i) => `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.group})`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: `You are a World Cup analyst predicting match scores for entertainment purposes.
Analyze team form, head-to-head history, squad quality, and tournament context.

Return ONLY a valid JSON object. No markdown. No backticks. Start with {

Schema:
{
  "predictions": {
    "HomeTeam-AwayTeam": {
      "homeScore": 2,
      "awayScore": 0,
      "confidence": "high|medium|low",
      "watchability": 8,
      "headline": "one punchy sentence why this game matters",
      "keyFactor": "the single biggest factor in this prediction"
    }
  }
}

watchability is 1-10:
10 = must-watch blockbuster
7-9 = great game expected
4-6 = competitive but modest
1-3 = likely one-sided

Be honest — not every game is a 10.
Keep headlines under 12 words.
keyFactor under 10 words.`,
      messages: [{
        role: 'user',
        content: `Search for recent form, head to head records, and expert predictions for these 2026 World Cup matches:\n\n${matchList}\n\nReturn predictions as JSON.`,
      }],
    });

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    let parsed = null;
    try {
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      if (start !== -1 && end > start) {
        parsed = JSON.parse(rawText.slice(start, end + 1));
      }
    } catch (e) {
      console.error('[ScorePredictions] Parse error:', e.message);
    }

    if (parsed?.predictions) {
      Object.entries(parsed.predictions).forEach(([key, pred]) => {
        results[key] = pred;
        predCache.set(key, { data: pred, ts: Date.now() });
      });
    }

    console.log('[ScorePredictions] Done, total predictions:', Object.keys(results).length);
    res.json({ predictions: results });
  } catch (err) {
    console.error('[ScorePredictions] Error:', err.message);
    res.json({ predictions: results });
  }
});

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/predictions/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        match_props (
          id,
          question,
          options,
          prop_type
        )
      `)
      .gte('kickoff_time', now)
      .eq('status', 'scheduled')
      .order('kickoff_time', { ascending: true })
      .limit(10);

    if (error) throw error;

    if (!matches || matches.length === 0) {
      return res.json({ matches: getFallbackMatches(), fromFallback: true });
    }

    res.json({ matches, fromFallback: false });
  } catch (err) {
    console.error('Upcoming predictions error:', err.message);
    res.json({ matches: getFallbackMatches(), fromFallback: true });
  }
});

// POST /api/predictions/submit
router.post('/submit', async (req, res) => {
  try {
    const { userId, matchId, resultPrediction, propPredictions } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('kickoff_time')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (new Date() >= new Date(match.kickoff_time)) {
      return res.status(400).json({ error: 'Predictions locked — match has started' });
    }

    const { data, error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId,
        match_id: matchId,
        result_prediction: resultPrediction,
        prop_predictions: propPredictions || {},
        locked_at: new Date().toISOString(),
      }, { onConflict: 'user_id,match_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, prediction: data });
  } catch (err) {
    console.error('Submit prediction error:', err.message);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

// GET /api/predictions/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ predictions: data || [] });
  } catch (err) {
    res.json({ predictions: [] });
  }
});

function getFallbackMatches() {
  return [
    {
      id: 'fallback-1',
      home_team: 'Argentina',
      away_team: 'France',
      kickoff_time: '2026-06-14T19:00:00.000Z',
      stage: 'group',
      status: 'scheduled',
      match_props: [
        {
          id: 'fp-1',
          question: 'Will Messi score?',
          options: ['Yes', 'No'],
          prop_type: 'player_performance',
        },
        {
          id: 'fp-2',
          question: 'Will there be a red card?',
          options: ['Yes', 'No'],
          prop_type: 'match_events',
        },
        {
          id: 'fp-3',
          question: 'Total goals in the match?',
          options: ['0-1', '2-3', '4+'],
          prop_type: 'match_events',
        },
      ],
    },
    {
      id: 'fallback-2',
      home_team: 'USA',
      away_team: 'Mexico',
      kickoff_time: '2026-06-22T00:00:00.000Z',
      stage: 'group',
      status: 'scheduled',
      match_props: [
        {
          id: 'fp-4',
          question: 'Will Pulisic score?',
          options: ['Yes', 'No'],
          prop_type: 'player_performance',
        },
        {
          id: 'fp-5',
          question: 'Will there be a red card?',
          options: ['Yes', 'No'],
          prop_type: 'match_events',
        },
        {
          id: 'fp-6',
          question: 'First half goals?',
          options: ['0', '1', '2+'],
          prop_type: 'match_events',
        },
      ],
    },
  ];
}

module.exports = router;
