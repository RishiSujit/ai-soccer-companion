const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const sendOnboardingMessage = async (message, conversationHistory) => {
  const response = await fetch(`${API_URL}/api/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory }),
  });
  return response.json();
};

export const sendChatMessage = async (message, matchId, sessionId) => {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, matchId, sessionId }),
  });
  return response.json();
};

export const sendCompanionMessage = async (message, conversationHistory, matchContext, userContext) => {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory, matchContext, userContext }),
  });
  const data = await response.json();
  return {
    reply: data.reply || data.response,
    analogy: data.analogy || null,
    followUps: data.followUps || [],
    matchContext: data.matchContext,
    signals: data.signals,
  };
};

export const getPredictionOptions = async (matchId) => {
  const response = await fetch(`${API_URL}/api/predictions/options/${matchId}`);
  return response.json();
};

export const submitPrediction = async (userId, matchId, resultPrediction, propPredictions) => {
  const response = await fetch(`${API_URL}/api/predictions/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, matchId, resultPrediction, propPredictions }),
  });
  return response.json();
};

export const createGroup = async (userId, groupName) => {
  const response = await fetch(`${API_URL}/api/groups/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, groupName }),
  });
  return response.json();
};

export const joinGroup = async (userId, inviteCode, displayName) => {
  const response = await fetch(`${API_URL}/api/groups/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, inviteCode, displayName }),
  });
  return response.json();
};

export const getLeaderboard = async (groupId) => {
  const response = await fetch(`${API_URL}/api/groups/${groupId}/leaderboard`);
  return response.json();
};

export const getPlayerCard = async (playerName, team, position, userContext) => {
  const response = await fetch(`${API_URL}/api/player-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, team, position, userContext }),
  });
  return response.json();
};

export const getLiveMatches = async () => {
  try {
    const response = await fetch(`${API_URL}/api/matches/live`);
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('getLiveMatches error:', err);
    return { matches: [] };
  }
};

export const getUpcomingMatches = async () => {
  try {
    const response = await fetch(`${API_URL}/api/matches/upcoming`);
    if (!response.ok) throw new Error('Failed');
    return response.json();
  } catch (err) {
    console.error('getUpcomingMatches error:', err);
    return { matches: [] };
  }
};

export const getRecapForTeam = async (team) => {
  try {
    const res = await fetch(`${API_URL}/api/home/recap/${encodeURIComponent(team)}`);
    return res.json();
  } catch {
    return { recap: null };
  }
};

export const getHotTake = async () => {
  try {
    const res = await fetch(`${API_URL}/api/home/hot-take`);
    return res.json();
  } catch {
    return { hotTake: null };
  }
};

export const voteOnHotTake = async (id, vote) => {
  const res = await fetch(`${API_URL}/api/home/hot-take/${id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vote }),
  });
  return res.json();
};

export const getUpcomingPredictions = async () => {
  try {
    const res = await fetch(`${API_URL}/api/predictions/upcoming`);
    return res.json();
  } catch {
    return { matches: [], fromFallback: true };
  }
};

export const getUserPredictions = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/api/predictions/user/${userId}`);
    return res.json();
  } catch {
    return { predictions: [] };
  }
};

export const getDailyCard = async () => {
  try {
    const res = await fetch(`${API_URL}/api/daily-card/today`);
    return res.json();
  } catch {
    return { card: null, fromFallback: true };
  }
};

export const submitDailyCard = async (userId, answers, bonusTaken) => {
  const res = await fetch(`${API_URL}/api/daily-card/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, answers, bonusTaken }),
  });
  return res.json();
};

export const getMyDailyPrediction = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/api/daily-card/my-prediction?userId=${userId}`);
    return res.json();
  } catch {
    return { prediction: null };
  }
};

export const saveProgress = async (userId, answers, bonusTaken) => {
  try {
    const res = await fetch(`${API_URL}/api/daily-card/save-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, answers, bonusTaken }),
    });
    return res.json();
  } catch {
    return { success: false };
  }
};

export const unlockPrediction = async (userId) => {
  const res = await fetch(`${API_URL}/api/daily-card/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
};

export const getTeamHeadline = async (team, userSports) => {
  try {
    const sports = Array.isArray(userSports) ? userSports.join(',') : userSports || 'NFL,NBA';
    const res = await fetch(
      `${API_URL}/api/home/team-headline?team=${encodeURIComponent(team)}&userSports=${sports}`
    );
    return res.json();
  } catch {
    return { headline: null };
  }
};

export const getPreMatchBriefing = async (userTeam, userSports) => {
  try {
    const sports = Array.isArray(userSports)
      ? userSports.join(',')
      : userSports || 'NFL,NBA';
    const res = await fetch(
      `${API_URL}/api/briefing?userTeam=${encodeURIComponent(userTeam)}&userSports=${sports}`
    );
    return res.json();
  } catch {
    return { briefing: null };
  }
};

export const getMatchOdds = async (home, away, date) => {
  try {
    const params = new URLSearchParams({ home, away, ...(date ? { date } : {}) });
    const res = await fetch(`${API_URL}/api/odds/match?${params}`);
    return res.json();
  } catch {
    return { odds: null };
  }
};

export const getLiveWinProbability = async (home, away, homeScore, awayScore, minute) => {
  try {
    const params = new URLSearchParams({ home, away, homeScore, awayScore, minute });
    const res = await fetch(`${API_URL}/api/odds/live?${params}`);
    return res.json();
  } catch {
    return { probability: null };
  }
};

export const getTeamSquad = async (team, opponent, date, lineupsUrl) => {
  try {
    const params = new URLSearchParams({ team });
    if (opponent) params.append('opponent', opponent);
    if (date) params.append('date', date);
    if (lineupsUrl) params.append('lineupsUrl', encodeURIComponent(lineupsUrl));
    const res = await fetch(`${API_URL}/api/lineups/squad?${params}`);
    const data = await res.json();
    return data.squad || null;
  } catch {
    return null;
  }
};

export const getMatchPredictions = async (matches) => {
  try {
    const res = await fetch(`${API_URL}/api/predictions/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches }),
    });
    const data = await res.json();
    return data.predictions || {};
  } catch (err) {
    console.error('Predictions error:', err);
    return {};
  }
};

export const getBracketForTeam = async (team) => {
  try {
    const res = await fetch(`${API_URL}/api/home/bracket/${encodeURIComponent(team)}`);
    return res.json();
  } catch {
    return { bracket: [] };
  }
};
