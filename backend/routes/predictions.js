const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory cache for score predictions (6-hour TTL)
const predCache = new Map();
const PRED_TTL = 24 * 60 * 60 * 1000;

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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: `You are a World Cup analyst predicting match scores for entertainment purposes.
Use your knowledge of team form, head-to-head history, squad quality, and tournament context.

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
        content: `Predict scores for these 2026 World Cup matches:\n\n${matchList}\n\nReturn predictions as JSON.`,
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

module.exports = router;
