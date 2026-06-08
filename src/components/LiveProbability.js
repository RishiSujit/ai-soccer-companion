import { useState, useEffect } from 'react';
import { getLiveWinProbability } from '../services/api';
import './OddsCard.css';

function LiveProbability({ homeTeam, awayTeam, homeScore, awayScore, minute, onAskAI }) {
  const [prob, setProb] = useState(null);
  const bucket = Math.floor((minute || 0) / 10);

  useEffect(() => {
    if (!homeTeam || !awayTeam || minute === undefined) return;
    getLiveWinProbability(homeTeam, awayTeam, homeScore, awayScore, minute)
      .then(data => setProb(data.probability || null))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeTeam, awayTeam, homeScore, awayScore, bucket]);

  if (!prob) return null;

  return (
    <div className="live-prob-card">
      <div className="live-prob-card__header">
        <span className="live-prob-card__label">Win probability</span>
        {prob.momentum && prob.momentum !== 'even' && (
          <span className="live-prob-card__momentum">
            {prob.momentum === 'home' ? homeTeam : awayTeam} momentum ↑
          </span>
        )}
      </div>
      <div className="live-prob-bar">
        <div
          className="live-prob-seg live-prob-seg--home"
          style={{ width: `${prob.homeWinPct}%` }}
        >
          {prob.homeWinPct >= 15 && `${prob.homeWinPct}%`}
        </div>
        <div
          className="live-prob-seg live-prob-seg--draw"
          style={{ width: `${prob.drawPct}%` }}
        >
          {prob.drawPct >= 12 && `${prob.drawPct}%`}
        </div>
        <div
          className="live-prob-seg live-prob-seg--away"
          style={{ width: `${prob.awayWinPct}%` }}
        >
          {prob.awayWinPct >= 15 && `${prob.awayWinPct}%`}
        </div>
      </div>
      {prob.context && (
        <div className="live-prob-context">{prob.context}</div>
      )}
      {onAskAI && (
        <button
          className="live-prob-ask-ai"
          onClick={() => onAskAI(
            `It's minute ${minute} and the score is ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}. The market gives ${homeTeam} ${prob.homeWinPct}% to win. What are the realistic scenarios from here?`
          )}
        >
          💬 Ask about the outlook
        </button>
      )}
    </div>
  );
}

export default LiveProbability;
