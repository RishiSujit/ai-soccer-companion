import './PivotalMomentAlert.css';

const EVENT_ICONS = {
  'Goal': '⚽',
  'Red Card': '🟥',
  'Yellow Card': '🟨',
  'VAR': '📺',
  'Penalty': '🎯',
  'Missed Penalty': '😱',
  'subst': '🔄',
};

function getEventTitle(event, isUserTeamEvent) {
  if (event.type === 'Goal') {
    return isUserTeamEvent ? '⚽ GOAL!' : '⚽ Goal conceded';
  }
  if (event.type === 'Red Card') {
    return isUserTeamEvent ? '🟥 Red card — 10 men!' : '🟥 Opposition down to 10!';
  }
  if (event.type === 'VAR') {
    return '📺 VAR Review';
  }
  const icon = EVENT_ICONS[event.type] || '⚡';
  return `${icon} ${event.type}`;
}

function PivotalMomentAlert({ event, signals, userTeam, onAskCompanion, onDismiss }) {
  if (!event) return null;

  const isUserTeamEvent = event.team?.name === userTeam;
  const minute = event.time?.elapsed ?? event.minute;

  return (
    <div className="pivotal-alert" onClick={onDismiss}>
      <div className="pivotal-alert-inner" onClick={e => e.stopPropagation()}>
        <div className="pivotal-left">
          <div className="pivotal-title">{getEventTitle(event, isUserTeamEvent)}</div>
          <div className="pivotal-detail">
            {event.player?.name && `${event.player.name} · `}{minute}'
          </div>
          {signals?.narrative && (
            <div className="pivotal-narrative">
              {signals.narrative.slice(0, 60)}...
            </div>
          )}
        </div>
        <button
          className="pivotal-ask-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAskCompanion(`What just happened with the ${event.type}?`);
            onDismiss();
          }}
        >
          Ask →
        </button>
      </div>
    </div>
  );
}

export default PivotalMomentAlert;
