const express = require('express');
const router = express.Router();
const { client, COMPANION_PROMPT } = require('../lib/anthropic');
const { retrieve } = require('../lib/rag');

function buildMatchContextString(matchContext) {
  if (!matchContext) return 'No live match context available.';
  const { homeTeam, awayTeam, homeScore, awayScore, minute, stage } = matchContext;
  const score = (homeScore != null && awayScore != null)
    ? `${homeScore}-${awayScore}`
    : 'score not available';
  const time = minute ? `${minute}'` : 'kickoff';
  const round = stage || 'World Cup 2026';
  return `${homeTeam} vs ${awayTeam} | ${score} | ${time} | ${round}`;
}

router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [], matchContext = null } = req.body;

    const retrievedKnowledge = retrieve(message, 3);
    const matchContextString = buildMatchContextString(matchContext);

    const systemPrompt = COMPANION_PROMPT
      .replace('{match_context}', matchContextString)
      .replace('{retrieved_knowledge}', retrievedKnowledge);

    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    res.json({ reply: response.content[0].text });
  } catch (error) {
    console.error('Companion error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
