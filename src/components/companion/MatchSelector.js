import { useState, useEffect } from 'react';
import { getLiveMatches } from '../../services/api';
import { TEST_MATCH, TEST_MATCH_ENABLED } from '../../lib/testMatchData';
import './MatchSelector.css';

const FLAGS = {
  'Argentina':'🇦🇷','France':'🇫🇷','Brazil':'🇧🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Germany':'🇩🇪','Spain':'🇪🇸',
  'USA':'🇺🇸','Mexico':'🇲🇽','Portugal':'🇵🇹',
  'Netherlands':'🇳🇱','Italy':'🇮🇹','Japan':'🇯🇵',
  'Morocco':'🇲🇦','Senegal':'🇸🇳','Australia':'🇦🇺',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴',
  'Paris Saint-Germain':'🇫🇷',
};

const FALLBACK_MATCHES = [
  {
    id: 'match-1',
    homeTeam: 'Argentina', awayTeam: 'France',
    homeScore: 2, awayScore: 1, minute: 67,
    stage: 'Group B', status: 'live', kickoff: null,
    homePlayers: [
      { num: 1, name: 'Martínez', pos: 'GK' }, { num: 3, name: 'Tagliafico', pos: 'DEF' },
      { num: 6, name: 'Romero', pos: 'DEF' }, { num: 13, name: 'Lisandro', pos: 'DEF' },
      { num: 26, name: 'Molina', pos: 'DEF' }, { num: 5, name: 'Paredes', pos: 'MID' },
      { num: 7, name: 'De Paul', pos: 'MID' }, { num: 20, name: 'Mac Allister', pos: 'MID' },
      { num: 11, name: 'Di María', pos: 'FWD' }, { num: 9, name: 'Lautaro', pos: 'FWD' },
      { num: 10, name: 'Messi', pos: 'FWD' },
    ],
    awayPlayers: [
      { num: 1, name: 'Maignan', pos: 'GK' }, { num: 22, name: 'Theo H.', pos: 'DEF' },
      { num: 5, name: 'Konaté', pos: 'DEF' }, { num: 4, name: 'Saliba', pos: 'DEF' },
      { num: 2, name: 'Pavard', pos: 'DEF' }, { num: 8, name: 'Tchouaméni', pos: 'MID' },
      { num: 14, name: 'Camavinga', pos: 'MID' }, { num: 11, name: 'Dembélé', pos: 'MID' },
      { num: 10, name: 'Griezmann', pos: 'MID' }, { num: 7, name: 'Kolo Muani', pos: 'FWD' },
      { num: 9, name: 'Mbappé', pos: 'FWD' },
    ],
    homeFormation: '4-3-3', awayFormation: '4-2-3-1',
  },
  {
    id: 'match-2',
    homeTeam: 'USA', awayTeam: 'Mexico',
    homeScore: 0, awayScore: 0, minute: 23,
    stage: 'Group D', status: 'live', kickoff: null,
    homePlayers: [
      { num: 1, name: 'Turner', pos: 'GK' }, { num: 2, name: 'Dest', pos: 'DEF' },
      { num: 5, name: 'Ream', pos: 'DEF' }, { num: 6, name: 'Richards', pos: 'DEF' },
      { num: 3, name: 'Robinson', pos: 'DEF' }, { num: 8, name: 'McKennie', pos: 'MID' },
      { num: 4, name: 'Adams', pos: 'MID' }, { num: 7, name: 'Reyna', pos: 'MID' },
      { num: 10, name: 'Pulisic', pos: 'FWD' }, { num: 9, name: 'Ferreira', pos: 'FWD' },
      { num: 11, name: 'Weah', pos: 'FWD' },
    ],
    awayPlayers: [
      { num: 1, name: 'Ochoa', pos: 'GK' }, { num: 2, name: 'Sánchez', pos: 'DEF' },
      { num: 3, name: 'Moreno', pos: 'DEF' }, { num: 4, name: 'Montes', pos: 'DEF' },
      { num: 23, name: 'Gallardo', pos: 'DEF' }, { num: 6, name: 'Herrera', pos: 'MID' },
      { num: 8, name: 'Guardado', pos: 'MID' }, { num: 10, name: 'Lozano', pos: 'MID' },
      { num: 11, name: 'Vega', pos: 'MID' }, { num: 7, name: 'Corona', pos: 'FWD' },
      { num: 9, name: 'Jiménez', pos: 'FWD' },
    ],
    homeFormation: '4-3-3', awayFormation: '4-3-3',
  },
  {
    id: 'match-3',
    homeTeam: 'Brazil', awayTeam: 'Germany',
    homeScore: null, awayScore: null, minute: null,
    stage: 'Group A', status: 'NS', kickoff: 'Today · 9:00 PM ET',
    homePlayers: [], awayPlayers: [],
    homeFormation: 'TBA', awayFormation: 'TBA',
  },
  {
    id: 'match-4',
    homeTeam: 'Spain', awayTeam: 'Morocco',
    homeScore: null, awayScore: null, minute: null,
    stage: 'Group E', status: 'upcoming', kickoff: 'Tomorrow · 3:00 PM ET',
    homePlayers: [], awayPlayers: [],
    homeFormation: 'TBA', awayFormation: 'TBA',
  },
  {
    id: 'match-5',
    homeTeam: 'England', awayTeam: 'Portugal',
    homeScore: 1, awayScore: 0, minute: null,
    stage: 'Group C', status: 'FT', kickoff: null,
    homePlayers: [], awayPlayers: [],
    homeFormation: '4-3-3', awayFormation: '4-3-3',
  },
  {
    id: 'match-6',
    homeTeam: 'Netherlands', awayTeam: 'Japan',
    homeScore: 2, awayScore: 2, minute: null,
    stage: 'Group F', status: 'FT', kickoff: null,
    homePlayers: [], awayPlayers: [],
    homeFormation: '4-3-3', awayFormation: '4-2-3-1',
  },
];

const FILTER_TABS = ['Live', 'Today', 'Upcoming', 'Results'];

function filterMatches(matches, tab) {
  if (tab === 'Live')     return matches.filter(m => m.status === 'live' || m.status === '1H' || m.status === '2H' || m.status === 'ET' || m.status === 'P');
  if (tab === 'Today')    return matches.filter(m => m.status === 'NS');
  if (tab === 'Upcoming') return matches.filter(m => m.status === 'upcoming' || m.status === 'scheduled' || m.status === 'TBD');
  if (tab === 'Results')  return matches.filter(m => m.status === 'FT' || m.status === 'finished' || m.status === 'AET' || m.status === 'PEN');
  return matches;
}

function MatchCard({ match, onMatchSelected }) {
  const isLive    = match.status === 'live' || ['1H','2H','ET','P'].includes(match.status);
  const isResult  = match.status === 'FT' || ['finished','AET','PEN'].includes(match.status);

  return (
    <div className={`ms-card ${isLive ? 'ms-card--live' : isResult ? 'ms-card--result' : 'ms-card--upcoming'}`}>
      <div className="ms-card__top">
        {isLive ? (
          <div className="ms-badge ms-badge--live">
            <div className="ms-badge__dot" />
            <span>Live</span>
          </div>
        ) : isResult ? (
          <div className="ms-badge ms-badge--result">Final</div>
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
          ) : isResult ? (
            <div className="ms-card__score-ft">{match.homeScore} – {match.awayScore}</div>
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

      {(isLive || isResult) && (
        <button
          className={`ms-card__cta ${isLive ? 'ms-card__cta--live' : 'ms-card__cta--result'}`}
          onClick={() => onMatchSelected(match)}
        >
          {isLive ? 'Watch with Companion →' : 'Ask about this match →'}
        </button>
      )}
    </div>
  );
}

function MatchSelector({ onMatchSelected }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Live');

  useEffect(() => {
    getLiveMatches().then(data => {
      if (data?.matches?.length > 0) {
        setMatches(data.matches);
      } else {
        setMatches(FALLBACK_MATCHES);
      }
      setLoading(false);
    });
  }, []);

  const liveCount = matches.filter(m =>
    m.status === 'live' || ['1H','2H','ET','P'].includes(m.status)
  ).length;

  const filtered = filterMatches(matches, activeFilter);

  return (
    <div className="match-selector">

      {/* ── TEST: UCL Final card ───────────────────────────── */}
      {TEST_MATCH_ENABLED && TEST_MATCH && (
        <div className="ms-test-card" onClick={() => onMatchSelected(TEST_MATCH)}>
          <div className="ms-test-card__badge">🧪 TEST MATCH</div>
          <div className="ms-test-card__stage">{TEST_MATCH.stage}</div>
          <div className="ms-test-card__teams">
            <span>{FLAGS[TEST_MATCH.homeTeam] ?? '🌍'}</span>
            <span className="ms-test-card__names">
              {TEST_MATCH.homeTeam} vs {TEST_MATCH.awayTeam}
            </span>
            <span>{FLAGS[TEST_MATCH.awayTeam] ?? '🌍'}</span>
          </div>
          <div className="ms-test-card__kickoff">{TEST_MATCH.kickoffDisplay}</div>
        </div>
      )}

      {/* ── General Companion card ─────────────────────────── */}
      <div className="ms-general-card" onClick={() => onMatchSelected({ general: true })}>
        <div className="ms-general-card__body">
          <div className="ms-general-card__label">GENERAL COMPANION</div>
          <div className="ms-general-card__title">Ask anything about the 2026 World Cup</div>
          <div className="ms-general-card__hints">
            <span>Rules</span>
            <span>Players</span>
            <span>Tactics</span>
            <span>History</span>
          </div>
        </div>
        <div className="ms-general-card__arrow">→</div>
      </div>

      {/* ── Filter tabs ────────────────────────────────────── */}
      <div className="ms-filter-tabs">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            className={`ms-filter-tab ${activeFilter === tab ? 'ms-filter-tab--active' : ''}`}
            onClick={() => setActiveFilter(tab)}
          >
            {tab}
            {tab === 'Live' && liveCount > 0 && (
              <span className="ms-filter-tab__badge">{liveCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Match cards ────────────────────────────────────── */}
      <div className="ms-cards">
        {loading ? (
          <div className="ms-loading">Loading matches...</div>
        ) : filtered.length === 0 ? (
          <div className="ms-empty">
            No {activeFilter.toLowerCase()} matches right now
          </div>
        ) : (
          filtered.map(match => (
            <MatchCard key={match.id} match={match} onMatchSelected={onMatchSelected} />
          ))
        )}
      </div>

    </div>
  );
}

export default MatchSelector;
