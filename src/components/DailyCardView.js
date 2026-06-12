import { useState, useEffect, useRef } from 'react';
import { getDailyCard, submitDailyCard, getMyDailyPrediction, saveProgress, unlockPrediction } from '../services/api';
import './DailyCardView.css';

const FLAGS = {
  'Argentina': '🇦🇷', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Morocco': '🇲🇦',
  'Senegal': '🇸🇳', 'Australia': '🇦🇺', 'Croatia': '🇭🇷',
  'Uruguay': '🇺🇾', 'South Korea': '🇰🇷', 'Czechia': '🇨🇿',
  'South Africa': '🇿🇦', 'Canada': '🇨🇦', 'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭', 'Bosnia & Herzegovina': '🇧🇦',
  'Paraguay': '🇵🇾', 'Türkiye': '🇹🇷', 'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨', 'Curaçao': '🇨🇼', 'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳', 'Saudi Arabia': '🇸🇦', 'Cape Verde': '🇨🇻',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷',
  'New Zealand': '🇳🇿', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
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

function getFirstKickoffLabel(matches) {
  if (!matches?.length) return null;
  // Prefer ET label from WC static cards
  const sorted = [...matches].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const first = sorted[0];
  return first.kickoffET || formatKickoff(first.kickoff);
}

function getFirstKickoff(matches) {
  if (!matches?.length) return null;
  return matches.map(m => new Date(m.kickoff)).sort((a, b) => a - b)[0];
}

function getAIPromptForQuestion(question, card) {
  const q = (question.question || '').toLowerCase();
  const homeTeam = card?.feature_match?.homeTeam || '';
  const awayTeam = card?.feature_match?.awayTeam || '';

  if (q.includes('red card')) {
    return 'How often do red cards happen in World Cup matches?';
  }
  if (q.includes('total goals') || q.includes('how many goals')) {
    return 'How many goals are typically scored in a World Cup group match?';
  }
  if (q.includes('most goals')) {
    return "Which of today's matches is likely to be highest scoring?";
  }
  if (q.includes('match result') || q.includes('result?')) {
    return `What are ${homeTeam}'s chances against ${awayTeam}?`;
  }
  if (q.includes('first half')) {
    return `Does ${homeTeam} usually score early in matches?`;
  }
  if (q.includes('clean sheet')) {
    return `How strong is ${homeTeam}'s defense going into this match?`;
  }
  if ((q.includes('will') && q.includes('score')) || q.includes('score?')) {
    return 'Tell me about the key players to watch in this match';
  }
  if (question.type === 'bonus') {
    return `How realistic is this parlay? ${homeTeam} win AND score?`;
  }
  return `Help me understand this prediction: ${question.question}`;
}

function DailyCardView({ userId, userContext, isGuest, onShowAuth, onNavigateToCompanion, onAfterLock }) {
  const [card, setCard] = useState(null);
  const [answers, setAnswers] = useState({});
  const [bonusTaken, setBonusTaken] = useState(null);
  const [locked, setLocked] = useState(false);
  const [isAutoLocked, setIsAutoLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fromFallback, setFromFallback] = useState(false);
  const cardRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];
  const draftKey = userId ? `wcc_draft_${userId}_${today}` : null;

  function checkAutoLock(currentCard) {
    const c = currentCard || cardRef.current;
    if (!c?.matches?.length) return false;
    const now = new Date();
    const firstKickoff = c.matches.map(m => new Date(m.kickoff)).sort((a, b) => a - b)[0];
    if (firstKickoff && now >= firstKickoff) {
      setLocked(true);
      setIsAutoLocked(true);
      return true;
    }
    return false;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cardRes, predRes] = await Promise.all([
          getDailyCard(),
          userId ? getMyDailyPrediction(userId) : Promise.resolve({ prediction: null }),
        ]);

        let loadedCard = null;
        if (cardRes.card) {
          setCard(cardRes.card);
          cardRef.current = cardRes.card;
          loadedCard = cardRes.card;
          setFromFallback(cardRes.fromFallback);
        }

        if (predRes.prediction) {
          setAnswers(predRes.prediction.answers || {});
          setBonusTaken(predRes.prediction.bonus_taken ?? null);
          if (predRes.prediction.locked_at) {
            setLocked(true);
          }
          if (draftKey) try { localStorage.removeItem(draftKey); } catch {}
        } else if (draftKey) {
          try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
              const draft = JSON.parse(saved);
              if (draft.answers) setAnswers(draft.answers);
              if (draft.bonusTaken !== undefined) setBonusTaken(draft.bonusTaken);
            }
          } catch {}
        }

        // Auto-lock if kickoff already passed (regardless of prediction state)
        checkAutoLock(loadedCard);
      } catch {
        // Fail silently — UI will show loading state resolved
      }
      setLoading(false);
    }
    load();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check auto-lock every 60 seconds in case tab is open at kickoff time
  useEffect(() => {
    if (locked) return;
    const interval = setInterval(() => {
      checkAutoLock();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps

  function persistProgress(currentAnswers, currentBonus) {
    if (!userId || isGuest) return;
    saveProgress(userId, currentAnswers, currentBonus || false).catch(() => {});
  }

  function handleAnswer(questionId, option) {
    if (locked) return;
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    if (draftKey) try {
      localStorage.setItem(draftKey, JSON.stringify({ answers: newAnswers, bonusTaken }));
    } catch {}
    persistProgress(newAnswers, bonusTaken);
  }

  function handleBonus(take) {
    if (locked) return;
    const newAnswers = take
      ? { ...answers, bonus1: 'Yes' }
      : Object.fromEntries(Object.entries(answers).filter(([k]) => k !== 'bonus1'));
    setBonusTaken(take);
    setAnswers(newAnswers);
    if (draftKey) try {
      localStorage.setItem(draftKey, JSON.stringify({ answers: newAnswers, bonusTaken: take }));
    } catch {}
    persistProgress(newAnswers, take);
  }

  async function handleLock() {
    if (!userId || submitting || locked || isAutoLocked) return;
    setSubmitting(true);
    try {
      const result = await submitDailyCard(userId, answers, bonusTaken || false);
      if (result.success) {
        setLocked(true);
        if (draftKey) try { localStorage.removeItem(draftKey); } catch {}
        if (onAfterLock) setTimeout(onAfterLock, 1500);
      }
    } catch {
      // Fail silently
    }
    setSubmitting(false);
  }

  async function handleUnlock() {
    if (isAutoLocked) return;
    try {
      const result = await unlockPrediction(userId);
      if (result.success) {
        setLocked(false);
      }
    } catch {
      // Fail silently
    }
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
        Today's card hasn't been generated yet — check back shortly after midnight.
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
            ? `Locks at kickoff — ${getFirstKickoffLabel(card.matches)}`
            : 'Today\'s matches'
          }
        </div>
        <div className="dcv-matches-row">
          {card.matches.map((m, i) => (
            <div key={i} className="dcv-match-chip">
              <span>{m.homeFlag ?? FLAGS[m.homeTeam] ?? '🌍'}</span>
              <div className="dcv-match-chip-body">
                <span className="dcv-match-chip-name">{m.homeTeam} vs {m.awayTeam}</span>
                {(m.kickoffET || m.tvUS) && (
                  <span className="dcv-match-chip-meta">
                    {m.kickoffET}{m.tvUS ? ` · ${m.tvUS}` : ''}
                  </span>
                )}
              </div>
              <span>{m.awayFlag ?? FLAGS[m.awayTeam] ?? '🌍'}</span>
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
        {card.daily_questions.map(q => {
          const aiPrompt = onNavigateToCompanion ? getAIPromptForQuestion(q, card) : null;
          return (
            <QuestionBlock
              key={q.id}
              question={q}
              selected={answers[q.id]}
              locked={locked}
              onSelect={opt => handleAnswer(q.id, opt)}
              aiPrompt={aiPrompt}
              onAskAI={aiPrompt ? () => onNavigateToCompanion(aiPrompt) : null}
            />
          );
        })}
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
        {card.feature_match.props.map(p => {
          const aiPrompt = onNavigateToCompanion ? getAIPromptForQuestion(p, card) : null;
          return (
            <QuestionBlock
              key={p.id}
              question={p}
              selected={answers[p.id]}
              locked={locked}
              onSelect={opt => handleAnswer(p.id, opt)}
              aiPrompt={aiPrompt}
              onAskAI={aiPrompt ? () => onNavigateToCompanion(aiPrompt) : null}
            />
          );
        })}
      </div>

      {/* ── Bonus ───────────────────────────────────────────── */}
      <div className="dcv-bonus-section">
        <div className="dcv-bonus-header">
          <div className="dcv-bonus-title">🎯 Bonus Question</div>
          <div className="dcv-bonus-sub">High risk · High reward</div>
        </div>
        <div className="dcv-bonus-question">{card.bonus.question}</div>
        {!locked && onNavigateToCompanion && (
          <button
            className="ask-ai-prompt ask-ai-bonus"
            onClick={() => onNavigateToCompanion(
              getAIPromptForQuestion({ question: card.bonus.question, type: 'bonus' }, card)
            )}
          >
            <span className="ask-ai-icon">🤖</span>
            <span className="ask-ai-text">Ask AI about this parlay</span>
            <span className="ask-ai-arrow">→</span>
          </button>
        )}
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
      <div className="dcv-lock-area">
        {isAutoLocked ? (
          <div className="dcv-lock-status-locked">
            <span className="dcv-lock-icon">🔒</span>
            <div>
              <div className="dcv-locked-label">Locked at kickoff</div>
              {pointsPossible > 0 && (
                <div className="dcv-locked-pts">{pointsPossible} pts on the line{bonusTaken ? ' · Bonus included' : ''}</div>
              )}
            </div>
          </div>
        ) : locked ? (
          <>
            <div className="dcv-lock-status-locked">
              <span className="dcv-lock-icon">🔒</span>
              <div>
                <div className="dcv-locked-label">Predictions locked ✓</div>
                {pointsPossible > 0 && (
                  <div className="dcv-locked-pts">{pointsPossible} pts on the line{bonusTaken ? ' · Bonus included' : ''}</div>
                )}
              </div>
            </div>
            <button className="dcv-unlock-btn" onClick={handleUnlock}>
              Unlock to edit
            </button>
          </>
        ) : (
          <>
            {firstKickoff && (
              <div className="dcv-lock-countdown">
                Locks at kickoff — {getFirstKickoffLabel(card.matches)}
              </div>
            )}
            {pointsPossible > 0 && (
              <div className="dcv-pts-running">{pointsPossible} pts selected</div>
            )}
            <button
              className="dcv-lock-btn"
              onClick={handleLock}
              disabled={!hasAnyAnswer() || submitting}
            >
              {submitting ? 'Locking...' : hasAnyAnswer() ? `🔒 Lock in ${Object.keys(answers).filter(k => answers[k]).length} picks` : 'Make picks to lock in'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({ question, selected, locked, onSelect, onAskAI, aiPrompt }) {
  return (
    <div className="dcv-question">
      <div className="dcv-question-row">
        <div className="dcv-question-text">{question.question}</div>
        <div className="dcv-question-pts">+{question.points} pts</div>
      </div>
      {!locked && onAskAI && aiPrompt && (
        <button className="ask-ai-prompt" onClick={onAskAI}>
          <span className="ask-ai-icon">🤖</span>
          <span className="ask-ai-text">Ask AI — {aiPrompt}</span>
          <span className="ask-ai-arrow">→</span>
        </button>
      )}
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
