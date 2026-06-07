const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function fetchFinishedFixtures(date) {
  const res = await axios.get(`${BASE_URL}/fixtures`, {
    params: {
      league: process.env.ACTIVE_LEAGUE_ID || 1,
      season: process.env.ACTIVE_SEASON || 2026,
      date,
      status: 'FT-AET-PEN-AWD-WO',
    },
    headers: { 'x-apisports-key': API_KEY },
  });
  return res.data.response || [];
}

function buildActualResults(fixtures, card) {
  const results = {};
  let totalGoals = 0;
  const matchGoals = {};

  fixtures.forEach(m => {
    const home = m.teams.home.name;
    const away = m.teams.away.name;
    const homeGoals = m.goals.home ?? 0;
    const awayGoals = m.goals.away ?? 0;
    const goals = homeGoals + awayGoals;

    totalGoals += goals;
    matchGoals[`${home} vs ${away}`] = goals;

    results[`${home}_result`] =
      homeGoals > awayGoals ? 'home' :
      awayGoals > homeGoals ? 'away' : 'draw';
    results[`${away}_result`] =
      homeGoals > awayGoals ? 'home' :
      awayGoals > homeGoals ? 'away' : 'draw';
  });

  const mostGoalsEntry = Object.entries(matchGoals)
    .sort((a, b) => b[1] - a[1])[0];

  results.totalGoals = totalGoals;
  results.mostGoalsMatch = mostGoalsEntry?.[0] || null;
  results.matchGoals = matchGoals;
  // Red card detection requires events API — not implemented in v1
  results.hasRedCard = false;

  const fm = card?.feature_match;
  if (fm) {
    const fmFixture = fixtures.find(m => {
      const h = m.teams.home.name.toLowerCase();
      const a = m.teams.away.name.toLowerCase();
      const fmH = fm.homeTeam.toLowerCase();
      const fmA = fm.awayTeam.toLowerCase();
      return h.includes(fmH) || fmH.includes(h) ||
             a.includes(fmA) || fmA.includes(a);
    });

    if (fmFixture) {
      const h = fmFixture.goals.home ?? 0;
      const a = fmFixture.goals.away ?? 0;
      results.featureResult =
        h > a ? `${fm.homeTeam} win` :
        a > h ? `${fm.awayTeam} win` : 'Draw';
      results.featureGoals = h + a;
    }
  }

  return results;
}

function calculatePoints(answers, bonusTaken, results, card) {
  let total = 0;
  const breakdown = {};

  (card.daily_questions || []).forEach(q => {
    const userAnswer = answers?.[q.id];
    if (!userAnswer) {
      breakdown[q.id] = { answer: null, correct: false, points: 0 };
      return;
    }

    let correct = false;
    if (q.id === 'dq1') {
      correct = (userAnswer === 'Yes') === results.hasRedCard;
    } else if (q.id === 'dq2') {
      const g = results.totalGoals;
      correct = (
        (userAnswer === '0-3' && g <= 3) ||
        (userAnswer === '4-6' && g >= 4 && g <= 6) ||
        (userAnswer === '7-9' && g >= 7 && g <= 9) ||
        (userAnswer === '10+' && g >= 10)
      );
    } else if (q.id === 'dq3') {
      correct = userAnswer === results.mostGoalsMatch;
    }

    const pts = correct ? (q.points || 0) : 0;
    total += pts;
    breakdown[q.id] = { answer: userAnswer, correct, points: pts };
  });

  (card.feature_match?.props || []).forEach(p => {
    const userAnswer = answers?.[p.id];
    if (!userAnswer) {
      breakdown[p.id] = { answer: null, correct: false, points: 0 };
      return;
    }

    let correct = false;
    if (p.id === 'fm1') {
      correct = userAnswer === results.featureResult;
    } else if (p.id === 'fm3') {
      const g = results.featureGoals ?? 0;
      correct = (
        (userAnswer === '0-1' && g <= 1) ||
        (userAnswer === '2-3' && g >= 2 && g <= 3) ||
        (userAnswer === '4+' && g >= 4)
      );
    }
    // fm2 (player prop) requires events API — skip in v1

    const pts = correct ? (p.points || 0) : 0;
    total += pts;
    breakdown[p.id] = { answer: userAnswer, correct, points: pts };
  });

  if (bonusTaken && answers?.['bonus1']) {
    const bonusCorrect = answers['bonus1'] === 'Yes' &&
      answers['fm1'] === results.featureResult;
    const bonusPts = bonusCorrect ? 10 : 0;
    total += bonusPts;
    breakdown.bonus1 = {
      answer: answers['bonus1'],
      correct: bonusCorrect,
      points: bonusPts,
    };
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

  let fixtures;
  try {
    fixtures = await fetchFinishedFixtures(date);
  } catch (err) {
    console.error('[ScoringEngine] API-Football fetch failed:', err.message);
    return { scored: 0, skipped: 'api_error' };
  }

  const expectedCount = (card.matches || []).length;
  if (fixtures.length < expectedCount) {
    console.log(
      `[ScoringEngine] ${fixtures.length}/${expectedCount} matches finished — waiting`
    );
    return { scored: 0, skipped: 'matches_pending' };
  }

  const actualResults = buildActualResults(fixtures, card);
  console.log('[ScoringEngine] Results:', JSON.stringify(actualResults));

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
