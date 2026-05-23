const express = require('express');
const router = express.Router();
const { client } = require('../lib/anthropic');
const { retrieve } = require('../lib/rag');
const { getLiveMatchContext } = require('../lib/sports-api');

function buildUserContextString(userContext) {
  if (!userContext || !userContext.knownSports?.length)
    return 'No user sports context available.';
  const sports = userContext.knownSports.join(', ');
  const teams = userContext.favoriteTeams?.length
    ? `Favorite teams: ${userContext.favoriteTeams.join(', ')}.`
    : '';
  return `This user follows ${sports}. ${teams} Always use analogies from these sports when explaining soccer concepts.`;
}

function buildMatchContextString(matchContext) {
  if (!matchContext) return 'No live match data available.';

  const {
    homeTeam, awayTeam, homeScore, awayScore,
    minute, stage, derivedSignals, recentEventsText, stats,
  } = matchContext;

  const scoreStr = (homeScore !== null && awayScore !== null)
    ? `${homeScore} - ${awayScore}`
    : 'Score not available';

  let context = `LIVE MATCH:
${homeTeam} ${scoreStr} ${awayTeam}
Minute: ${minute || 'Not started'}'
Stage: ${stage || 'Unknown'}
`;

  if (recentEventsText && recentEventsText !== 'No events yet') {
    context += `
RECENT EVENTS (last 5):
${recentEventsText}
`;
  }

  if (stats?.possession) {
    context += `
MATCH STATS:
Possession: ${homeTeam} ${stats.possession.home}% vs ${awayTeam} ${stats.possession.away}%
Shots: ${homeTeam} ${stats.shots?.home || 0} vs ${awayTeam} ${stats.shots?.away || 0}
`;
  }

  if (derivedSignals) {
    context += `
MATCH INTELLIGENCE (calibrate your response energy to these signals):
Pressure level: ${derivedSignals.pressure}
Momentum: ${derivedSignals.momentum}
Stakes: ${derivedSignals.stakes}
Emotional intensity: ${derivedSignals.emotional_intensity}
Narrative frame: ${derivedSignals.narrative}

SIGNAL INSTRUCTIONS:
- CRITICAL or HIGH pressure → convey urgency
- SPIKE intensity → acknowledge the drama first
- MAXIMUM or CRITICAL stakes → explain consequences clearly
- Clear momentum → reference it naturally in your answer
- Match your energy to the moment
`;
  }

  return context;
}

router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [], matchContext, userContext } = req.body;

    const [liveContext, retrievedKnowledge] = await Promise.all([
      getLiveMatchContext(),
      Promise.resolve(retrieve(message, 3)),
    ]);

    const activeMatch = matchContext || liveContext;

    const systemPrompt = `You are an AI soccer companion helping a casual American fan enjoy a live World Cup 2026 match.

USER SPORTS CONTEXT:
${buildUserContextString(userContext)}

${buildMatchContextString(activeMatch)}

RELEVANT KNOWLEDGE:
${retrievedKnowledge}

YOUR CORE JOB:
- Use the MATCH INTELLIGENCE signals above to calibrate how you respond
- High pressure moment → respond with urgency
- Spike intensity → acknowledge the drama first, then explain
- Low intensity → calm, educational tone
- Explain WHY something matters, not just WHAT happened
- Use the user's specific sports as your analogy framework:
  - Offside → like being in the backfield before the snap (NFL) or a moving screen (NBA)
  - Yellow card → like a technical foul (NBA) or unsportsmanlike conduct (NFL)
  - Corner kick → like inbounding from the baseline after a defensive save
  - VAR review → like NFL instant replay with the ref going under the hood
  - Goalkeeper → last-line free safety who can use their hands (NFL)
- Keep responses under 150 words
- Never fabricate statistics

TONE CALIBRATION EXAMPLES:
Low intensity: "France are building from the back — resetting possession after that last attack."
High intensity: "Huge moment — Argentina just had a goal ruled out via VAR in the 87th minute. Like a Super Bowl touchdown reversed by replay with 2 minutes left."
Critical pressure: "Argentina are running out of time — they need a goal in the next few minutes or their World Cup is over. Every attack counts now."`;

    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 250,
      system: systemPrompt,
      messages,
    });

    res.json({ reply: response.content[0].text, matchContext: activeMatch });
  } catch (error) {
    console.error('Companion error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
