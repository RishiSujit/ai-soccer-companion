import { useState, useEffect } from 'react';
import { getMatchOdds } from '../services/api';
import './OddsCard.css';

function DisclaimerBanner({ onAccept }) {
  return (
    <div className="odds-disclaimer">
      <div className="odds-disclaimer__body">
        <span className="odds-disclaimer__icon">📊</span>
        <span className="odds-disclaimer__text">
          Odds shown are <strong>educational context</strong> — what the betting market currently thinks.
          Must be 21+ to gamble. Please play responsibly.
        </span>
      </div>
      <button className="odds-disclaimer__btn" onClick={onAccept}>Got it</button>
    </div>
  );
}

function ProbBar({ homeTeam, awayTeam, homeWinPct, drawPct, awayWinPct }) {
  return (
    <div className="odds-prob-bar">
      <div className="odds-prob-bar__labels">
        <span className="odds-prob-label">{homeTeam}</span>
        <span className="odds-prob-label">Draw</span>
        <span className="odds-prob-label odds-prob-label--right">{awayTeam}</span>
      </div>
      <div className="odds-prob-track">
        <div className="odds-prob-seg odds-prob-seg--home" style={{ width: `${homeWinPct}%` }}>
          {homeWinPct >= 15 && `${homeWinPct}%`}
        </div>
        <div className="odds-prob-seg odds-prob-seg--draw" style={{ width: `${drawPct}%` }}>
          {drawPct >= 12 && `${drawPct}%`}
        </div>
        <div className="odds-prob-seg odds-prob-seg--away" style={{ width: `${awayWinPct}%` }}>
          {awayWinPct >= 15 && `${awayWinPct}%`}
        </div>
      </div>
    </div>
  );
}

function OddsCard({ homeTeam, awayTeam, matchDate, onAskAI }) {
  const [odds, setOdds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(() =>
    !!localStorage.getItem('odds_disclaimer')
  );

  useEffect(() => {
    if (!homeTeam || !awayTeam) { setLoading(false); return; }
    getMatchOdds(homeTeam, awayTeam, matchDate).then(data => {
      setOdds(data.odds || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [homeTeam, awayTeam, matchDate]);

  if (dismissed || loading) return null;

  if (!hasSeenDisclaimer) {
    return (
      <DisclaimerBanner onAccept={() => {
        localStorage.setItem('odds_disclaimer', '1');
        setHasSeenDisclaimer(true);
      }} />
    );
  }

  if (!odds) return null;

  return (
    <div className="odds-card">
      <div className="odds-card__header">
        <span className="odds-card__label">Market Outlook</span>
        {odds.source && (
          <span className="odds-card__source">{odds.source}{odds.asOf ? ` · ${odds.asOf}` : ''}</span>
        )}
        <button className="odds-card__dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">×</button>
      </div>

      <ProbBar
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeWinPct={odds.homeWinPct}
        drawPct={odds.drawPct}
        awayWinPct={odds.awayWinPct}
      />

      <button className="odds-card__expand-btn" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Hide odds ↑' : 'Show moneyline odds ↓'}
      </button>

      {expanded && (
        <div className="odds-card__detail">
          <div className="odds-card__row">
            <span>{homeTeam}</span>
            <span className="odds-card__value">{odds.homeOdds}</span>
          </div>
          <div className="odds-card__row">
            <span>Draw</span>
            <span className="odds-card__value">{odds.drawOdds}</span>
          </div>
          <div className="odds-card__row">
            <span>{awayTeam}</span>
            <span className="odds-card__value">{odds.awayOdds}</span>
          </div>
          {odds.totalGoalsLine && (
            <>
              <div className="odds-card__divider" />
              <div className="odds-card__row">
                <span>Over {odds.totalGoalsLine} goals</span>
                <span className="odds-card__value">{odds.overOdds}</span>
              </div>
              <div className="odds-card__row">
                <span>Under {odds.totalGoalsLine} goals</span>
                <span className="odds-card__value">{odds.underOdds}</span>
              </div>
            </>
          )}
          <div className="odds-card__edu-note">
            Negative (e.g. −140) = bet $140 to win $100 · Positive (e.g. +120) = bet $100 to win $120
          </div>
        </div>
      )}

      {onAskAI && (
        <button
          className="odds-card__ask-ai"
          onClick={() => onAskAI(
            `What do the betting odds tell us about this match? ${homeTeam} has ${odds.homeWinPct}% win probability vs ${awayTeam}'s ${odds.awayWinPct}%. Explain what this means.`
          )}
        >
          💬 Ask AI about these odds
        </button>
      )}

      <div className="odds-card__footer">Educational context only · 21+ to gamble · Please play responsibly</div>
    </div>
  );
}

export function CompactOddsBar({ homeTeam, awayTeam, matchDate }) {
  const [odds, setOdds] = useState(null);

  useEffect(() => {
    if (!homeTeam || !awayTeam || !localStorage.getItem('odds_disclaimer')) return;
    getMatchOdds(homeTeam, awayTeam, matchDate).then(data => {
      setOdds(data.odds || null);
    }).catch(() => {});
  }, [homeTeam, awayTeam, matchDate]);

  if (!odds) return null;

  return (
    <div className="compact-odds-bar" title="Market win probability">
      <div
        className="compact-odds-seg compact-odds-seg--home"
        style={{ width: `${odds.homeWinPct}%` }}
      >
        {odds.homeWinPct}%
      </div>
      <div
        className="compact-odds-seg compact-odds-seg--draw"
        style={{ width: `${odds.drawPct}%` }}
      >
        {odds.drawPct}%
      </div>
      <div
        className="compact-odds-seg compact-odds-seg--away"
        style={{ width: `${odds.awayWinPct}%` }}
      >
        {odds.awayWinPct}%
      </div>
    </div>
  );
}

export default OddsCard;
