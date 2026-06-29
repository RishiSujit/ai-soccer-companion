const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { client } = require('../lib/anthropic');
const { retrieve } = require('../lib/rag');
const { getLiveMatchContext } = require('../lib/sports-api');
const {
  getMatchEvents,
  getMatchLineups,
  getHistoryMatches,
  getStandings,
} = require('../lib/livescoreApi');

// Load squads once at startup — built from real API lineup data for all 48 teams
let SQUADS = {};
try {
  SQUADS = JSON.parse(fs.readFileSync(path.join(__dirname, '../knowledge-base/squads.json'), 'utf8'));
} catch (e) {
  console.warn('squads.json not found — squad context will be empty');
}

// ── System prompt template ────────────────────────────────────────────────────

const COMPANION_SYSTEM_PROMPT_TEMPLATE = `You are an AI soccer companion helping a casual American fan enjoy a live World Cup 2026 match.

USER SPORTS CONTEXT:
{USER_CONTEXT}

{MATCH_CONTEXT}

{LINEUP_CONTEXT}

{SQUAD_CONTEXT}

{STANDINGS_CONTEXT}

{HISTORY_CONTEXT}

RELEVANT KNOWLEDGE:
{RETRIEVED_KNOWLEDGE}

⚠️ GROUND TRUTH OVERRIDE — READ THIS FIRST:
The 2026 World Cup is happening RIGHT NOW. Your training data contains simulated/predicted results that ARE WRONG. The ACTUAL results are injected above from the live API. Always defer to injected data over training knowledge.

STRICT RULES:
- Match results → use ONLY "COMPLETED TOURNAMENT MATCHES" above. If a score there differs from what you remember from training, the injected score is CORRECT.
- Standings/points → use ONLY "CURRENT TOURNAMENT STANDINGS" above.
- Lineups → use ONLY "OFFICIAL STARTING LINEUPS" above. Never guess who started.
- Live goals/cards → use ONLY "MATCH EVENTS" appended at the end of this prompt.
- PENALTY SHOOTOUT → use ONLY the "PENALTY SCORE" and "WINNER ON PENALTIES" lines in the LIVE MATCH section above. NEVER predict, recall, or guess the shootout outcome from training knowledge.
- If a team or match isn't in the injected data, say "I don't have that result yet" — do not fabricate.
- NEVER use training knowledge to override injected API data on any 2026 WC fact.

PLAYER CONTEXT QUESTIONS:
When asked about a player's general profile, playing style, or background (not lineup status):
- Use your training knowledge — you know these players well
- Be specific: position, club, nationality, playing style
- For lineup/starting status: ALWAYS defer to OFFICIAL STARTING LINEUPS above

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

// ── Context builders ──────────────────────────────────────────────────────────

function buildLineupContext(lineupData) {
  if (!lineupData?.lineup) return 'OFFICIAL STARTING LINEUPS: Not yet released for this match.';

  const { home, away } = lineupData.lineup;
  const formatTeam = (teamData) => {
    if (!teamData?.players?.length) return `${teamData?.team?.name || 'Team'}: Lineup data unavailable`;

    const starters = teamData.players
      .filter(p => p.substitution === '0')
      .sort((a, b) => {
        const order = { GK: 0, DF: 1, MF: 2, FW: 3 };
        return (order[a.position] ?? 4) - (order[b.position] ?? 4);
      });
    const subs = teamData.players.filter(p => p.substitution === '1');

    const byPos = {};
    starters.forEach(p => {
      if (!byPos[p.position]) byPos[p.position] = [];
      byPos[p.position].push(`${p.name}(#${p.shirt_number})`);
    });

    const posOrder = ['GK', 'DF', 'MF', 'FW'];
    const lineStr = posOrder
      .filter(pos => byPos[pos])
      .map(pos => `${pos}: ${byPos[pos].join(', ')}`)
      .join(' | ');

    const subsStr = subs.length ? subs.map(p => p.name).join(', ') : 'None listed';
    return `${teamData.team.name} (${teamData.formation || 'formation TBD'}):\n  Starters — ${lineStr}\n  Bench — ${subsStr}`;
  };

  return `OFFICIAL STARTING LINEUPS (confirmed — use ONLY these for lineup/starter questions):
${formatTeam(home)}

${formatTeam(away)}`;
}

function buildHistoryContext(homeTeam, awayTeam, allHistory) {
  if (!allHistory?.length) return '';

  // Sort by date ascending so results are in chronological order
  const sorted = [...allHistory].sort((a, b) => a.date.localeCompare(b.date));

  // Compact format: all matches (the prompt can handle ~4k chars for 72 matches)
  const lines = sorted
    .map(m => `  ${m.date}: ${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam}`)
    .join('\n');

  let context = `COMPLETED TOURNAMENT MATCHES — ACTUAL RESULTS FROM LIVE API (these scores are correct; your training data scores may differ and are WRONG):\n${lines}`;

  // Also highlight the specific match teams' results for easy reference
  if (homeTeam || awayTeam) {
    const relevant = sorted.filter(m =>
      m.homeTeam === homeTeam || m.awayTeam === homeTeam ||
      m.homeTeam === awayTeam || m.awayTeam === awayTeam
    );
    if (relevant.length) {
      const relLines = relevant
        .map(m => `  ${m.date}: ${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam}`)
        .join('\n');
      context += `\n\nTHIS MATCH'S TEAMS — PREVIOUS RESULTS (for quick reference):\n${relLines}`;
    }
  }

  return context;
}

function buildStandingsContext(standingsData, teamNames) {
  if (!standingsData?.table?.length) return '';

  // Group rows by group letter
  const groups = {};
  standingsData.table.forEach(row => {
    const g = row.group_name;
    if (!groups[g]) groups[g] = [];
    groups[g].push(row);
  });
  Object.keys(groups).forEach(g => {
    groups[g].sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
  });

  // If teams are specified, highlight their groups first; otherwise show all
  const allGroupLetters = Object.keys(groups).sort();
  let prioritized = allGroupLetters;
  if (teamNames?.length) {
    const teamGroupLetters = new Set();
    standingsData.table.forEach(row => {
      if (teamNames.some(t => t && row.name.toLowerCase().includes(t.split(' ')[0].toLowerCase()))) {
        teamGroupLetters.add(row.group_name);
      }
    });
    prioritized = [
      ...teamGroupLetters,
      ...allGroupLetters.filter(g => !teamGroupLetters.has(g)),
    ];
  }

  const lines = prioritized.filter(g => groups[g]).map(g => {
    const rows = groups[g].map(r => {
      const gdNum = parseInt(r.goal_diff || '0');
      const gd = gdNum >= 0 ? `+${gdNum}` : `${gdNum}`;
      return `${r.rank}.${r.name}(${r.points}pts,${gd}GD,${r.won}W-${r.drawn}D-${r.lost}L)`;
    }).join(' | ');
    return `  Group ${g}: ${rows}`;
  });

  return `CURRENT TOURNAMENT STANDINGS — GROUND TRUTH (use for all points/ranking questions):\n${lines.join('\n')}`;
}

function buildSquadContext(homeTeam, awayTeam) {
  const teams = [homeTeam, awayTeam].filter(Boolean);
  if (!teams.length || !Object.keys(SQUADS).length) return '';

  const sections = teams.map(team => {
    const squad = SQUADS[team];
    if (!squad?.players?.length) return null;

    const byPos = { GK: [], DF: [], MF: [], FW: [], Unknown: [] };
    squad.players.forEach(p => {
      const pos = p.position && byPos[p.position] ? p.position : 'Unknown';
      byPos[pos].push(`${p.name}(#${p.num})`);
    });

    const posOrder = ['GK', 'DF', 'MF', 'FW', 'Unknown'];
    const lines = posOrder
      .filter(pos => byPos[pos].length)
      .map(pos => `    ${pos}: ${byPos[pos].join(', ')}`);

    return `  ${team} (${squad.formation || 'formation varies'}):\n${lines.join('\n')}`;
  }).filter(Boolean);

  if (!sections.length) return '';
  return `FULL TOURNAMENT SQUAD ROSTERS — these are players who actually appeared in the 2026 World Cup (confirmed from match data):\n${sections.join('\n\n')}`;
}

// ── Existing helpers ──────────────────────────────────────────────────────────

function parseCompanionResponse(rawText) {
  try {
    const factMarker = '[FACT]';
    const analogyMarker = '[ANALOGY]';
    const followUpsMarker = '[FOLLOW_UPS]';

    const factIdx = rawText.indexOf(factMarker);
    const analogyIdx = rawText.indexOf(analogyMarker);
    const followUpsIdx = rawText.indexOf(followUpsMarker);

    if (factIdx === -1) {
      const oldIdx = rawText.indexOf(followUpsMarker);
      if (oldIdx === -1) return { coreAnswer: rawText.trim(), analogy: null, followUps: [] };
      let followUps = [];
      try { followUps = JSON.parse(rawText.substring(oldIdx + followUpsMarker.length).trim()); } catch(e) {}
      return { coreAnswer: rawText.substring(0, oldIdx).trim(), analogy: null, followUps };
    }

    const factEnd = analogyIdx !== -1 ? analogyIdx : followUpsIdx !== -1 ? followUpsIdx : rawText.length;
    const coreAnswer = rawText.substring(factIdx + factMarker.length, factEnd).trim();

    let analogy = null;
    if (analogyIdx !== -1) {
      const analogyEnd = followUpsIdx !== -1 ? followUpsIdx : rawText.length;
      const analogyText = rawText.substring(analogyIdx + analogyMarker.length, analogyEnd).trim();
      if (analogyText.length > 10) analogy = analogyText;
    }

    let followUps = ['Tell me more', 'Why does this matter?', 'What happens next?'];
    if (followUpsIdx !== -1) {
      try {
        const parsed = JSON.parse(rawText.substring(followUpsIdx + followUpsMarker.length).trim());
        if (Array.isArray(parsed) && parsed.length >= 3) followUps = parsed.slice(0, 3);
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
    'why was that', 'why did', 'what happened with', 'why is he off',
    'why were they', 'red card', 'why ruled out', 'why disallowed',
    'why no goal', 'var review', 'var check', 'offside call',
    'penalty reason', 'why a penalty', 'what was the foul',
    'why did they stop', 'explain that call', 'what just happened',
    'why is everyone',
  ];
  if (incidentKeywords.some(k => msg.includes(k))) return true;
  if (matchContext?.events?.length > 0) {
    const currentMinute = matchContext.minute || 0;
    const recentDramatic = matchContext.events.some(e => {
      const elapsed = e.time?.elapsed || 0;
      return elapsed >= currentMinute - 10 && ['Red Card', 'VAR', 'Missed Penalty'].includes(e.type);
    });
    if (recentDramatic) return true;
  }
  return false;
}

function buildUserContextString(userContext) {
  if (!userContext || !userContext.knownSports?.length) return 'No user sports context available.';
  const sports = userContext.knownSports.join(', ');
  const teams = userContext.favoriteTeams?.length ? `Favorite teams: ${userContext.favoriteTeams.join(', ')}.` : '';
  return `This user follows ${sports}. ${teams} Always use analogies from these sports when explaining soccer concepts.`;
}

function buildMatchContextString(matchContext) {
  if (!matchContext) return 'MATCH CONTEXT: No live match data available.';

  const {
    homeTeam, awayTeam, homeScore, awayScore, minute, timeStr, stage, venue,
    kickoffET, derivedSignals, recentEventsText, stats,
    isPenaltyShootout, isExtraTime, psScoreHome, psScoreAway, psWinner, etScore,
  } = matchContext;

  const scoreStr = (homeScore !== null && awayScore !== null) ? `${homeScore} - ${awayScore}` : 'Not started';

  // Time display
  let timeDisplay;
  if (isPenaltyShootout) timeDisplay = 'PENALTY SHOOTOUT (AP)';
  else if (isExtraTime) timeDisplay = `Extra Time (${minute}')`;
  else if (minute != null) timeDisplay = `${minute}'`;
  else timeDisplay = 'Not started';

  let context = `LIVE MATCH:
${homeTeam} ${scoreStr} ${awayTeam}
Time: ${timeDisplay}
Stage: ${stage || 'Unknown'}`;

  if (venue) context += `\nVenue: ${venue}`;
  if (kickoffET && minute == null && !isPenaltyShootout) context += `\nKickoff: ${kickoffET}`;

  if (isPenaltyShootout) {
    context += `\n\n⚽ PENALTY SHOOTOUT IN PROGRESS / COMPLETE:`;
    if (etScore) context += `\nFull-time / Extra time score: ${etScore}`;
    if (psScoreHome != null && psScoreAway != null) {
      context += `\nPENALTY SCORE: ${homeTeam} ${psScoreHome} – ${psScoreAway} ${awayTeam}`;
    }
    if (psWinner) context += `\nWINNER ON PENALTIES: ${psWinner}`;
    context += `\n⚠ USE PENALTY SCORE ABOVE FOR ANY OUTCOME QUESTIONS. Do not guess from training knowledge.`;
  } else if (isExtraTime) {
    context += `\n(Match in extra time — this goes 2 × 15-minute periods before potential penalties)`;
  }

  if (recentEventsText && recentEventsText !== 'No events yet') {
    context += `\n\nRECENT EVENTS (last 5 — team attribution is authoritative):\n${recentEventsText}`;
  }

  if (stats?.possession) {
    context += `\n\nMATCH STATS:\nPossession: ${homeTeam} ${stats.possession.home}% vs ${awayTeam} ${stats.possession.away}%\nShots: ${homeTeam} ${stats.shots?.home || 0} vs ${awayTeam} ${stats.shots?.away || 0}`;
  }

  if (derivedSignals) {
    context += `\n\nMATCH INTELLIGENCE (calibrate your response energy to these signals):
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
- Match your energy to the moment`;
  }

  return context;
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [], matchContext, userContext } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const matchId = matchContext?.matchId || matchContext?.id;
    const homeTeam = matchContext?.homeTeam;
    const awayTeam = matchContext?.awayTeam;

    // Fetch all context in parallel — cached by livescoreApi layer (5 min TTL)
    const [liveContext, retrievedKnowledge, lineupData, allHistory, standingsData] = await Promise.all([
      getLiveMatchContext().catch(() => null),
      Promise.resolve(retrieve(message, 5)),
      matchId ? getMatchLineups(matchId).catch(() => null) : Promise.resolve(null),
      getHistoryMatches('2026-06-11', today).catch(() => []),
      getStandings().catch(() => null),
    ]);

    const activeMatch = matchContext || liveContext;
    const isLiveMode = !!(matchContext || liveContext?.homeTeam);
    const activeMatchId = matchId || activeMatch?.matchId || activeMatch?.id;

    // ── Event context: all significant events (goals, cards, subs, VAR) ──────
    let eventsContext = activeMatch?.recentEventsText || '';
    if ((!eventsContext || eventsContext === 'No events yet') && activeMatchId) {
      try {
        const events = await getMatchEvents(activeMatchId);
        if (events?.length) {
          const SIGNIFICANT = ['GOAL', 'GOAL_PENALTY', 'OWN_GOAL', 'RED_CARD', 'YELLOW_CARD', 'SUBSTITUTION', 'VAR', 'MISSED_PENALTY', 'PENALTY_MISSED'];
          eventsContext = events
            .filter(e => SIGNIFICANT.includes(e.type))
            .slice(-20)
            .map(e => {
              const team = e.isHome ? (activeMatch?.homeTeam || 'home') : (activeMatch?.awayTeam || 'away');
              const assist = e.assist ? ` (${e.type === 'SUBSTITUTION' ? 'ON: ' : 'assist: '}${e.assist})` : '';
              const label = e.label || e.type || 'Event';
              const playerName = e.player?.name || 'Unknown';
              return `${e.minute}' ${label}: ${playerName}${assist} (${team})`;
            }).join('\n');
        }
      } catch (err) {
        console.error('[Companion] Events error:', err.message);
      }
    }

    const useWebSearch = shouldEnableWebSearch(message, isLiveMode ? activeMatch : null);
    if (useWebSearch) console.log('[Companion] Web search enabled for:', message.slice(0, 60));

    // ── Build system prompt with all injected data ─────────────────────────
    const teamNames = [homeTeam, awayTeam].filter(Boolean);
    let systemPrompt = COMPANION_SYSTEM_PROMPT_TEMPLATE
      .replace('{USER_CONTEXT}', buildUserContextString(userContext))
      .replace('{MATCH_CONTEXT}', buildMatchContextString(activeMatch))
      .replace('{LINEUP_CONTEXT}', buildLineupContext(lineupData))
      .replace('{SQUAD_CONTEXT}', buildSquadContext(homeTeam, awayTeam))
      .replace('{STANDINGS_CONTEXT}', buildStandingsContext(standingsData, teamNames))
      .replace('{HISTORY_CONTEXT}', buildHistoryContext(homeTeam, awayTeam, allHistory))
      .replace('{RETRIEVED_KNOWLEDGE}', retrievedKnowledge);

    // Append events as immutable ground truth (overrides training knowledge for this match)
    if (eventsContext && eventsContext !== 'No events yet' && eventsContext !== 'Match has not started yet') {
      systemPrompt += `\n\nMATCH EVENTS — ABSOLUTE GROUND TRUTH (highest priority — overrides all other sources):\n${eventsContext}\n\nEVENT RULES:\n- Use ONLY the above for who scored, when, and who assisted\n- Never invent or guess goal scorers, times, or assists\n- For substitutions: the first player listed came OFF, the player after "ON:" came ON\n- If asked who scored, answer using these events only`;
    }

    if (useWebSearch) {
      systemPrompt += `\n\nWEB SEARCH AVAILABLE:\nYou have access to web search for specific incidents (red cards, VAR decisions, disallowed goals).\nSearch format: "[player name] [event type] [home team] [away team] 2026 reason"\nThen explain in plain English under 130 words.`;
    }

    const messages = [
      ...conversationHistory.slice(-6),
      { role: 'user', content: message },
    ];

    const apiParams = {
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    };

    if (useWebSearch) {
      apiParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
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
