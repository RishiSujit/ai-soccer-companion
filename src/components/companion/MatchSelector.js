import { useState, useEffect } from 'react';
import { getLiveMatches, getUpcomingMatches, getMatchPredictions, getResultMatches } from '../../services/api';
import './MatchSelector.css';

const FLAGS = {
  'Argentina': '🇦🇷', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Morocco': '🇲🇦',
  'Senegal': '🇸🇳', 'Australia': '🇦🇺', 'Croatia': '🇭🇷',
  'Uruguay': '🇺🇾', 'South Korea': '🇰🇷', 'Czechia': '🇨🇿',
  'South Africa': '🇿🇦', 'Canada': '🇨🇦', 'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭', 'Bosnia & Herzegovina': '🇧🇦', 'Bosnia and Herzegovina': '🇧🇦',
  'Paraguay': '🇵🇾', 'Türkiye': '🇹🇷', 'Turkey': '🇹🇷',
  'Ivory Coast': '🇨🇮', "Cote d'Ivoire": '🇨🇮',
  'Ecuador': '🇪🇨', 'Curaçao': '🇨🇼', 'Curacao': '🇨🇼',
  'Sweden': '🇸🇪', 'Tunisia': '🇹🇳', 'Saudi Arabia': '🇸🇦',
  'Cape Verde': '🇨🇻', 'Belgium': '🇧🇪', 'Egypt': '🇪🇬',
  'Iran': '🇮🇷', 'New Zealand': '🇳🇿', 'Iraq': '🇮🇶',
  'Norway': '🇳🇴', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Ghana': '🇬🇭', 'Panama': '🇵🇦', 'DR Congo': '🇨🇩',
  'Colombia': '🇨🇴', 'Austria': '🇦🇹', 'Albania': '🇦🇱',
  'Czech Republic': '🇨🇿',
};

const FILTER_TABS = ['Today', 'Upcoming', 'Results'];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

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

function flag(match, side) {
  // Prefer backend-provided flag emoji; fall back to local FLAGS map
  const backendFlag = side === 'home' ? match.homeFlag : match.awayFlag;
  const teamName = side === 'home' ? match.homeTeam : match.awayTeam;
  return backendFlag || FLAGS[teamName] || '🌍';
}

function isResultStatus(s) {
  if (!s) return false;
  const upper = s.toUpperCase();
  return ['FT', 'FINISHED', 'AET', 'PEN', 'FULL TIME'].includes(upper);
}

// ── Card components ────────────────────────────────────────

function LiveMatchCard({ match, onMatchSelected }) {
  const isPreKick = !match.isLive || match.status === 'NOT STARTED' || match.status === 'NS';
  return (
    <div className="ms-card ms-card--live">
      <div className="ms-card__top">
        {isPreKick ? (
          <div className="ms-badge ms-badge--soon">
            <span>⏰ Kickoff Soon</span>
          </div>
        ) : (
          <div className="ms-badge ms-badge--live">
            <div className="ms-badge__dot" />
            <span>Live</span>
          </div>
        )}
        <div className="ms-card__stage">{match.stage}</div>
      </div>
      <div className="ms-card__teams">
        <div className="ms-card__team">
          <span className="ms-card__flag">{flag(match, 'home')}</span>
          <span className="ms-card__team-name">{match.homeTeam}</span>
        </div>
        <div className="ms-card__score-col">
          {isPreKick ? (
            <div className="ms-card__kickoff-time">{match.kickoffET || match.scheduled || 'Today'}</div>
          ) : (
            <>
              <div className="ms-card__score-live">{match.homeScore} – {match.awayScore}</div>
              <div className="ms-card__minute">{match.minute}'</div>
            </>
          )}
        </div>
        <div className="ms-card__team ms-card__team--right">
          <span className="ms-card__flag">{flag(match, 'away')}</span>
          <span className="ms-card__team-name">{match.awayTeam}</span>
        </div>
      </div>
      {match.venue && (
        <div className="ms-card__venue">{match.venue}</div>
      )}
      <button className="ms-card__cta ms-card__cta--live" onClick={() => onMatchSelected(match)}>
        {isPreKick ? 'Open Companion →' : 'Watch with Companion →'}
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
          <span className="ms-card__flag">{flag(match, 'home')}</span>
          <span className="ms-card__team-name">{match.homeTeam}</span>
        </div>
        <div className="ms-card__score-col">
          <div className="ms-card__score-ft">{match.homeScore} – {match.awayScore}</div>
        </div>
        <div className="ms-card__team ms-card__team--right">
          <span className="ms-card__flag">{flag(match, 'away')}</span>
          <span className="ms-card__team-name">{match.awayTeam}</span>
        </div>
      </div>
      <button className="ms-card__cta ms-card__cta--result" onClick={() => onMatchSelected(match)}>
        Ask about this match →
      </button>
    </div>
  );
}

function ScheduleMatchRow({ match, pred, predsLoading, onMatchSelected }) {
  const isUSA = match.homeTeam === 'USA' || match.awayTeam === 'USA';
  const meta = [
    match.stage,
    match.kickoffET,
    match.venue,
  ].filter(Boolean).join(' · ');

  return (
    <div className="ms-schedule-row" onClick={() => onMatchSelected({
      ...match,
      homeScore: null,
      awayScore: null,
      isLive: false,
      status: match.status || 'NS',
    })}>
      <span className="ms-srow__flag">{flag(match, 'home')}</span>
      <div className="ms-srow__center">
        <div className="ms-srow__teams">
          {match.homeTeam} <span className="ms-srow__vs">vs</span> {match.awayTeam}
        </div>
        <div className="ms-srow__meta">
          {isUSA && '🇺🇸 '}{meta}
        </div>
        {pred ? (
          <div className="match-prediction">
            <div className="pred-score-row">
              <span className="pred-label">Predicted</span>
              <span className="pred-score">
                {match.homeTeam.split(' ')[0]}{' '}
                <span className="pred-score-num">{pred.homeScore}–{pred.awayScore}</span>
                {' '}{match.awayTeam.split(' ')[0]}
              </span>
              <span className="pred-watch" style={{ color: watchabilityColor(pred.watchability) }}>
                ⚡{pred.watchability}/10
              </span>
            </div>
            {pred.headline && (
              <div className="pred-headline">"{pred.headline}"</div>
            )}
          </div>
        ) : predsLoading ? (
          <div className="pred-loading-row">
            <div className="pred-shimmer" />
          </div>
        ) : null}
      </div>
      <span className="ms-srow__flag">{flag(match, 'away')}</span>
    </div>
  );
}

const watchabilityColor = (score) => {
  if (score >= 8) return '#00ff87';
  if (score >= 6) return '#f5a623';
  return '#9494b8';
};

// ── Main component ─────────────────────────────────────────

function MatchSelector({ onMatchSelected }) {
  const [todayMatches, setTodayMatches]       = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [resultMatches, setResultMatches]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [activeFilter, setActiveFilter]       = useState('Today');
  const [predictions, setPredictions]         = useState({});
  const [predsLoading, setPredsLoading]       = useState(false);

  // Load today's matches from live feed — includes pre-kick, in-play, and finished-today
  useEffect(() => {
    let mounted = true;

    const fetchToday = (initial = false) => {
      getLiveMatches().then(data => {
        if (!mounted) return;
        const matches = data?.matches || [];
        setTodayMatches(matches);
        // Auto-switch to Today if a game just kicked off live
        const trulyLive = matches.filter(m => m.isLive && !isResultStatus(m.status));
        if (trulyLive.length > 0) setActiveFilter('Today');
        if (initial) setLoading(false);
      }).catch(() => { if (mounted && initial) setLoading(false); });
    };

    fetchToday(true);
    const interval = setInterval(() => fetchToday(false), 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Load upcoming schedule — fixtures from tomorrow onwards
  useEffect(() => {
    getUpcomingMatches().then(data => {
      const todayStr = today();
      const future = (data?.matches || []).filter(m => (m.etDate || m.date) > todayStr);
      setUpcomingMatches(future);
    }).catch(() => {});
  }, []);

  // Load finished matches from history API (persists beyond the 3-hour live feed window)
  useEffect(() => {
    getResultMatches().then(data => {
      const results = data?.matches || [];
      if (results.length > 0) setResultMatches(results);
    }).catch(() => {});
  }, []);

  // Fetch score predictions once upcoming matches are loaded
  useEffect(() => {
    if (upcomingMatches.length === 0) return;
    const fetchPredictions = async () => {
      setPredsLoading(true);
      const toPredict = upcomingMatches.slice(0, 12).map(m => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        date: m.date,
      }));
      const preds = await getMatchPredictions(toPredict);
      setPredictions(preds);
      setPredsLoading(false);
    };
    fetchPredictions();
  }, [upcomingMatches]);

  const getPred = (homeTeam, awayTeam) => predictions[`${homeTeam}-${awayTeam}`] || null;
  // Badge count: only truly in-play games
  const liveCount = todayMatches.filter(m => m.isLive && !isResultStatus(m.status)).length;

  // Group upcoming by date
  const upcomingByDate = upcomingMatches.reduce((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {});
  const dateGroups = Object.entries(upcomingByDate).slice(0, 5);

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
            {tab === 'Today' && liveCount > 0 && (
              <span className="ms-filter-tab__badge">{liveCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="ms-cards">
        {loading ? (
          <div className="ms-loading">Loading matches...</div>
        ) : activeFilter === 'Today' ? (
          todayMatches.length === 0 ? (
            <div className="ms-empty">No matches scheduled for today</div>
          ) : (
            todayMatches.map(m =>
              isResultStatus(m.status) ? (
                <ResultCard key={m.id || m.matchId} match={m} onMatchSelected={onMatchSelected} />
              ) : (
                <LiveMatchCard key={m.id || m.matchId} match={m} onMatchSelected={onMatchSelected} />
              )
            )
          )
        ) : activeFilter === 'Results' ? (
          resultMatches.length === 0 ? (
            <div className="ms-empty">No results yet today</div>
          ) : (
            resultMatches.map(m => (
              <ResultCard key={m.id} match={m} onMatchSelected={onMatchSelected} />
            ))
          )
        ) : (
          // Upcoming — date-grouped from live API
          dateGroups.length === 0 ? (
            <div className="ms-loading">Loading schedule...</div>
          ) : (
            <>
              {dateGroups.map(([date, matches]) => (
                <div key={date} className="ms-date-group">
                  <div className="ms-date-header">{formatDateHeader(date)}</div>
                  {matches.map(match => (
                    <ScheduleMatchRow
                      key={match.id}
                      match={match}
                      pred={getPred(match.homeTeam, match.awayTeam)}
                      predsLoading={predsLoading}
                      onMatchSelected={onMatchSelected}
                    />
                  ))}
                </div>
              ))}
              <div className="pred-disclaimer">
                Predicted scores are for entertainment only — upsets happen in every World Cup
              </div>
            </>
          )
        )}
      </div>

    </div>
  );
}

export default MatchSelector;
