'use strict';

function isKnockoutStage(stage = '') {
  const knockout = ['final', 'semi', 'quarter', 'round of 16', 'knockout', 'elimination'];
  const lower = stage.toLowerCase();
  return knockout.some(k => lower.includes(k));
}

function calculatePressure(matchState) {
  const {
    minute = 0,
    homeScore = 0,
    awayScore = 0,
    stage = 'group',
    isExtraTime = false,
  } = matchState;

  const scoreDiff = Math.abs(homeScore - awayScore);
  const isKnockout = isKnockoutStage(stage);
  const timeRemaining = isExtraTime
    ? Math.max(0, 120 - minute)
    : Math.max(0, 90 - minute);

  if (isKnockout) {
    if (timeRemaining <= 5 && scoreDiff === 0) return 'critical';
    if (timeRemaining <= 15 && scoreDiff <= 1) return 'critical';
    if (timeRemaining <= 30 && scoreDiff <= 1) return 'high';
    if (scoreDiff === 0) return 'high';
    if (scoreDiff === 1 && timeRemaining <= 45) return 'medium';
    return 'medium';
  }

  // Group stage
  if (timeRemaining <= 5 && scoreDiff <= 1) return 'high';
  if (timeRemaining <= 15 && scoreDiff === 0) return 'high';
  if (timeRemaining <= 30 && scoreDiff <= 1) return 'medium';
  if (scoreDiff >= 3) return 'low';
  if (minute < 30) return 'low';
  return 'medium';
}

function calculateMomentum(matchState, events, stats) {
  const { homeTeam, awayTeam, minute = 0 } = matchState;

  const windowStart = Math.max(0, minute - 10);
  const recentEvents = (events || []).filter(e => e.time?.elapsed >= windowStart);

  const attackingTypes = ['Goal', 'Shot', 'Corner', 'Missed Shot', 'Blocked Shot'];

  const homeActions = recentEvents.filter(
    e => e.team?.name === homeTeam && attackingTypes.includes(e.type)
  ).length;

  const awayActions = recentEvents.filter(
    e => e.team?.name === awayTeam && attackingTypes.includes(e.type)
  ).length;

  const homePoss = parseInt(stats?.possession?.home || 50);

  const homeScore = homeActions * 2 + (homePoss > 55 ? 1 : 0);
  const awayScore = awayActions * 2 + (homePoss < 45 ? 1 : 0);

  const diff = homeScore - awayScore;

  if (diff >= 3) return `${homeTeam} dominating`;
  if (diff >= 1) return `${homeTeam} in control`;
  if (diff <= -3) return `${awayTeam} dominating`;
  if (diff <= -1) return `${awayTeam} in control`;

  const lastGoal = [...(events || [])].reverse().find(e => e.type === 'Goal');
  if (lastGoal) {
    return `${lastGoal.team?.name} with momentum after recent goal`;
  }

  return 'evenly contested';
}

function calculateStakes(matchState) {
  const {
    stage = 'group',
    minute = 0,
    homeScore = 0,
    awayScore = 0,
    isExtraTime = false,
    isPenaltyShootout = false,
  } = matchState;

  if (isPenaltyShootout) return 'maximum — penalty shootout';

  const isKnockout = isKnockoutStage(stage);
  const scoreDiff = Math.abs(homeScore - awayScore);
  const timeRemaining = isExtraTime
    ? Math.max(0, 120 - minute)
    : Math.max(0, 90 - minute);

  const stageStakes = {
    'final': 'maximum',
    'semi-finals': 'critical',
    'semi final': 'critical',
    'quarter-finals': 'very high',
    'quarter final': 'very high',
    'round of 16': 'high',
    'group stage': 'medium',
    'group': 'medium',
  };

  const stageLower = stage.toLowerCase();
  let baseStake = 'medium';
  for (const [key, value] of Object.entries(stageStakes)) {
    if (stageLower.includes(key)) { baseStake = value; break; }
  }

  if (isKnockout && scoreDiff === 0 && timeRemaining <= 10) {
    return 'maximum — elimination imminent';
  }
  if (isKnockout && scoreDiff === 0) {
    return `${baseStake} — winner advances`;
  }
  if (isKnockout && scoreDiff === 1 && timeRemaining <= 15) {
    return `${baseStake} — comeback possible`;
  }

  return baseStake;
}

function calculateEmotionalIntensity(matchState, events) {
  const {
    minute = 0,
    homeScore = 0,
    awayScore = 0,
    isExtraTime = false,
    isPenaltyShootout = false,
    stage = 'group',
  } = matchState;

  const scoreDiff = Math.abs(homeScore - awayScore);
  const isKnockout = isKnockoutStage(stage);

  // ─────────────────────────────────────────
  // HARD OVERRIDES — always spike
  // These fire before event logic because the
  // situation itself is maximally dramatic
  // regardless of recent events
  // ─────────────────────────────────────────

  if (isPenaltyShootout) {
    return 'spike — penalty shootout';
  }

  if (isExtraTime && minute >= 115 && scoreDiff === 0) {
    return 'spike — penalties imminent';
  }

  if (isExtraTime && minute >= 115 && scoreDiff === 1) {
    return 'spike — elimination seconds away';
  }

  // ─────────────────────────────────────────
  // EVENT-BASED SCORING
  // ─────────────────────────────────────────

  const recentWindow = (events || []).filter(
    e => e.time?.elapsed >= (minute - 3)
  );

  const dramaScores = {
    'Goal': 8,
    'Penalty': 7,
    'Red Card': 7,
    'VAR': 6,
    'Missed Penalty': 9,
    'Yellow Card': 2,
    'Substitution': 1,
    'Corner': 1,
    'Offside': 2,
  };

  let totalDrama = recentWindow.reduce(
    (sum, event) => sum + (dramaScores[event.type] || 1),
    0
  );

  const hasDisallowedGoal = recentWindow.some(
    e => e.type === 'VAR' && e.detail?.toLowerCase().includes('disallow')
  );
  if (hasDisallowedGoal) totalDrama += 5;

  if (minute >= 85) totalDrama *= 1.5;
  if (minute >= 90) totalDrama *= 1.5;

  if (totalDrama >= 15) return 'spike — extremely dramatic moment';
  if (totalDrama >= 8) return 'high';
  if (totalDrama >= 4) return 'medium';

  // ─────────────────────────────────────────
  // SITUATIONAL FLOORS
  // Applied when events produce no drama —
  // the match situation itself still warrants
  // elevated intensity
  // ─────────────────────────────────────────

  if (isExtraTime && scoreDiff === 0) {
    return 'high — extra time level';
  }

  // Late knockout, tied: always spike even without recent events
  if (isKnockout && !isExtraTime && minute >= 80 && scoreDiff === 0) {
    return 'spike — late knockout tied';
  }

  if (isKnockout && !isExtraTime && minute >= 85 && scoreDiff === 1) {
    return 'high — comeback possible';
  }

  return 'low';
}

function buildNarrativeMoment(matchState, signals) {
  const { homeTeam, awayTeam, homeScore, awayScore, minute, stage } = matchState;

  const isKnockout = isKnockoutStage(stage);
  const scoreDiff = Math.abs(homeScore - awayScore);
  const leadingTeam = homeScore > awayScore ? homeTeam : awayTeam;
  const losingTeam = homeScore > awayScore ? awayTeam : homeTeam;

  if (matchState.isPenaltyShootout) {
    return `Penalty shootout — the World Cup comes down to five kicks each. One miss and it is over.`;
  }

  const etScoreDiff = Math.abs((matchState.homeScore || 0) - (matchState.awayScore || 0));
  if (matchState.isExtraTime && (matchState.minute || 0) >= 115 && etScoreDiff === 0) {
    return `${homeTeam} vs ${awayTeam} tied in the final minutes of extra time — penalty shootout almost certain unless someone scores in the next few minutes`;
  }

  if (matchState.isExtraTime) {
    return `Extra time — both teams have survived 90 minutes, now fighting to avoid a penalty shootout`;
  }

  if (isKnockout && scoreDiff === 0 && minute >= 80) {
    return `${homeTeam} vs ${awayTeam} tied in the final minutes of a knockout match — next goal could send one team home`;
  }

  if (isKnockout && scoreDiff === 1 && minute >= 75) {
    return `${losingTeam} need a goal in the final ${90 - minute} minutes or their World Cup is over`;
  }

  if (scoreDiff >= 3) {
    return `${leadingTeam} in complete control — this match is effectively decided`;
  }

  if (scoreDiff <= 1 && minute >= 60) {
    return `Close match in final third — one moment could change everything`;
  }

  return `${homeTeam} vs ${awayTeam} — match developing`;
}

function buildDerivedSignals(matchState, events = [], stats = {}) {
  const pressure = calculatePressure(matchState);
  const momentum = calculateMomentum(matchState, events, stats);
  const stakes = calculateStakes(matchState);
  const emotional_intensity = calculateEmotionalIntensity(matchState, events);

  const signals = { pressure, momentum, stakes, emotional_intensity };
  const narrative = buildNarrativeMoment(matchState, signals);

  return { ...signals, narrative };
}

module.exports = {
  buildDerivedSignals,
  calculatePressure,
  calculateMomentum,
  calculateStakes,
  calculateEmotionalIntensity,
};
