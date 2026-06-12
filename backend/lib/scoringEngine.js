const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { getHistoryMatches, getMatchEvents } = require('./livescoreApi');

// Fuzzy match: checks if two team names refer to the same team
function fuzzyTeamMatch(a, b) {
  if (!a || !b) return false;
  const norm = s => s.toLowerCase().trim();
  const an = norm(a), bn = norm(b);
  if (an === bn) return true;
  // Partial: one name contains the first word of the other
  const aFirst = an.split(' ')[0];
  const bFirst = bn.split(' ')[0];
  return an.includes(bFirst) || bn.includes(aFirst);
}

async function buildActualResults(matches, card) {
  const results = {};
  let totalGoals = 0;
  const matchGoals = {};

  for (const m of matches) {
    const goals = m.homeScore + m.awayScore;
    totalGoals += goals;

    // Use card's team name for the key so dq3 options match exactly
    const cardMatch = (card.matches || []).find(cm =>
      fuzzyTeamMatch(cm.homeTeam, m.homeTeam) && fuzzyTeamMatch(cm.awayTeam, m.awayTeam)
    );
    const matchKey = cardMatch
      ? `${cardMatch.homeTeam} vs ${cardMatch.awayTeam}`
      : `${m.homeTeam} vs ${m.awayTeam}`;

    matchGoals[matchKey] = goals;
    results[`${m.homeTeam}_result`] = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
    results[`${m.awayTeam}_result`] = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
  }

  const mostGoalsEntry = Object.entries(matchGoals).sort((a, b) => b[1] - a[1])[0];
  results.totalGoals = totalGoals;
  results.mostGoalsMatch = mostGoalsEntry?.[0] || null;
  results.matchGoals = matchGoals;
  results.hasRedCard = false;

  // Fetch events for all matches — red cards + feature match player props
  const fm = card?.feature_match;
  for (const m of matches) {
    if (!m.matchId) continue;
    try {
      const events = await getMatchEvents(m.matchId);
      if (events.some(e => e.type === 'RED_CARD')) {
        results.hasRedCard = true;
      }
      // Store feature match events for fm2 / bonus scoring
      if (fm && (fuzzyTeamMatch(m.homeTeam, fm.homeTeam) || fuzzyTeamMatch(m.homeTeam, fm.awayTeam))) {
        results.featureMatchEvents = events;
      }
    } catch (err) {
      console.error('[ScoringEngine] Events fetch error:', err.message);
    }
  }

  // Feature match result and goals
  if (fm) {
    const fmFixture = matches.find(m =>
      fuzzyTeamMatch(m.homeTeam, fm.homeTeam) && fuzzyTeamMatch(m.awayTeam, fm.awayTeam)
    );
    if (fmFixture) {
      const h = fmFixture.homeScore;
      const a = fmFixture.awayScore;
      results.featureResult = h > a ? `${fm.homeTeam} win` : a > h ? `${fm.awayTeam} win` : 'Draw';
      results.featureGoals = h + a;
    }
  }

  return results;
}

function calculatePoints(answers, bonusTaken, results, card) {
  let total = 0;
  const breakdown = {};

  // Daily questions
  for (const q of (card.daily_questions || [])) {
    const userAnswer = answers?.[q.id];
    if (!userAnswer) {
      breakdown[q.id] = { answer: null, correct: false, points: 0 };
      continue;
    }

    let correct = false;
    if (q.id === 'dq1') {
      correct = (userAnswer === 'Yes') === results.hasRedCard;
    } else if (q.id === 'dq2') {
      const g = results.totalGoals;
      correct =
        (userAnswer === '0-3' && g <= 3) ||
        (userAnswer === '4-6' && g >= 4 && g <= 6) ||
        (userAnswer === '7-9' && g >= 7 && g <= 9) ||
        (userAnswer === '10+' && g >= 10);
    } else if (q.id === 'dq3') {
      correct = userAnswer === results.mostGoalsMatch;
    }

    const pts = correct ? (q.points || 0) : 0;
    total += pts;
    breakdown[q.id] = { answer: userAnswer, correct, points: pts };
  }

  // Feature match props
  for (const p of (card.feature_match?.props || [])) {
    const userAnswer = answers?.[p.id];
    if (!userAnswer) {
      breakdown[p.id] = { answer: null, correct: false, points: 0 };
      continue;
    }

    let correct = false;
    if (p.id === 'fm1') {
      correct = userAnswer === results.featureResult;
    } else if (p.id === 'fm2') {
      // Player prop: "Will [Player] score?" — check events
      const events = results.featureMatchEvents || [];
      const match = (p.question || '').toLowerCase().match(/will (.+?) score/);
      if (match && events.length > 0) {
        const lastName = match[1].trim().split(' ').pop().toLowerCase();
        const playerScored = events.some(e =>
          (e.type === 'GOAL' || e.type === 'GOAL_PENALTY' || e.type === 'OWN_GOAL') &&
          (e.player?.name || '').toLowerCase().includes(lastName)
        );
        correct = (userAnswer === 'Yes') === playerScored;
      }
      // If events unavailable, leave correct=false (don't award points on uncertainty)
    } else if (p.id === 'fm3') {
      const g = results.featureGoals ?? 0;
      correct =
        (userAnswer === '0-1' && g <= 1) ||
        (userAnswer === '2-3' && g >= 2 && g <= 3) ||
        (userAnswer === '4+' && g >= 4);
    }

    const pts = correct ? (p.points || 0) : 0;
    total += pts;
    breakdown[p.id] = { answer: userAnswer, correct, points: pts };
  }

  // Bonus: correct if the user took it AND both fm1 and fm2 are correct
  if (bonusTaken) {
    const fm1Correct = breakdown['fm1']?.correct || false;
    const fm2Correct = breakdown['fm2']?.correct;
    // If fm2 couldn't be determined (events unavailable), require only fm1
    const bonusCorrect = fm2Correct !== undefined
      ? fm1Correct && fm2Correct
      : fm1Correct;
    const bonusPts = bonusCorrect ? 10 : 0;
    total += bonusPts;
    breakdown.bonus1 = { answer: 'Yes', correct: bonusCorrect, points: bonusPts };
  }

  return { total, breakdown };
}

async function scoreDate(date) {
  console.log(`\n[ScoringEngine] Scoring ${date}`);

  const { data: card, error: cardErr } = await supabase
    .from('daily_prediction_cards')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (cardErr || !card) {
    console.log(`[ScoringEngine] No card for ${date}`);
    return { scored: 0, skipped: 'no_card' };
  }

  let matches;
  try {
    matches = await getHistoryMatches(date, date);
  } catch (err) {
    console.error('[ScoringEngine] Fetch failed:', err.message);
    return { scored: 0, skipped: 'api_error' };
  }

  const expectedCount = (card.matches || []).length;
  if (matches.length < expectedCount) {
    console.log(`[ScoringEngine] ${matches.length}/${expectedCount} matches finished — waiting`);
    return { scored: 0, skipped: 'matches_pending' };
  }

  const actualResults = await buildActualResults(matches, card);
  console.log('[ScoringEngine] Results:', JSON.stringify({
    totalGoals: actualResults.totalGoals,
    mostGoalsMatch: actualResults.mostGoalsMatch,
    hasRedCard: actualResults.hasRedCard,
    featureResult: actualResults.featureResult,
    featureGoals: actualResults.featureGoals,
  }));

  const { data: predictions } = await supabase
    .from('daily_predictions')
    .select('*')
    .eq('date', date)
    .is('scored_at', null);

  if (!predictions?.length) {
    console.log('[ScoringEngine] No unscored predictions');
    return { scored: 0, skipped: 'none_pending' };
  }

  let scored = 0;
  for (const pred of predictions) {
    const { total, breakdown } = calculatePoints(
      pred.answers,
      pred.bonus_taken,
      actualResults,
      card
    );

    const { error: updateErr } = await supabase
      .from('daily_predictions')
      .update({
        points_earned: total,
        scored_at: new Date().toISOString(),
        actual_results: actualResults,
        score_breakdown: breakdown,
      })
      .eq('id', pred.id);

    if (updateErr) {
      console.error(`[ScoringEngine] Update failed for ${pred.id}:`, updateErr.message);
      continue;
    }

    // Update total_points for every group the user belongs to
    const { data: memberships } = await supabase
      .from('group_members')
      .select('id, total_points')
      .eq('user_id', pred.user_id);

    for (const m of memberships || []) {
      await supabase
        .from('group_members')
        .update({ total_points: (m.total_points || 0) + total })
        .eq('id', m.id);
    }

    console.log(`[ScoringEngine] User ${pred.user_id.slice(0, 8)}: ${total} pts`);
    scored++;
  }

  console.log(`[ScoringEngine] Done — ${scored} predictions scored`);
  return { scored, actualResults };
}

module.exports = { scoreDate, buildActualResults, calculatePoints };
