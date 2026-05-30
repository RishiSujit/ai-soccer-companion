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
  return response.json();
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

export const getBracketForTeam = async (team) => {
  try {
    const res = await fetch(`${API_URL}/api/home/bracket/${encodeURIComponent(team)}`);
    return res.json();
  } catch {
    return { bracket: [] };
  }
};

// TEST ONLY — awards points to all groups the user is in for UCL Final testing
export const testAwardPoints = async (userId, points) => {
  const res = await fetch(`${API_URL}/api/groups/test-award-points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, points }),
  });
  return res.json();
};
