const express = require('express');
const router = express.Router();
const { client } = require('../lib/anthropic');

const cardCache = {};

function buildUserSportsLine(userContext) {
  if (!userContext?.knownSports?.length) return '';
  const sports = userContext.knownSports.join(' and ');
  return `The user follows ${sports}. Write the insight field using analogies specifically from these sports.`;
}

function buildPrompt(playerName, team, position, realData, userContext) {
  const sportsLine = buildUserSportsLine(userContext);

  if (realData) {
    return `You are generating a FIFA Ultimate Team style player card for ${playerName} who plays for ${team} as a ${position}.

Here are their real statistics:
${JSON.stringify(realData, null, 2)}
${sportsLine ? `\n${sportsLine}` : ''}

Generate a JSON object with exactly these fields:
{
  "rating": <overall 0-99 number>,
  "tier": <"gold" if rating 88+, "silver" if 78-87, "bronze" if below 78>,
  "pace": <0-99>,
  "dribbling": <0-99>,
  "shooting": <0-99>,
  "passing": <0-99>,
  "vision": <0-99>,
  "defending": <0-99>,
  "traits": [<2-3 short trait strings, max 12 chars each>],
  "insight": <1-2 sentence plain English explanation of this player using an American sports analogy. Written for someone who has never watched soccer.>,
  "club": <club name string>,
  "age": <number>,
  "worldCupStats": <1 sentence about their World Cup history or what to watch for in 2026>
}

Base the ratings on the real statistics provided.
Derive pace from dribble attempts and position.
Derive vision from key passes and pass accuracy.
Respond with ONLY the JSON object. No preamble, no markdown, no backticks.`;
  }

  return `You are generating a FIFA Ultimate Team style player card for ${playerName} who plays for ${team} as a ${position}.

No live stats are available yet (pre-tournament). Use your knowledge of this player to generate the card.
${sportsLine ? `\n${sportsLine}` : ''}

Generate a JSON object with exactly these fields:
{
  "rating": <overall 0-99>,
  "tier": <"gold" if 88+, "silver" 78-87, "bronze" below 78>,
  "pace": <0-99>,
  "dribbling": <0-99>,
  "shooting": <0-99>,
  "passing": <0-99>,
  "vision": <0-99>,
  "defending": <0-99>,
  "traits": [<2-3 short trait strings, max 12 chars each>],
  "insight": <1-2 sentence plain English explanation using an American sports analogy for a casual fan>,
  "club": <club name>,
  "age": <number>,
  "worldCupStats": <1 sentence about World Cup history or 2026 potential>
}

Respond with ONLY the JSON object. No preamble, no markdown, no backticks.`;
}

async function generateCard(prompt) {
  const cardResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = cardResponse.content[0].text;
  const clean = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(clean);
}

router.post('/', async (req, res) => {
  const { playerName, team, position, season, userContext } = req.body;

  if (!playerName || !team) {
    return res.status(400).json({ error: 'playerName and team are required' });
  }

  const cacheKey = `${playerName}-${team}`;
  if (cardCache[cacheKey]) {
    return res.json({
      success: true,
      card: cardCache[cacheKey].card,
      fromCache: true,
    });
  }

  const prompt = buildPrompt(playerName, team, position || 'player', null, userContext);

  let cardData;
  try {
    cardData = await generateCard(prompt);
  } catch (firstError) {
    console.error('Card generation attempt 1 failed:', firstError.message);
    try {
      const strictPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON. No text before or after the JSON object.`;
      cardData = await generateCard(strictPrompt);
    } catch (secondError) {
      console.error('Card generation attempt 2 failed:', secondError.message);
      return res.status(500).json({
        error: 'Failed to generate player card. Please try again.',
      });
    }
  }

  cardCache[cacheKey] = { card: cardData };

  return res.json({
    success: true,
    card: cardData,
    fromCache: false,
  });
});

module.exports = router;
