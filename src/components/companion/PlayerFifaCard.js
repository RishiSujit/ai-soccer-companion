const POSITION_COLORS = {
  GK:  { bg: '#f5a623', text: '#1a0800' },
  CB:  { bg: '#378ADD', text: '#fff' },
  RB:  { bg: '#378ADD', text: '#fff' },
  LB:  { bg: '#378ADD', text: '#fff' },
  CDM: { bg: '#00ff87', text: '#020d06' },
  CM:  { bg: '#00ff87', text: '#020d06' },
  CAM: { bg: '#00ff87', text: '#020d06' },
  RM:  { bg: '#9b59b6', text: '#fff' },
  LM:  { bg: '#9b59b6', text: '#fff' },
  RW:  { bg: '#ff4d6d', text: '#fff' },
  LW:  { bg: '#ff4d6d', text: '#fff' },
  ST:  { bg: '#ff4d6d', text: '#fff' },
};

export default function PlayerFifaCard({ player, teamName, teamFlag, onClose }) {
  const colors = POSITION_COLORS[player.position] || { bg: '#4a4a6a', text: '#fff' };

  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fifa-card-overlay" onClick={onClose}>
      <div className="fifa-card" onClick={e => e.stopPropagation()}>

        <div className="fifa-card-header" style={{ background: colors.bg }}>
          <div className="fifa-card-pos" style={{ color: colors.text }}>{player.position}</div>
          <div className="fifa-card-number" style={{ color: colors.text }}>{player.number}</div>
          <button className="fifa-card-close" onClick={onClose} style={{ color: colors.text }}>✕</button>
        </div>

        <div className="fifa-card-avatar" style={{ background: colors.bg + '33' }}>
          <div className="fifa-avatar-placeholder" style={{ color: colors.bg }}>{initials}</div>
        </div>

        <div className="fifa-card-name">{player.name}</div>
        <div className="fifa-card-team">{teamFlag} {teamName}</div>

        {player.isKeyStar && (
          <div className="fifa-star-badge">⭐ Key Player</div>
        )}

        <div className="fifa-card-stats">
          <div className="fifa-stat">
            <span className="fifa-stat-value">{player.number}</span>
            <span className="fifa-stat-label">Shirt</span>
          </div>
          <div className="fifa-stat">
            <span className="fifa-stat-value">{player.age ?? '—'}</span>
            <span className="fifa-stat-label">Age</span>
          </div>
          <div className="fifa-stat">
            <span className="fifa-stat-value">{player.caps ?? '—'}</span>
            <span className="fifa-stat-label">Caps</span>
          </div>
          {player.goals !== undefined && (
            <div className="fifa-stat">
              <span className="fifa-stat-value">{player.goals}</span>
              <span className="fifa-stat-label">Goals</span>
            </div>
          )}
        </div>

        <div className="fifa-card-club">🏟 {player.club}</div>
        <div className="fifa-card-position-full">{player.positionFull || player.position}</div>

        {player.isKeyStar && player.starReason && (
          <div className="fifa-star-reason">"{player.starReason}"</div>
        )}

        <button className="fifa-card-dismiss" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
