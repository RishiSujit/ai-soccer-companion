const express = require('express');
const router = express.Router();
const { client } = require('../lib/anthropic');
const { retrieve } = require('../lib/rag');
const { getLiveMatchContext } = require('../lib/sports-api');
const { getMatchEvents } = require('../lib/livescoreApi');

const COMPANION_SYSTEM_PROMPT_TEMPLATE = `You are an AI soccer companion helping a casual American fan enjoy a live World Cup 2026 match.

USER SPORTS CONTEXT:
{USER_CONTEXT}

{MATCH_CONTEXT}

RELEVANT KNOWLEDGE:
{RETRIEVED_KNOWLEDGE}

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
- Keep the core answer under 100 words
- Never fabricate statistics

BETTING ODDS CONTEXT:
When a user asks about odds, win probability, or "what are the chances":
- Frame it as "what the market thinks" — never say "bet on X" or "good value"
- Explain American odds simply: −140 means bet $140 to win $100 · +120 means bet $100 to win $120
- Win probability percentages = implied odds averaged across sportsbooks, not a guarantee
- Always educational framing — you are a sports analyst, not a bookie

TONE CALIBRATION EXAMPLES:
Low intensity: "France are building from the back — resetting possession after that last attack."
High intensity: "Huge moment — Argentina just had a goal ruled out via VAR in the 87th minute. Like a Super Bowl touchdown reversed by replay with 2 minutes left."
Critical pressure: "Argentina are running out of time — they need a goal in the next few minutes or their World Cup is over. Every attack counts now."

OUTPUT FORMAT — you MUST follow this exactly:

[FACT]
Your direct answer in plain English. 2-3 sentences maximum.

[ANALOGY]
Think of it like [X] — [one sentence].
Only include this section when a sports analogy genuinely helps. Skip it entirely for live match updates where context is already clear.

[FOLLOW_UPS]
["pill 1", "pill 2", "pill 3"]

Example (rule question):
[FACT]
A penalty is a free shot from 12 yards after a foul inside the box. Just the goalkeeper to beat — no other defenders allowed.

[ANALOGY]
Think of it like a free throw after a shooting foul — high percentage but the pressure is enormous.

[FOLLOW_UPS]
["How often do penalties score?", "What counts as a foul in the box?", "What's a penalty shootout?"]

Example (live match update):
[FACT]
Argentina are in control. France need two goals in 10 minutes — they're pushing everyone forward now and leaving space at the back.

[FOLLOW_UPS]
["What if France score?", "What are the comeback odds?", "Who's most likely to score?"]`;

function parseCompanionResponse(rawText) {
  try {
    const factMarker = '[FACT]';
    const analogyMarker = '[ANALOGY]';
    const followUpsMarker = '[FOLLOW_UPS]';

    const factIdx = rawText.indexOf(factMarker);
    const analogyIdx = rawText.indexOf(analogyMarker);
    const followUpsIdx = rawText.indexOf(followUpsMarker);

    // No [FACT] marker — old format fallback
    if (factIdx === -1) {
      const oldIdx = rawText.indexOf(followUpsMarker);
      if (oldIdx === -1) {
        return { coreAnswer: rawText.trim(), analogy: null, followUps: [] };
      }
      let followUps = [];
      try {
        followUps = JSON.parse(rawText.substring(oldIdx + followUpsMarker.length).trim());
      } catch(e) {}
      return {
        coreAnswer: rawText.substring(0, oldIdx).trim(),
        analogy: null,
        followUps,
      };
    }

    // Get fact
    const factEnd = analogyIdx !== -1
      ? analogyIdx
      : followUpsIdx !== -1
        ? followUpsIdx
        : rawText.length;
    const coreAnswer = rawText.substring(factIdx + factMarker.length, factEnd).trim();

    // Get analogy (optional)
    let analogy = null;
    if (analogyIdx !== -1) {
      const analogyEnd = followUpsIdx !== -1 ? followUpsIdx : rawText.length;
      const analogyText = rawText.substring(analogyIdx + analogyMarker.length, analogyEnd).trim();
      if (analogyText.length > 10) {
        analogy = analogyText;
      }
    }

    // Get follow-ups
    let followUps = ['Tell me more', 'Why does this matter?', 'What happens next?'];
    if (followUpsIdx !== -1) {
      try {
        const parsed = JSON.parse(rawText.substring(followUpsIdx + followUpsMarker.length).trim());
        if (Array.isArray(parsed) && parsed.length >= 3) {
          followUps = parsed.slice(0, 3);
        }
      } catch(e) {}
    }

    return { coreAnswer, analogy, followUps };

  } catch(err) {
    return { coreAnswer: rawText.trim(), analogy: null, followUps: [] };
  }
}

function shouldEnableWebSearch(message, matchContext) {
  if (!message) return false;

  const msg = message.toLowerCase();

  const incidentKeywords = [
    'why was that',
    'why did',
    'what happened with',
    'why is he off',
    'why were they',
    'red card',
    'why ruled out',
    'why disallowed',
    'why no goal',
    'var review',
    'var check',
    'offside call',
    'penalty reason',
    'why a penalty',
    'what was the foul',
    'why did they stop',
    'explain that call',
    'what just happened',
    'why is everyone',
  ];

  const hasIncidentQuestion = incidentKeywords.some(k => msg.includes(k));
  if (hasIncidentQuestion) return true;

  if (matchContext?.events?.length > 0) {
    const currentMinute = matchContext.minute || 0;
    const recentDramatic = matchContext.events.some(e => {
      const elapsed = e.time?.elapsed || 0;
      const isRecent = elapsed >= currentMinute - 10;
      const isDramatic = ['Red Card', 'VAR', 'Missed Penalty'].includes(e.type);
      return isRecent && isDramatic;
    });
    if (recentDramatic) return true;
  }

  return false;
}

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
    minute, stage, venue, kickoffET, derivedSignals, recentEventsText, stats,
  } = matchContext;

  const scoreStr = (homeScore !== null && awayScore !== null)
    ? `${homeScore} - ${awayScore}`
    : 'Not started';

  let context = `LIVE MATCH:
${homeTeam} ${scoreStr} ${awayTeam}
Minute: ${minute != null ? minute + "'" : 'Not started'}
Stage: ${stage || 'Unknown'}
`;

  if (venue) context += `Venue: ${venue}\n`;
  if (kickoffET && minute == null) context += `Kickoff: ${kickoffET}\n`;


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

    const isLiveMode = !!(matchContext || liveContext?.homeTeam);

    // Fetch live events directly — frontend matchContext never carries recentEventsText
    let eventsContext = activeMatch?.recentEventsText || liveContext?.recentEventsText || '';
    if ((!eventsContext || eventsContext === 'No events yet') && activeMatch?.isLive === true) {
      const matchId = activeMatch?.matchId || activeMatch?.id;
      if (matchId) {
        try {
          const events = await getMatchEvents(matchId);
          if (events?.length) {
            eventsContext = events
              .slice(-10)
              .map(e => `${e.minute}' — ${e.type}: ${e.player?.name || 'Unknown'}`)
              .join('\n');
          }
        } catch (err) {
          console.error('[Companion] Events error:', err.message);
        }
      }
    }

    const useWebSearch = shouldEnableWebSearch(
      message,
      isLiveMode ? activeMatch : null
    );

    if (useWebSearch) {
      console.log('[Companion] Web search enabled for:', message.slice(0, 60));
    }

    let systemPrompt = COMPANION_SYSTEM_PROMPT_TEMPLATE
      .replace('{USER_CONTEXT}', buildUserContextString(userContext))
      .replace('{MATCH_CONTEXT}', buildMatchContextString(activeMatch))
      .replace('{RETRIEVED_KNOWLEDGE}', retrievedKnowledge);

    if (eventsContext && eventsContext !== 'No events yet' && eventsContext !== 'Match has not started yet') {
      systemPrompt += `\n\nMATCH EVENTS (real data — treat as ground truth):\n${eventsContext}\n\nCRITICAL: Use these events as fact. Do NOT rely on training knowledge for scorers or timing. If events say Quinones scored in 9', that is what happened.`;
    }

    if (useWebSearch) {
      systemPrompt += `

WEB SEARCH AVAILABLE:
You have access to web search.
For questions about specific incidents (red cards, VAR decisions, disallowed goals, penalties) search for the specific event to find journalist reporting on WHY it happened.

Search query format: "[player name] [event type] [home team] [away team] 2026 reason"

Then explain the real reason to Sam using your normal style — plain English, sports analogy, under 130 words.
`;
    }

    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const apiParams = {
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    };

    if (useWebSearch) {
      apiParams.tools = [{
        type: 'web_search_20250305',
        name: 'web_search',
      }];
    }

    const response = await client.messages.create(apiParams);

    const rawResponse = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    if (!rawResponse) {
      console.error('[Companion] No text in response:', JSON.stringify(response.content.map(b => b.type)));
      return res.status(500).json({ error: 'No response generated' });
    }

    const { coreAnswer, analogy, followUps } = parseCompanionResponse(rawResponse);

    res.json({
      reply: coreAnswer,
      analogy: analogy || null,
      followUps,
      matchContext: isLiveMode ? activeMatch : null,
      signals: activeMatch?.derivedSignals || null,
      mode: isLiveMode ? 'live' : 'general',
    });
  } catch (error) {
    console.error('Companion error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
