import { useState } from 'react';
import PlayerCard from './PlayerCard';
import PlayerFifaCard from './PlayerFifaCard';

const FLAGS = {
  'Argentina':'🇦🇷','France':'🇫🇷','Brazil':'🇧🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Germany':'🇩🇪','Spain':'🇪🇸',
  'USA':'🇺🇸','Mexico':'🇲🇽','Portugal':'🇵🇹',
  'Netherlands':'🇳🇱','Italy':'🇮🇹','Japan':'🇯🇵',
  'Morocco':'🇲🇦','Senegal':'🇸🇳','Australia':'🇦🇺',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴',
};

const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD'];
const POS_LABELS = { GK: 'GOALKEEPER', DEF: 'DEFENDERS', MID: 'MIDFIELDERS', FWD: 'FORWARDS' };

function groupByPos(players) {
  const grouped = { GK: [], DEF: [], MID: [], FWD: [] };
  (players || []).forEach(p => { if (grouped[p.pos]) grouped[p.pos].push(p); });
  return grouped;
}

function LiveLineup({ homePlayers, awayPlayers, homeTeam, awayTeam, homeFormation, awayFormation, userContext }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  function renderColumn(players, team, formation) {
    const grouped = groupByPos(players);
    const flag = FLAGS[team] ?? '🌍';
    return (
      <div className="lineup-col">
        <div className="lineup-col__header">
          <span className="lineup-col__flag">{flag}</span>
          <span className="lineup-col__team">{team}</span>
          <span className="lineup-col__formation">{formation}</span>
        </div>
        {POS_ORDER.map(pos => {
          const posPlayers = grouped[pos];
          if (!posPlayers?.length) return null;
          return (
            <div key={pos} className="lineup-group">
              <div className="lineup-group__label">{POS_LABELS[pos]}</div>
              {posPlayers.map(p => (
                <div
                  key={`${pos}-${p.num}`}
                  className="lineup-player lineup-player--clickable"
                  onClick={() => { setSelectedPlayer(p); setSelectedTeam(team); }}
                >
                  <span className="lineup-player__num">{p.num}</span>
                  <span className="lineup-player__name">{p.name}</span>
                  <span className={`lineup-player__badge lineup-badge--${p.pos.toLowerCase()}`}>{p.pos}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  if (!homePlayers?.length && !awayPlayers?.length) {
    return <div className="lineup-empty">Lineups not yet available</div>;
  }

  return (
    <>
      <div className="lineup-list">
        {renderColumn(homePlayers, homeTeam, homeFormation)}
        {renderColumn(awayPlayers, awayTeam, awayFormation)}
      </div>
      {selectedPlayer && (
        <PlayerCard
          player={selectedPlayer}
          team={selectedTeam}
          userContext={userContext}
          onClose={() => { setSelectedPlayer(null); setSelectedTeam(null); }}
        />
      )}
    </>
  );
}

function PreMatchLineup({ match, homeSquad, awaySquad, squadLoading }) {
  const [activeTeam, setActiveTeam] = useState('home');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const squad = activeTeam === 'home' ? homeSquad : awaySquad;
  const teamName = activeTeam === 'home' ? match?.homeTeam : match?.awayTeam;
  const teamFlag = activeTeam === 'home'
    ? (match?.homeFlag || FLAGS[match?.homeTeam] || '🌍')
    : (match?.awayFlag || FLAGS[match?.awayTeam] || '🌍');

  if (squadLoading) {
    return (
      <div className="lineup-loading">
        <div className="lineup-loading-dots">
          <span /><span /><span />
        </div>
        <p>Fetching confirmed squads...</p>
      </div>
    );
  }

  return (
    <div className="lineup-container">
      <div className="lineup-team-switch">
        <button
          className={`lineup-team-btn ${activeTeam === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTeam('home')}
        >
          {match?.homeFlag || FLAGS[match?.homeTeam] || '🌍'} {match?.homeTeam}
        </button>
        <button
          className={`lineup-team-btn ${activeTeam === 'away' ? 'active' : ''}`}
          onClick={() => setActiveTeam('away')}
        >
          {match?.awayFlag || FLAGS[match?.awayTeam] || '🌍'} {match?.awayTeam}
        </button>
      </div>

      {squad ? (
        <>
          <div className="lineup-squad-meta">
            <span className="lineup-formation">{squad.formation}</span>
            <span className="lineup-coach">Coach: {squad.coach}</span>
          </div>

          <div className="lineup-section-title">Likely Starting XI</div>
          <div className="lineup-players-grid">
            {squad.players?.slice(0, 11).map(player => (
              <button
                key={player.number}
                className={`lineup-player-card${player.isKeyStar ? ' key-star' : ''}`}
                onClick={() => setSelectedPlayer(player)}
              >
                <div className="lpc-number">{player.number}</div>
                <div className="lpc-info">
                  <div className="lpc-name">{player.name}</div>
                  <div className="lpc-pos">{player.position} · {player.club}</div>
                </div>
                {player.isKeyStar && <div className="lpc-star">★</div>}
              </button>
            ))}
          </div>

          {squad.players?.length > 11 && (
            <>
              <div className="lineup-section-title">Full Squad</div>
              <div className="lineup-players-grid">
                {squad.players.slice(11).map(player => (
                  <button
                    key={player.number}
                    className="lineup-player-card sub"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="lpc-number">{player.number}</div>
                    <div className="lpc-info">
                      <div className="lpc-name">{player.name}</div>
                      <div className="lpc-pos">{player.position} · {player.club}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="lineup-unavailable">
          <div className="lineup-unavail-icon">📋</div>
          <div className="lineup-unavail-text">Squad data unavailable</div>
          <div className="lineup-unavail-sub">Official lineup released 1 hour before kickoff</div>
        </div>
      )}

      {selectedPlayer && (
        <PlayerFifaCard
          player={selectedPlayer}
          teamName={teamName}
          teamFlag={teamFlag}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

function LineupList({ homePlayers, awayPlayers, homeTeam, awayTeam, homeFormation, awayFormation, userContext, homeSquad, awaySquad, squadLoading, isUpcoming, homeFlag, awayFlag, ...rest }) {
  const match = { homeTeam, awayTeam, homeFlag, awayFlag, ...rest };

  if (isUpcoming) {
    return (
      <PreMatchLineup
        match={match}
        homeSquad={homeSquad}
        awaySquad={awaySquad}
        squadLoading={squadLoading}
      />
    );
  }

  return (
    <LiveLineup
      homePlayers={homePlayers}
      awayPlayers={awayPlayers}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      homeFormation={homeFormation}
      awayFormation={awayFormation}
      userContext={userContext}
    />
  );
}

export default LineupList;
