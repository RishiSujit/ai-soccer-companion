const express = require('express');
const router = express.Router();
const { client, ONBOARDING_PROMPT } = require('../lib/anthropic');

router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: ONBOARDING_PROMPT,
      messages,
    });

    const replyText = response.content[0].text;

    // Detect team assignment — Claude outputs a JSON block when ready
    const jsonMatch = replyText.match(/\{[^}]*"action"\s*:\s*"assign_team"[^}]*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({
        action: 'assign_team',
        team: parsed.team,
        reasoning: parsed.reasoning,
        knownSports: parsed.knownSports || [],
        favoriteTeams: parsed.favoriteTeams || [],
        existingFan: parsed.existingFan || false,
        reply: null,
      });
    }

    res.json({
      action: null,
      team: null,
      reasoning: null,
      reply: replyText,
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
