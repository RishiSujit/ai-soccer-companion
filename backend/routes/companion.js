const express = require('express');
const router = express.Router();
const { client, COMPANION_PROMPT } = require('../lib/anthropic');
const { retrieve } = require('../lib/rag');
const { getLiveMatchContext } = require('../lib/sports-api');

function buildMatchContextString(matchContext) {
  const { homeTeam, awayTeam, homeScore, awayScore, minute, stage, isLive } = matchContext;
  const score = (homeScore != null && awayScore != null)
    ? `${homeScore}-${awayScore}`
    : 'pre-match';
  const time = minute ? `${minute}'` : 'kickoff';
  const status = isLive ? 'LIVE' : 'upcoming';
  return `${homeTeam} vs ${awayTeam} | ${score} | ${time} | ${stage} | ${status}`;
}

router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    const [matchContext, retrievedKnowledge] = await Promise.all([
      getLiveMatchContext(),
      Promise.resolve(retrieve(message, 3)),
    ]);

    const systemPrompt = COMPANION_PROMPT
      .replace('{match_context}', buildMatchContextString(matchContext))
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

    res.json({ reply: response.content[0].text, matchContext });
  } catch (error) {
    console.error('Companion error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
