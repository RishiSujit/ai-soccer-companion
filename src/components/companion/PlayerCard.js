import { useState, useEffect } from 'react';
import { getPlayerCard } from '../../services/api';
import './PlayerCard.css';

const FLAGS = {
  'Argentina':'🇦🇷','France':'🇫🇷','Brazil':'🇧🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Germany':'🇩🇪','Spain':'🇪🇸',
  'USA':'🇺🇸','Mexico':'🇲🇽','Portugal':'🇵🇹',
  'Netherlands':'🇳🇱','Italy':'🇮🇹','Japan':'🇯🇵',
  'Morocco':'🇲🇦','Senegal':'🇸🇳','Australia':'🇦🇺',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴',
};

const TIER_STYLES = {
  gold: {
    bg: '#1a1500',
    border: 'rgba(255, 204, 68, 0.25)',
    accent: '#ffcc44',
    avatarBg: '#2a1f00',
    avatarBorder: 'rgba(255, 204, 68, 0.18)',
  },
  silver: {
    bg: '#0f0f20',
    border: 'rgba(119, 153, 255, 0.25)',
    accent: '#7799ff',
    avatarBg: '#0f0f2a',
    avatarBorder: 'rgba(119, 153, 255, 0.18)',
  },
  bronze: {
    bg: '#150a00',
    border: 'rgba(204, 119, 68, 0.25)',
    accent: '#cc7744',
    avatarBg: '#1f0f00',
    avatarBorder: 'rgba(204, 119, 68, 0.18)',
  },
};

const getInitials = (name) => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function StatBar({ label, value, accent }) {
  return (
    <div className="pc-stat-row">
      <span className="pc-stat-label">{label}</span>
      <div className="pc-stat-bar-track">
        <div
          className="pc-stat-bar-fill"
          style={{ width: `${Math.min(value ?? 0, 99)}%`, background: accent }}
        />
      </div>
      <span className="pc-stat-value" style={{ color: accent }}>{value ?? '—'}</span>
    </div>
  );
}

function CardSkeleton() {
  const styles = TIER_STYLES.silver;
  return (
    <div
      className="pc-card pc-card--skeleton"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
      onClick={e => e.stopPropagation()}
    >
      <div className="pc-skeleton-header">
        <div className="pc-shimmer" style={{ width: 40, height: 36, borderRadius: 6 }} />
        <div className="pc-shimmer" style={{ width: 22, height: 22, borderRadius: '50%' }} />
      </div>
      <div className="pc-shimmer pc-shimmer--avatar" />
      <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        <div className="pc-shimmer" style={{ width: '70%', height: 11, borderRadius: 4 }} />
        <div className="pc-shimmer" style={{ width: '45%', height: 9, borderRadius: 4 }} />
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="pc-shimmer" style={{ width: '100%', height: 7, borderRadius: 2 }} />
        ))}
      </div>
      <div className="pc-skeleton-generating">Generating card...</div>
    </div>
  );
}

function PlayerCard({ player, team, userContext, onClose }) {
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPlayerCard(player.name, team, player.pos, userContext)
      .then(data => {
        if (data.success) {
          setCardData(data.card);
        } else {
          setError(data.error || 'Failed to generate card');
        }
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false));
  }, [player.name, team, player.pos]);

  const tier = cardData?.tier || 'silver';
  const styles = TIER_STYLES[tier] || TIER_STYLES.silver;

  return (
    <div className="pc-overlay" onClick={onClose}>

      {loading && <CardSkeleton />}

      {!loading && error && (
        <div
          className="pc-card pc-card--error"
          style={{ background: TIER_STYLES.silver.bg, border: `1px solid ${TIER_STYLES.silver.border}` }}
          onClick={e => e.stopPropagation()}
        >
          <div className="pc-error-msg">{error}</div>
          <button className="pc-error-close" onClick={onClose}>Close</button>
        </div>
      )}

      {!loading && cardData && (
        <div
          className="pc-card"
          style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
          onClick={e => e.stopPropagation()}
        >
          {/* 1. Header */}
          <div className="pc-header">
            <div>
              <div className="pc-rating" style={{ color: styles.accent }}>{cardData.rating}</div>
              <div className="pc-pos" style={{ color: `${styles.accent}99` }}>{player.pos}</div>
            </div>
            <div className="pc-flag">{FLAGS[team] ?? '🌍'}</div>
          </div>

          {/* 2. Avatar */}
          <div
            className="pc-avatar"
            style={{ background: styles.avatarBg, border: `1px solid ${styles.avatarBorder}`, color: styles.accent }}
          >
            {getInitials(player.name)}
          </div>

          {/* 3. Name + club */}
          <div className="pc-nameblock">
            <div className="pc-name">{player.name}</div>
            <div className="pc-club">{cardData.club}</div>
          </div>

          {/* 4. Stats bars */}
          <div className="pc-stats">
            <StatBar label="PAC" value={cardData.pace}      accent={styles.accent} />
            <StatBar label="DRI" value={cardData.dribbling} accent={styles.accent} />
            <StatBar label="SHO" value={cardData.shooting}  accent={styles.accent} />
            <StatBar label="PAS" value={cardData.passing}   accent={styles.accent} />
            <StatBar label="VIS" value={cardData.vision}    accent={styles.accent} />
          </div>

          {/* 5. Traits */}
          {cardData.traits?.length > 0 && (
            <div className="pc-traits">
              {cardData.traits.map((trait, i) => (
                <span
                  key={i}
                  className="pc-trait"
                  style={{
                    background: `${styles.accent}18`,
                    border: `1px solid ${styles.accent}40`,
                    color: styles.accent,
                  }}
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          {/* 6. Companion insight */}
          {cardData.insight && (
            <div className="pc-insight">
              <div className="pc-insight__label">COMPANION SAYS</div>
              <div className="pc-insight__text">{cardData.insight}</div>
            </div>
          )}

          {/* 7. World Cup stat */}
          {cardData.worldCupStats && (
            <div className="pc-worldcup">
              <div className="pc-worldcup__label" style={{ color: styles.accent }}>⚽ WORLD CUP</div>
              <div className="pc-worldcup__text">{cardData.worldCupStats}</div>
            </div>
          )}

          {/* 8. Close hint */}
          <div className="pc-close-hint">tap anywhere to close</div>
        </div>
      )}

    </div>
  );
}

export default PlayerCard;
