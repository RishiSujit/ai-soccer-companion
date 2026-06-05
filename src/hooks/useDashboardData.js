import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const SAMPLE_DATA = {
  totalUsers: 47,
  dauMatchDay: 31,
  totalRatings: 284,
  thumbsUpRate: 74,
  thumbsDownRate: 26,
  avgQuestionsPerSession: 4.2,
  totalSessions: 89,
  totalGroups: 12,
  totalGroupMembers: 38,
  predictionSubmitRate: 68,
  totalPredictions: 203,
  returnRate: 61,
  topQuestionCategories: [
    { category: 'Rules & Calls', count: 94 },
    { category: 'Match Context', count: 71 },
    { category: 'Players', count: 58 },
    { category: 'Teams & Tactics', count: 43 },
    { category: 'Tournament', count: 18 },
  ],
  ratingsOverTime: [
    { date: 'Jun 11', up: 12, down: 4 },
    { date: 'Jun 12', up: 19, down: 5 },
    { date: 'Jun 13', up: 28, down: 7 },
    { date: 'Jun 14', up: 22, down: 6 },
    { date: 'Jun 15', up: 31, down: 8 },
    { date: 'Jun 16', up: 27, down: 5 },
    { date: 'Jun 17', up: 35, down: 9 },
  ],
  questionsOverTime: [
    { date: 'Jun 11', avg: 2.1 },
    { date: 'Jun 12', avg: 3.4 },
    { date: 'Jun 13', avg: 3.8 },
    { date: 'Jun 14', avg: 4.1 },
    { date: 'Jun 15', avg: 4.6 },
    { date: 'Jun 16', avg: 4.2 },
    { date: 'Jun 17', avg: 4.8 },
  ],
};

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);

  const fetchData = async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      const totalUsers = users?.length || 0;

      const { data: ratings } = await supabase
        .from('response_ratings')
        .select('rating, created_at, message_content')
        .order('created_at', { ascending: false });

      const totalRatings = ratings?.length || 0;
      const upRatings = ratings?.filter(r => r.rating === 'up').length || 0;
      const thumbsUpRate = totalRatings > 0
        ? Math.round((upRatings / totalRatings) * 100)
        : 0;

      const ratingsOverTime = buildOverTime(ratings || [], 7);

      const { data: groups } = await supabase
        .from('groups')
        .select('id, created_at');

      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('id, total_points');

      const totalGroups = groups?.length || 0;
      const totalGroupMembers = groupMembers?.length || 0;

      const { data: predictions } = await supabase
        .from('daily_predictions')
        .select('id, user_id, date, locked_at');

      const totalPredictions = predictions?.length || 0;
      const lockedPredictions = predictions?.filter(p => p.locked_at).length || 0;
      const predictionSubmitRate = totalUsers > 0 && totalPredictions > 0
        ? Math.round((lockedPredictions / totalUsers) * 100)
        : 0;

      const avgQuestionsPerSession = totalUsers > 0 && totalRatings > 0
        ? Math.round((totalRatings / totalUsers) * 10) / 10
        : 0;

      const categoryKeywords = {
        'Rules & Calls': ['offside', 'card', 'foul', 'var', 'penalty', 'free kick', 'handball'],
        'Match Context': ['what happened', 'momentum', 'winning', 'losing', 'score', 'what just', 'going on'],
        'Players': ['messi', 'mbappe', 'vinicius', 'saka', 'ronaldo', 'player', 'who is'],
        'Teams & Tactics': ['formation', 'press', 'tactics', 'style', 'how does', 'why does'],
        'Tournament': ['group', 'knockout', 'qualify', 'advance', 'world cup', 'bracket'],
      };

      const categoryCounts = {};
      Object.keys(categoryKeywords).forEach(cat => { categoryCounts[cat] = 0; });

      (ratings || []).forEach(r => {
        const msg = (r.message_content || '').toLowerCase();
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(k => msg.includes(k))) {
            categoryCounts[cat]++;
            break;
          }
        }
      });

      const topQuestionCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      const useSample = totalRatings < 20;
      setIsUsingSampleData(useSample);

      const realData = {
        totalUsers,
        dauMatchDay: Math.round(totalUsers * 0.65),
        totalRatings,
        thumbsUpRate,
        thumbsDownRate: 100 - thumbsUpRate,
        avgQuestionsPerSession,
        totalSessions: Math.max(1, Math.round(totalRatings / 4)),
        totalGroups,
        totalGroupMembers,
        predictionSubmitRate,
        totalPredictions,
        returnRate: 0,
        topQuestionCategories,
        ratingsOverTime,
        questionsOverTime: buildQuestionsOverTime(ratings || [], 7),
      };

      setData(useSample ? mergeSampleData(realData) : realData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard data error:', err);
      setData(SAMPLE_DATA);
      setIsUsingSampleData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, lastUpdated, isUsingSampleData, refresh: fetchData };
}

function mergeSampleData(real) {
  return {
    ...SAMPLE_DATA,
    totalUsers: real.totalUsers || SAMPLE_DATA.totalUsers,
    totalRatings: real.totalRatings || SAMPLE_DATA.totalRatings,
    totalGroups: real.totalGroups || SAMPLE_DATA.totalGroups,
    totalGroupMembers: real.totalGroupMembers || SAMPLE_DATA.totalGroupMembers,
  };
}

function buildOverTime(items, days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayItems = items.filter(item => {
      return new Date(item.created_at).toDateString() === date.toDateString();
    });
    result.push({
      date: dateStr,
      up: dayItems.filter(i => i.rating === 'up').length,
      down: dayItems.filter(i => i.rating === 'down').length,
    });
  }
  return result;
}

function buildQuestionsOverTime(ratings, days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayRatings = ratings.filter(r => {
      return new Date(r.created_at).toDateString() === date.toDateString();
    });
    result.push({
      date: dateStr,
      avg: dayRatings.length > 0 ? Math.round((dayRatings.length / 3) * 10) / 10 : 0,
    });
  }
  return result;
}
