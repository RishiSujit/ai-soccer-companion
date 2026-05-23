import { useState } from 'react';
import PlayerCard from './PlayerCard';

const FLAGS = {
  'Argentina':'🇦🇷','France':'🇫🇷','Brazil':'🇧🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Germany':'🇩🇪','Spain':'🇪🇸',
  'USA':'🇺🇸','Mexico':'🇲🇽','Portugal':'🇵🇹',
  'Netherlands':'🇳🇱','Italy':'🇮🇹','Japan':'🇯🇵',
  'Morocco':'🇲🇦','Senegal':'🇸🇳','Australia':'🇦🇺',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴',
};

const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD'];
const POS_LABELS = {
  GK: 'GOALKEEPER',
  DEF: 'DEFENDERS',
  MID: 'MIDFIELDERS',
  FWD: 'FORWARDS',
};

function groupByPos(players) {
  const grouped = { GK: [], DEF: [], MID: [], FWD: [] };
  (players || []).forEach(p => {
    if (grouped[p.pos]) grouped[p.pos].push(p);
  });
  return grouped;
}

function LineupList({ homePlayers, awayPlayers, homeTeam, awayTeam, homeFormation, awayFormation, userContext }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const handlePlayerClick = (player, team) => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  const handleClose = () => {
    setSelectedPlayer(null);
    setSelectedTeam(null);
  };

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
          if (!posPlayers || posPlayers.length === 0) return null;
          return (
            <div key={pos} className="lineup-group">
              <div className="lineup-group__label">{POS_LABELS[pos]}</div>
              {posPlayers.map(p => (
                <div
                  key={`${pos}-${p.num}`}
                  className="lineup-player lineup-player--clickable"
                  onClick={() => handlePlayerClick(p, team)}
                >
                  <span className="lineup-player__num">{p.num}</span>
                  <span className="lineup-player__name">{p.name}</span>
                  <span className={`lineup-player__badge lineup-badge--${p.pos.toLowerCase()}`}>
                    {p.pos}
                  </span>
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
          onClose={handleClose}
        />
      )}
    </>
  );
}

export default LineupList;
