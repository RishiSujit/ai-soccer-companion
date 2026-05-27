import './BriefingCard.css';

function formatKickoff(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function splitBriefingText(text) {
  const readyIdx = text.indexOf("You're ready");
  if (readyIdx === -1) return { mainText: text, readyLine: '' };
  return {
    mainText: text.slice(0, readyIdx).trim(),
    readyLine: text.slice(readyIdx).trim(),
  };
}

function BriefingCard({ briefing, onDismiss, onNavigate }) {
  const { mainText, readyLine } = splitBriefingText(briefing.briefing || '');

  return (
    <div className="briefing-overlay" onClick={onDismiss}>
      <div className="briefing-card" onClick={e => e.stopPropagation()}>

        <div className="briefing-pre-label">⏰ MATCH IN 2 HOURS</div>

        <div className="briefing-title">
          {briefing.homeTeam} vs {briefing.awayTeam}
        </div>

        <div className="briefing-meta">
          {briefing.stage} · {formatKickoff(briefing.kickoffTime)}
        </div>

        <div className="briefing-divider" />

        <div className="briefing-body">{mainText}</div>

        {readyLine && (
          <div className="briefing-ready-line">{readyLine}</div>
        )}

        <div className="briefing-actions">
          <button className="briefing-btn-primary" onClick={onDismiss}>
            Let's go ⚽
          </button>
          <button
            className="briefing-btn-secondary"
            onClick={() => {
              onDismiss();
              onNavigate('companion');
            }}
          >
            Go to Companion →
          </button>
        </div>

      </div>
    </div>
  );
}

export default BriefingCard;
