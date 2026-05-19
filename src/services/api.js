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

export const sendCompanionMessage = async (message, conversationHistory, matchContext) => {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory, matchContext }),
  });
  return response.json();
};

export const getPredictionOptions = async (matchId) => {
  const response = await fetch(`${API_URL}/api/predictions/options?matchId=${matchId}`);
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

export const createGroup = async (name, userId) => {
  const response = await fetch(`${API_URL}/api/groups/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, userId }),
  });
  return response.json();
};

export const joinGroup = async (inviteCode, userId, displayName) => {
  const response = await fetch(`${API_URL}/api/groups/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode, userId, displayName }),
  });
  return response.json();
};
