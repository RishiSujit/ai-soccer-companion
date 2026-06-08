import { useState, useEffect } from 'react';
import { getLiveMatches } from '../../services/api';
import { OPENING_MATCHES } from '../../lib/worldCupData';
import './MatchSelector.css';

const FLAGS = {
  'Argentina': '🇦🇷', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Morocco': '🇲🇦',
  'Senegal': '🇸🇳', 'Australia': '🇦🇺', 'Croatia': '🇭🇷',
  'Uruguay': '🇺🇾', 'South Korea': '🇰🇷', 'Czechia': '🇨🇿',
  'South Africa': '🇿🇦', 'Canada': '🇨🇦', 'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭', 'Bosnia & Herzegovina': '🇧🇦',
  'Paraguay': '🇵🇾', 'Türkiye': '🇹🇷', 'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨', 'Curaçao': '🇨🇼', 'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳', 'Saudi Arabia': '🇸🇦', 'Cape Verde': '🇨🇻',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷',
  'New Zealand': '🇳🇿', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
};

const FILTER_TABS = ['Live', 'Upcoming', 'Results'];

const today = () => new Date().toISOString().split('T')[0];

function formatDateHeader(dateStr) {
  const todayStr = today();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';

  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isLiveStatus(s) {
  return s === 'live' || ['1H', '2H', 'ET', 'P', 'LIVE'].includes(s);
}

function isResultStatus(s) {
  return s === 'FT' || ['finished', 'AET', 'PEN'].includes(s);
}

function LiveMatchCard({ match, onMatchSelected }) {
  return (
    <div className="ms-card ms-card--live">
      <div className="ms-card__top">
        <div className="ms-badge ms-badge--live">
          <div className="ms-badge__dot" />
          <span>Live</span>
        </div>
        <div className="ms-card__stage">{match.stage}</div>
      </div>
      <div className="ms-card__teams">
        <div className="ms-card__team">
          <span className="ms-card__flag">{FLAGS[match.homeTeam] ?? '🌍'}</span>
          <span className="ms-card__team-name">{match.homeTeam}</span>
        </div>
        <div className="ms-card__score-col">
          <div className="ms-card__score-live">{match.homeScore} – {match.awayScore}</div>
          <div className="ms-card__minute">{match.minute}'</div>
        </div>
        <div className="ms-card__team ms-card__team--right">
          <span className="ms-card__flag">{FLAGS[match.awayTeam] ?? '🌍'}</span>
          <span className="ms-card__team-name">{match.awayTeam}</span>
        </div>
      </div>
      <button className="ms-card__cta ms-card__cta--live" onClick={() => onMatchSelected(match)}>
        Watch with Companion →
      </button>
    </div>
  );
}

function ResultCard({ match, onMatchSelected }) {
  return (
    <div className="ms-card ms-card--result">
      <div className="ms-card__top">
        <div className="ms-badge ms-badge--result">Final</div>
        <div className="ms-card__stage">{match.stage}</div>
      </div>
      <div className="ms-card__teams">
        <div className="ms-card__team">
          <span className="ms-card__flag">{FLAGS[match.homeTeam] ?? '🌍'}</span>
          <span className="ms-card__team-name">{match.homeTeam}</span>
        </div>
        <div className="ms-card__score-col">
          <div className="ms-card__score-ft">{match.homeScore} – {match.awayScore}</div>
        </div>
        <div className="ms-card__team ms-card__team--right">
          <span className="ms-card__flag">{FLAGS[match.awayTeam] ?? '🌍'}</span>
          <span className="ms-card__team-name">{match.awayTeam}</span>
        </div>
      </div>
      <button className="ms-card__cta ms-card__cta--result" onClick={() => onMatchSelected(match)}>
        Ask about this match →
      </button>
    </div>
  );
}

function ScheduleMatchRow({ match, onMatchSelected }) {
  const venueStr = match.venue && match.venue !== 'TBD'
    ? `${match.venue}, ${match.city}`
    : match.city && match.city !== 'TBD' ? match.city : null;

  return (
    <div className="ms-schedule-row" onClick={() => onMatchSelected({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: null,
      awayScore: null,
      stage: `Group ${match.group}`,
      status: 'NS',
      kickoff: match.kickoffET,
      general: false,
    })}>
      <span className="ms-srow__flag">{match.homeFlag}</span>
      <div className="ms-srow__center">
        <div className="ms-srow__teams">
          {match.homeTeam} <span className="ms-srow__vs">vs</span> {match.awayTeam}
        </div>
        <div className="ms-srow__meta">
          {match.isUSAGame && '🇺🇸 '}
          Group {match.group} · {match.kickoffET} · {match.tvUS}
          {venueStr && ` · ${venueStr}`}
        </div>
      </div>
      <span className="ms-srow__flag">{match.awayFlag}</span>
    </div>
  );
}

function MatchSelector({ onMatchSelected }) {
  const [apiMatches, setApiMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Upcoming');
  useEffect(() => {
    getLiveMatches().then(data => {
      if (data?.matches?.length > 0) {
        setApiMatches(data.matches);
        const hasLive = data.matches.some(m => isLiveStatus(m.status));
        if (hasLive) setActiveFilter('Live');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);


  const liveMatches  = apiMatches.filter(m => isLiveStatus(m.status));
  const resultMatches = apiMatches.filter(m => isResultStatus(m.status));
  const liveCount = liveMatches.length;

  // Upcoming schedule from worldCupData, grouped by date
  const todayStr = today();
  const matchesByDate = OPENING_MATCHES
    .filter(m => m.date >= todayStr)
    .reduce((acc, m) => {
      if (!acc[m.date]) acc[m.date] = [];
      acc[m.date].push(m);
      return acc;
    }, {});

  const dateGroups = Object.entries(matchesByDate).slice(0, 4);

  return (
    <div className="match-selector">

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

      {/* ── Content ────────────────────────────────────────── */}
      <div className="ms-cards">
        {loading ? (
          <div className="ms-loading">Loading matches...</div>
        ) : activeFilter === 'Live' ? (
          liveMatches.length === 0 ? (
            <div className="ms-empty">No live matches right now — check back at kickoff</div>
          ) : (
            liveMatches.map(m => (
              <LiveMatchCard key={m.id} match={m} onMatchSelected={onMatchSelected} />
            ))
          )
        ) : activeFilter === 'Results' ? (
          resultMatches.length === 0 ? (
            <div className="ms-empty">No results yet — tournament starts June 11</div>
          ) : (
            resultMatches.map(m => (
              <ResultCard key={m.id} match={m} onMatchSelected={onMatchSelected} />
            ))
          )
        ) : (
          // Upcoming — date-grouped WC schedule
          dateGroups.length === 0 ? (
            <div className="ms-empty">No upcoming matches in schedule</div>
          ) : (
            dateGroups.map(([date, matches]) => (
              <div key={date} className="ms-date-group">
                <div className="ms-date-header">{formatDateHeader(date)}</div>
                {matches.map(match => (
                  <ScheduleMatchRow
                    key={match.id}
                    match={match}
                    onMatchSelected={onMatchSelected}
                  />
                ))}
              </div>
            ))
          )
        )}
      </div>

    </div>
  );
}

export default MatchSelector;
