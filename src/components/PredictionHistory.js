import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Generic labels for question IDs — real text comes from score_breakdown
const QUESTION_LABELS = {
  dq1: 'Red card today?',
  dq2: 'Total goals across all matches?',
  dq3: 'Which match scores most goals?',
  fm1: 'Feature match result?',
  fm2: 'Key player scores?',
  fm3: 'Goals in feature match?',
};

export default function PredictionHistory({ userId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    loadHistory();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadHistory() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_predictions')
        .select('id, date, answers, bonus_taken, locked_at, scored_at, points_earned, actual_results, score_breakdown')
        .eq('user_id', userId)
        .not('scored_at', 'is', null)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Load history error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="history-loading">
        <div className="history-spinner" />
        <p>Loading your scorecards...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <div className="history-empty-icon">📊</div>
        <div className="history-empty-title">No scored cards yet</div>
        <div className="history-empty-sub">
          Your completed prediction cards will appear here after matches finish
        </div>
      </div>
    );
  }

  const totalPoints = history.reduce((sum, h) => sum + (h.points_earned || 0), 0);
  const totalPossible = history.length * 25;
  const accuracy = totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0;
  const bestDay = history.reduce(
    (best, h) => (h.points_earned || 0) > (best?.points_earned || 0) ? h : best,
    null
  );

  return (
    <div className="history-container">

      <div className="history-stats-banner">
        <div className="history-stat">
          <div className="history-stat-value">{totalPoints}</div>
          <div className="history-stat-label">Total pts</div>
        </div>
        <div className="history-stat-divider" />
        <div className="history-stat">
          <div className="history-stat-value">{history.length}</div>
          <div className="history-stat-label">Cards played</div>
        </div>
        <div className="history-stat-divider" />
        <div className="history-stat">
          <div className="history-stat-value">{accuracy}%</div>
          <div className="history-stat-label">Accuracy</div>
        </div>
        {bestDay && (
          <>
            <div className="history-stat-divider" />
            <div className="history-stat">
              <div className="history-stat-value" style={{ color: '#00ff87' }}>
                {bestDay.points_earned}
              </div>
              <div className="history-stat-label">Best day</div>
            </div>
          </>
        )}
      </div>

      <div className="history-list">
        {history.map(card => {
          const pts = card.points_earned || 0;
          const isExpanded = selectedId === card.id;
          return (
            <div
              key={card.id}
              className="history-card-row"
              onClick={() => setSelectedId(isExpanded ? null : card.id)}
            >
              <div className="history-card-header">
                <div className="history-card-date">
                  {new Date(card.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </div>
                <div className="history-card-pts">
                  <span className={`history-pts-badge ${
                    pts >= 20 ? 'pts-great' : pts >= 12 ? 'pts-good' : 'pts-low'
                  }`}>
                    {pts} pts
                  </span>
                  <span className="history-chevron">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              <div className="history-score-bar">
                <div
                  className="history-score-fill"
                  style={{
                    width: `${Math.min((pts / 25) * 100, 100)}%`,
                    background: pts >= 20 ? '#00ff87' : pts >= 12 ? '#f5a623' : '#4a4a6a',
                  }}
                />
              </div>

              {isExpanded && (
                <div className="history-scorecard">
                  <ScoreBreakdown
                    breakdown={card.score_breakdown}
                    bonusTaken={card.bonus_taken}
                    pointsEarned={pts}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

function ScoreBreakdown({ breakdown, bonusTaken, pointsEarned }) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <div className="breakdown-unavailable">
        Detailed breakdown not available
      </div>
    );
  }

  const questionKeys = Object.keys(breakdown).filter(k => k !== 'bonus1');
  const bonusData = breakdown.bonus1;

  return (
    <div className="breakdown-container">
      {questionKeys.map(key => {
        const item = breakdown[key];
        const isCorrect = item.correct;
        const wasAnswered = !!item.answer;
        const pts = item.points || 0;

        return (
          <div
            key={key}
            className={`breakdown-row ${
              !wasAnswered ? 'breakdown-skipped' : isCorrect ? 'breakdown-correct' : 'breakdown-wrong'
            }`}
          >
            <span className="breakdown-icon">
              {!wasAnswered ? '—' : isCorrect ? '✅' : '❌'}
            </span>
            <div className="breakdown-info">
              <div className="breakdown-label">{QUESTION_LABELS[key] || key}</div>
              {wasAnswered && (
                <div className="breakdown-answers">
                  <span className={`breakdown-pick ${isCorrect ? 'pick-correct' : 'pick-wrong'}`}>
                    You: {item.answer}
                  </span>
                </div>
              )}
            </div>
            <span className={`breakdown-pts ${isCorrect ? 'pts-earned' : 'pts-missed'}`}>
              {isCorrect ? `+${pts}` : wasAnswered ? '—' : '—'}
            </span>
          </div>
        );
      })}

      {bonusTaken && bonusData && (
        <div className={`breakdown-row ${bonusData.correct ? 'breakdown-correct' : 'breakdown-wrong'}`}>
          <span className="breakdown-icon">{bonusData.correct ? '✅' : '❌'}</span>
          <div className="breakdown-info">
            <div className="breakdown-label">🎯 Bonus parlay</div>
            <div className="breakdown-answers">
              <span className={`breakdown-pick ${bonusData.correct ? 'pick-correct' : 'pick-wrong'}`}>
                {bonusData.correct ? 'Hit!' : 'Missed'}
              </span>
            </div>
          </div>
          <span className={`breakdown-pts ${bonusData.correct ? 'pts-earned' : 'pts-missed'}`}>
            {bonusData.correct ? '+10' : '—'}
          </span>
        </div>
      )}

      <div className="breakdown-total">
        <span className="breakdown-total-label">Total</span>
        <span className="breakdown-total-pts">{pointsEarned} / 25 pts</span>
      </div>
    </div>
  );
}
