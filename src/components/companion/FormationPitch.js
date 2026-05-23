import { useState } from 'react';
import PlayerCard from './PlayerCard';

const HOME_Y = {
  1: [25],
  2: [22, 35],
  3: [20, 32, 43],
  4: [18, 28, 37, 46],
};

const AWAY_Y = {
  1: [75],
  2: [65, 78],
  3: [57, 68, 80],
  4: [54, 63, 72, 82],
};

const H_POS = {
  1: [50],
  2: [30, 70],
  3: [20, 50, 80],
  4: [15, 38, 62, 85],
  5: [10, 28, 50, 72, 90],
};

function getPositions(players, formation, isHome) {
  if (!players || players.length === 0) return [];

  const rawLayers = (formation || '4-4-2')
    .split('-')
    .map(Number)
    .filter(n => !isNaN(n) && n > 0);

  if (rawLayers.length === 0) return [];

  const numLayers = rawLayers.length;
  const yBase = isHome
    ? (HOME_Y[numLayers] || HOME_Y[3])
    : (AWAY_Y[numLayers] || AWAY_Y[3]);

  // Reverse away positions so DEF stays close to their GK at 93%
  const yPositions = isHome ? yBase : [...yBase].reverse();

  const result = [];

  if (players[0]) {
    result.push({ player: players[0], x: 50, y: isHome ? 7 : 93 });
  }

  let idx = 1;
  rawLayers.forEach((count, layerIdx) => {
    const y = yPositions[layerIdx] ?? (isHome ? 30 : 70);
    const clampedCount = Math.min(count, 5);
    const xArr = H_POS[clampedCount] || H_POS[3];

    for (let i = 0; i < count && idx < players.length; i++, idx++) {
      result.push({ player: players[idx], x: xArr[i] ?? 50, y });
    }
  });

  return result;
}

function FormationPitch({ homePlayers, awayPlayers, homeTeam, awayTeam, homeFormation, awayFormation, userContext }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const homePos = getPositions(homePlayers || [], homeFormation, true);
  const awayPos = getPositions(awayPlayers || [], awayFormation, false);
  const isEmpty = homePos.length === 0 && awayPos.length === 0;

  const handlePlayerClick = (player, team) => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  const handleClose = () => {
    setSelectedPlayer(null);
    setSelectedTeam(null);
  };

  return (
    <>
      <div className="fp-wrapper">
        <div className="fp-pitch">
          <div className="fp-line fp-halfway" />
          <div className="fp-circle fp-center-circle" />
          <div className="fp-box fp-box--top" />
          <div className="fp-box fp-box--bottom" />

          {isEmpty && (
            <div className="fp-empty">Lineups not yet available</div>
          )}

          {homePos.map(({ player, x, y }) => (
            <div
              key={`home-${player.num}`}
              className="fp-player fp-player--clickable"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => handlePlayerClick(player, homeTeam)}
            >
              <div className="fp-player__dot fp-player__dot--home">{player.num}</div>
              <div className="fp-player__name">{player.name}</div>
            </div>
          ))}

          {awayPos.map(({ player, x, y }) => (
            <div
              key={`away-${player.num}`}
              className="fp-player fp-player--clickable"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => handlePlayerClick(player, awayTeam)}
            >
              <div className="fp-player__dot fp-player__dot--away">{player.num}</div>
              <div className="fp-player__name">{player.name}</div>
            </div>
          ))}
        </div>

        <div className="fp-legend">
          <div className="fp-legend__item">
            <div className="fp-legend__dot fp-legend__dot--home" />
            <span>{homeTeam}</span>
          </div>
          <div className="fp-legend__item">
            <div className="fp-legend__dot fp-legend__dot--away" />
            <span>{awayTeam}</span>
          </div>
        </div>

        <div className="fp-formations">
          <span className="fp-formations__home">{homeTeam} · {homeFormation}</span>
          <span className="fp-formations__away">{awayFormation} · {awayTeam}</span>
        </div>

        <div className="fp-tap-hint">Tap a player for their card</div>
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

export default FormationPitch;
