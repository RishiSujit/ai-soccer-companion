import { useState, useEffect } from 'react';
import { getLiveMatches } from '../../services/api';
import './MatchSelector.css';

const FLAGS = {
  'Argentina':'🇦🇷','France':'🇫🇷','Brazil':'🇧🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Germany':'🇩🇪','Spain':'🇪🇸',
  'USA':'🇺🇸','Mexico':'🇲🇽','Portugal':'🇵🇹',
  'Netherlands':'🇳🇱','Italy':'🇮🇹','Japan':'🇯🇵',
  'Morocco':'🇲🇦','Senegal':'🇸🇳','Australia':'🇦🇺',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴',
};

const FALLBACK_MATCHES = [
  {
    id: 'match-1',
    homeTeam: 'Argentina', awayTeam: 'France',
    homeScore: 2, awayScore: 1,
    minute: 67, stage: 'Group B',
    status: 'live', kickoff: null,
    homePlayers: [
      { num: 1, name: 'Martínez', pos: 'GK' },
      { num: 3, name: 'Tagliafico', pos: 'DEF' },
      { num: 6, name: 'Romero', pos: 'DEF' },
      { num: 13, name: 'Lisandro', pos: 'DEF' },
      { num: 26, name: 'Molina', pos: 'DEF' },
      { num: 5, name: 'Paredes', pos: 'MID' },
      { num: 7, name: 'De Paul', pos: 'MID' },
      { num: 20, name: 'Mac Allister', pos: 'MID' },
      { num: 11, name: 'Di María', pos: 'FWD' },
      { num: 9, name: 'Lautaro', pos: 'FWD' },
      { num: 10, name: 'Messi', pos: 'FWD' },
    ],
    awayPlayers: [
      { num: 1, name: 'Maignan', pos: 'GK' },
      { num: 22, name: 'Theo H.', pos: 'DEF' },
      { num: 5, name: 'Konaté', pos: 'DEF' },
      { num: 4, name: 'Saliba', pos: 'DEF' },
      { num: 2, name: 'Pavard', pos: 'DEF' },
      { num: 8, name: 'Tchouaméni', pos: 'MID' },
      { num: 14, name: 'Camavinga', pos: 'MID' },
      { num: 11, name: 'Dembélé', pos: 'MID' },
      { num: 10, name: 'Griezmann', pos: 'MID' },
      { num: 7, name: 'Kolo Muani', pos: 'FWD' },
      { num: 9, name: 'Mbappé', pos: 'FWD' },
    ],
    homeFormation: '4-3-3',
    awayFormation: '4-2-3-1',
  },
  {
    id: 'match-2',
    homeTeam: 'USA', awayTeam: 'Mexico',
    homeScore: 0, awayScore: 0,
    minute: 23, stage: 'Group D',
    status: 'live', kickoff: null,
    homePlayers: [
      { num: 1, name: 'Turner', pos: 'GK' },
      { num: 2, name: 'Dest', pos: 'DEF' },
      { num: 5, name: 'Ream', pos: 'DEF' },
      { num: 6, name: 'Richards', pos: 'DEF' },
      { num: 3, name: 'Robinson', pos: 'DEF' },
      { num: 8, name: 'McKennie', pos: 'MID' },
      { num: 4, name: 'Adams', pos: 'MID' },
      { num: 7, name: 'Reyna', pos: 'MID' },
      { num: 10, name: 'Pulisic', pos: 'FWD' },
      { num: 9, name: 'Ferreira', pos: 'FWD' },
      { num: 11, name: 'Weah', pos: 'FWD' },
    ],
    awayPlayers: [
      { num: 1, name: 'Ochoa', pos: 'GK' },
      { num: 2, name: 'Sánchez', pos: 'DEF' },
      { num: 3, name: 'Moreno', pos: 'DEF' },
      { num: 4, name: 'Montes', pos: 'DEF' },
      { num: 23, name: 'Gallardo', pos: 'DEF' },
      { num: 6, name: 'Herrera', pos: 'MID' },
      { num: 8, name: 'Guardado', pos: 'MID' },
      { num: 10, name: 'Lozano', pos: 'MID' },
      { num: 11, name: 'Vega', pos: 'MID' },
      { num: 7, name: 'Corona', pos: 'FWD' },
      { num: 9, name: 'Jiménez', pos: 'FWD' },
    ],
    homeFormation: '4-3-3',
    awayFormation: '4-3-3',
  },
  {
    id: 'match-3',
    homeTeam: 'Brazil', awayTeam: 'Germany',
    homeScore: null, awayScore: null,
    minute: null, stage: 'Group A',
    status: 'upcoming', kickoff: 'Today · 9:00 PM ET',
    homePlayers: [], awayPlayers: [],
    homeFormation: 'TBA', awayFormation: 'TBA',
  },
];

function MatchCard({ match, onMatchSelected }) {
  const isLive = match.status === 'live';

  return (
    <div className={`ms-card ${isLive ? 'ms-card--live' : 'ms-card--upcoming'}`}>
      <div className="ms-card__top">
        {isLive ? (
          <div className="ms-badge ms-badge--live">
            <div className="ms-badge__dot" />
            <span>Live</span>
          </div>
        ) : (
          <div className="ms-badge ms-badge--upcoming">Upcoming</div>
        )}
        <div className="ms-card__stage">{match.stage}</div>
      </div>

      <div className="ms-card__teams">
        <div className="ms-card__team">
          <span className="ms-card__flag">{FLAGS[match.homeTeam] ?? '🌍'}</span>
          <span className="ms-card__team-name">{match.homeTeam}</span>
        </div>
        <div className="ms-card__score-col">
          {isLive ? (
            <>
              <div className="ms-card__score-live">{match.homeScore} – {match.awayScore}</div>
              <div className="ms-card__minute">{match.minute}'</div>
            </>
          ) : (
            <>
              <div className="ms-card__vs">vs</div>
              {match.kickoff && <div className="ms-card__kickoff-time">{match.kickoff}</div>}
            </>
          )}
        </div>
        <div className="ms-card__team ms-card__team--right">
          <span className="ms-card__flag">{FLAGS[match.awayTeam] ?? '🌍'}</span>
          <span className="ms-card__team-name">{match.awayTeam}</span>
        </div>
      </div>

      <button
        className={`ms-card__cta ${isLive ? 'ms-card__cta--live' : 'ms-card__cta--upcoming'}`}
        onClick={isLive ? () => onMatchSelected(match) : undefined}
        disabled={!isLive}
      >
        {isLive ? 'Watch with Companion →' : 'Set reminder'}
      </button>
    </div>
  );
}

function MatchSelector({ onMatchSelected }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLiveMatches().then(data => {
      if (data && Array.isArray(data.matches) && data.matches.length > 0) {
        setMatches(data.matches);
      } else {
        setMatches(FALLBACK_MATCHES);
      }
      setLoading(false);
    });
  }, []);

  const liveCount = matches.filter(m => m.status === 'live').length;

  if (loading) {
    return (
      <div className="match-selector">
        <div className="ms-loading">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="match-selector">
      <div className="ms-topbar">
        <div className="ms-topbar__brand">⚽ World<span>Cup</span> Companion</div>
        {liveCount > 0 && (
          <div className="ms-topbar__live-badge">
            <div className="ms-topbar__dot" />
            {liveCount} live
          </div>
        )}
      </div>

      <div className="ms-header">
        <h2 className="ms-title">Choose a match</h2>
        <p className="ms-subtitle">Select a live or upcoming game to follow</p>
      </div>

      <div className="ms-cards">
        {matches.map(match => (
          <MatchCard key={match.id} match={match} onMatchSelected={onMatchSelected} />
        ))}
      </div>
    </div>
  );
}

export default MatchSelector;
