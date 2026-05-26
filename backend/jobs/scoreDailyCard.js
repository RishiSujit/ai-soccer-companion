const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function scoreCard(date) {
  console.log(`\nScoring card for ${date}`);

  const { data: card } = await supabase
    .from('daily_prediction_cards')
    .select('*')
    .eq('date', date)
    .single();

  if (!card) {
    console.log('No card found for', date);
    return;
  }

  const res = await axios.get(`${BASE_URL}/fixtures`, {
    params: {
      league: process.env.ACTIVE_LEAGUE_ID || 1,
      season: process.env.ACTIVE_SEASON || 2026,
      date,
      status: 'FT',
    },
    headers: { 'x-apisports-key': API_KEY },
  });

  const finishedMatches = res.data.response || [];

  const totalMatches = card.matches.length;
  if (finishedMatches.length < totalMatches) {
    console.log(
      `Only ${finishedMatches.length}/${totalMatches} matches finished — waiting`
    );
    return;
  }

  const results = buildActualResults(finishedMatches, card);

  const { data: predictions } = await supabase
    .from('daily_predictions')
    .select('*')
    .eq('date', date)
    .is('scored_at', null);

  if (!predictions?.length) {
    console.log('No predictions to score');
    return;
  }

  for (const pred of predictions) {
    const points = calculatePoints(pred.answers, pred.bonus_taken, results, card);

    await supabase
      .from('daily_predictions')
      .update({ points_earned: points, scored_at: new Date().toISOString() })
      .eq('id', pred.id);

    await supabase.rpc('increment_user_points', {
      p_user_id: pred.user_id,
      p_points: points,
    });

    console.log(`Scored user ${pred.user_id}: ${points} pts`);
  }

  console.log(`Scored ${predictions.length} predictions`);
}

function buildActualResults(matches, card) {
  const results = {};
  let totalGoals = 0;
  let hasRedCard = false;
  const matchGoals = {};

  matches.forEach(m => {
    const home = m.teams.home.name;
    const away = m.teams.away.name;
    const homeGoals = m.goals.home || 0;
    const awayGoals = m.goals.away || 0;
    const goals = homeGoals + awayGoals;

    totalGoals += goals;
    matchGoals[`${home} vs ${away}`] = goals;

    results[`${home}_result`] =
      homeGoals > awayGoals ? 'home' :
      awayGoals > homeGoals ? 'away' : 'draw';
  });

  const mostGoalsMatch = Object.entries(matchGoals)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  results.totalGoals = totalGoals;
  results.mostGoalsMatch = mostGoalsMatch;
  results.hasRedCard = hasRedCard;
  results.matchGoals = matchGoals;

  const featureMatch = card.feature_match;
  const fm = matches.find(m =>
    m.teams.home.name === featureMatch.homeTeam ||
    m.teams.away.name === featureMatch.homeTeam
  );
  if (fm) {
    const homeGoals = fm.goals.home || 0;
    const awayGoals = fm.goals.away || 0;
    results.featureResult =
      homeGoals > awayGoals ? `${featureMatch.homeTeam} win` :
      awayGoals > homeGoals ? `${featureMatch.awayTeam} win` : 'Draw';
    results.featureGoals = homeGoals + awayGoals;
  }

  return results;
}

function calculatePoints(answers, bonusTaken, results, card) {
  let total = 0;

  card.daily_questions.forEach(q => {
    const userAnswer = answers[q.id];
    if (!userAnswer) return;

    let correct = false;
    if (q.id === 'dq1') {
      correct = (userAnswer === 'Yes') === results.hasRedCard;
    } else if (q.id === 'dq2') {
      const goals = results.totalGoals;
      correct = (
        (userAnswer === '0-3' && goals <= 3) ||
        (userAnswer === '4-6' && goals >= 4 && goals <= 6) ||
        (userAnswer === '7-9' && goals >= 7 && goals <= 9) ||
        (userAnswer === '10+' && goals >= 10)
      );
    } else if (q.id === 'dq3') {
      correct = userAnswer === results.mostGoalsMatch;
    }

    if (correct) total += q.points;
  });

  card.feature_match.props.forEach(p => {
    const userAnswer = answers[p.id];
    if (!userAnswer) return;

    let correct = false;
    if (p.id === 'fm1') {
      correct = userAnswer === results.featureResult;
    } else if (p.id === 'fm3') {
      const goals = results.featureGoals || 0;
      correct = (
        (userAnswer === '0-1' && goals <= 1) ||
        (userAnswer === '2-3' && goals >= 2 && goals <= 3) ||
        (userAnswer === '4+' && goals >= 4)
      );
    }
    // fm2 (player prop) requires events API — skip for now

    if (correct) total += p.points;
  });

  if (bonusTaken && answers['bonus1']) {
    const bonusCorrect =
      answers['bonus1'] === 'Yes' &&
      answers['fm1'] === results.featureResult;
    if (bonusCorrect) total += 10;
  }

  return total;
}

module.exports = { scoreCard };
