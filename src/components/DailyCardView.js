import { useState, useEffect } from 'react';
import { getDailyCard, submitDailyCard, getMyDailyPrediction } from '../services/api';
import './DailyCardView.css';

const FLAGS = {
  'Argentina': '🇦🇷', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱', 'Italy': '🇮🇹', 'Japan': '🇯🇵',
  'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Australia': '🇦🇺',
  'Croatia': '🇭🇷', 'Uruguay': '🇺🇾', 'Colombia': '🇨🇴',
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatKickoff(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function getFirstKickoff(matches) {
  if (!matches?.length) return null;
  return matches.map(m => new Date(m.kickoff)).sort((a, b) => a - b)[0];
}

function DailyCardView({ userId, userContext, isGuest, onShowAuth }) {
  const [card, setCard] = useState(null);
  const [answers, setAnswers] = useState({});
  const [bonusTaken, setBonusTaken] = useState(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fromFallback, setFromFallback] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cardRes, predRes] = await Promise.all([
          getDailyCard(),
          userId ? getMyDailyPrediction(userId) : Promise.resolve({ prediction: null }),
        ]);

        if (cardRes.card) {
          setCard(cardRes.card);
          setFromFallback(cardRes.fromFallback);
        }

        if (predRes.prediction) {
          setAnswers(predRes.prediction.answers || {});
          setBonusTaken(predRes.prediction.bonus_taken || false);
          setLocked(true);
        }
      } catch {
        // Fail silently — UI will show loading state resolved
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  function handleAnswer(questionId, option) {
    if (locked) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  }

  function handleBonus(take) {
    if (locked) return;
    setBonusTaken(take);
    if (take) {
      setAnswers(prev => ({ ...prev, bonus1: 'Yes' }));
    } else {
      setAnswers(prev => {
        const next = { ...prev };
        delete next.bonus1;
        return next;
      });
    }
  }

  async function handleLock() {
    if (!userId || submitting || locked) return;
    setSubmitting(true);
    try {
      const result = await submitDailyCard(userId, answers, bonusTaken || false);
      if (result.success) setLocked(true);
    } catch {
      // Fail silently
    }
    setSubmitting(false);
  }

  function calculatePointsPossible() {
    if (!card) return 0;
    let pts = 0;
    [...card.daily_questions, ...card.feature_match.props].forEach(q => {
      if (answers[q.id]) pts += q.points;
    });
    if (bonusTaken) pts += 10;
    return pts;
  }

  function calculateMaxPoints() {
    if (!card) return 0;
    const qs = [...card.daily_questions, ...card.feature_match.props];
    return qs.reduce((s, q) => s + q.points, 0) + 10;
  }

  function hasAnyAnswer() {
    return Object.keys(answers).some(k => k !== 'bonus1' && answers[k]);
  }

  if (isGuest) {
    return (
      <div className="dcv-guest-lock">
        <div className="dcv-guest-icon">🔒</div>
        <div className="dcv-guest-title">Sign up to make predictions</div>
        <div className="dcv-guest-desc">
          Create a free account to lock in your daily picks and compete on the leaderboard.
        </div>
        <button className="dcv-guest-cta" onClick={() => onShowAuth('signup')}>
          Create free account →
        </button>
        <button className="dcv-guest-secondary" onClick={() => onShowAuth('signin')}>
          Already have an account? Sign in
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="dcv-loading">Loading today's card...</div>;
  }

  if (!card) {
    return (
      <div className="dcv-empty">
        No matches scheduled today. Check back on June 11th for the World Cup opener!
      </div>
    );
  }

  const firstKickoff = getFirstKickoff(card.matches);
  const pointsPossible = calculatePointsPossible();
  const maxPoints = calculateMaxPoints();

  return (
    <div className="dcv-wrap">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="dcv-header">
        <div>
          <div className="dcv-title">Today's Predictions</div>
          <div className="dcv-date">{formatDate(card.date)}</div>
        </div>
        <div className="dcv-pts-badge">
          {locked
            ? <span className="dcv-pts-locked">Locked ✓</span>
            : <span>Up to <strong>{maxPoints} pts</strong> today</span>
          }
        </div>
      </div>

      {/* ── Matches strip ───────────────────────────────────── */}
      <div className="dcv-matches-strip">
        <div className="dcv-matches-label">
          {firstKickoff
            ? `Locks at first kickoff — ${formatKickoff(firstKickoff.toISOString())}`
            : 'Today\'s matches'
          }
        </div>
        <div className="dcv-matches-row">
          {card.matches.map((m, i) => (
            <div key={i} className="dcv-match-chip">
              <span>{FLAGS[m.homeTeam] ?? '🌍'}</span>
              <span className="dcv-match-chip-name">{m.homeTeam} vs {m.awayTeam}</span>
              <span>{FLAGS[m.awayTeam] ?? '🌍'}</span>
            </div>
          ))}
        </div>
        {fromFallback && (
          <div className="dcv-fallback-note">
            Preview card — actual matches load on match day
          </div>
        )}
      </div>

      {/* ── Daily Questions ─────────────────────────────────── */}
      <div className="dcv-section">
        <div className="dcv-section-header">
          <div className="dcv-section-title">Daily Questions</div>
          <div className="dcv-section-sub">Covering all matches today</div>
        </div>
        {card.daily_questions.map(q => (
          <QuestionBlock
            key={q.id}
            question={q}
            selected={answers[q.id]}
            locked={locked}
            onSelect={opt => handleAnswer(q.id, opt)}
          />
        ))}
      </div>

      {/* ── Feature Match ───────────────────────────────────── */}
      <div className="dcv-section">
        <div className="dcv-section-header">
          <div className="dcv-section-title">⭐ Feature Match</div>
          <div className="dcv-feature-matchup">
            <span>{FLAGS[card.feature_match.homeTeam] ?? '🌍'}</span>
            <span className="dcv-feature-vs">
              {card.feature_match.homeTeam} vs {card.feature_match.awayTeam}
            </span>
            <span>{FLAGS[card.feature_match.awayTeam] ?? '🌍'}</span>
          </div>
          {card.feature_match.reason && (
            <div className="dcv-feature-reason">{card.feature_match.reason}</div>
          )}
        </div>
        {card.feature_match.props.map(p => (
          <QuestionBlock
            key={p.id}
            question={p}
            selected={answers[p.id]}
            locked={locked}
            onSelect={opt => handleAnswer(p.id, opt)}
          />
        ))}
      </div>

      {/* ── Bonus ───────────────────────────────────────────── */}
      <div className="dcv-bonus-section">
        <div className="dcv-bonus-header">
          <div className="dcv-bonus-title">🎯 Bonus Question</div>
          <div className="dcv-bonus-sub">High risk · High reward</div>
        </div>
        <div className="dcv-bonus-question">{card.bonus.question}</div>
        {locked ? (
          <div className="dcv-bonus-locked-state">
            {bonusTaken
              ? <span className="dcv-bonus-taken">Going for it! +10 if correct ✓</span>
              : <span className="dcv-bonus-skipped">Bonus skipped</span>
            }
          </div>
        ) : bonusTaken === null ? (
          <div className="dcv-bonus-btns">
            <button className="dcv-bonus-take" onClick={() => handleBonus(true)}>
              Take the bonus — +10 pts
            </button>
            <button className="dcv-bonus-skip" onClick={() => handleBonus(false)}>
              Skip the bonus
            </button>
          </div>
        ) : bonusTaken ? (
          <div className="dcv-bonus-confirm">
            <div className="dcv-bonus-confirm-text">You're going for it! +10 if correct</div>
            <button className="dcv-bonus-undo" onClick={() => handleBonus(null)}>
              Actually, skip it
            </button>
          </div>
        ) : (
          <div className="dcv-bonus-confirm">
            <div className="dcv-bonus-skipped-text">Bonus skipped</div>
            <button className="dcv-bonus-undo" onClick={() => handleBonus(null)}>
              Wait — I'll take it
            </button>
          </div>
        )}
      </div>

      {/* ── Lock button ─────────────────────────────────────── */}
      {locked ? (
        <div className="dcv-locked-summary">
          <div className="dcv-locked-label">Card locked ✓ — check back tonight</div>
          <div className="dcv-locked-pts">
            {pointsPossible} pts on the line
            {bonusTaken ? ' · Bonus included' : ''}
          </div>
        </div>
      ) : (
        <div className="dcv-lock-area">
          {pointsPossible > 0 && (
            <div className="dcv-pts-running">{pointsPossible} pts selected</div>
          )}
          <button
            className="dcv-lock-btn"
            onClick={handleLock}
            disabled={!hasAnyAnswer() || submitting}
          >
            {submitting ? 'Locking...' : `Lock in today's card →`}
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionBlock({ question, selected, locked, onSelect }) {
  return (
    <div className="dcv-question">
      <div className="dcv-question-row">
        <div className="dcv-question-text">{question.question}</div>
        <div className="dcv-question-pts">+{question.points} pts</div>
      </div>
      <div className="dcv-options">
        {question.options.map(opt => (
          <button
            key={opt}
            className={`dcv-option ${selected === opt ? 'dcv-option--selected' : ''} ${locked ? 'dcv-option--locked' : ''}`}
            onClick={() => onSelect(opt)}
            disabled={locked}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DailyCardView;
