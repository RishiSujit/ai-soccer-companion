import { useState, useEffect, useRef, Fragment } from 'react';
import {
  getRecapForTeam,
  getHotTake,
  getBracketForTeam,
  getLiveMatches,
  voteOnHotTake,
  getPreMatchBriefing,
  getTeamHeadline,
} from '../services/api';
import BriefingCard from './BriefingCard';
import './HomeScreen.css';

const FLAGS = {
  'Argentina': '🇦🇷', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱', 'Poland': '🇵🇱', 'Saudi Arabia': '🇸🇦',
  'Canada': '🇨🇦', 'Croatia': '🇭🇷', 'Morocco': '🇲🇦',
  'Japan': '🇯🇵', 'Senegal': '🇸🇳', 'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴', 'Australia': '🇦🇺',
};


const GROUP_STANDINGS = {
  'Argentina': {
    groupName: 'Group B',
    teams: [
      { pos: 1, flag: '🇦🇷', name: 'Argentina',    gd: '+7', pts: 9 },
      { pos: 2, flag: '🇵🇱', name: 'Poland',       gd: '+1', pts: 4 },
      { pos: 3, flag: '🇸🇦', name: 'Saudi Arabia', gd: '-3', pts: 3 },
      { pos: 4, flag: '🇲🇽', name: 'Mexico',       gd: '-5', pts: 1 },
    ],
  },
  'USA': {
    groupName: 'Group C',
    teams: [
      { pos: 1, flag: '🇺🇸', name: 'USA',     gd: '+5', pts: 7 },
      { pos: 2, flag: '🇺🇾', name: 'Uruguay', gd: '+2', pts: 5 },
      { pos: 3, flag: '🇵🇦', name: 'Panama',  gd: '-2', pts: 3 },
      { pos: 4, flag: '🇧🇴', name: 'Bolivia', gd: '-5', pts: 1 },
    ],
  },
};

const FALLBACK_RECAP = {
  home_team: 'Argentina',
  away_team: 'Poland',
  home_score: 2,
  away_score: 0,
  bullets: [
    "**Messi scored twice** — think a QB with a perfect completion rate in the red zone, impossible to stop when locked in",
    "**Poland had a man sent off at the 67th minute** — like an NBA ejection; Argentina played 11 vs 10 for the final 23 minutes",
    "**Argentina top Group B** with a perfect 9 points — they haven't allowed a single goal all tournament",
  ],
};

const FALLBACK_HOT_TAKE = {
  id: 'fallback-1',
  question: "Will Messi win his second World Cup with Argentina?",
  yes_label: "Destiny 🐐",
  no_label: "Too old now",
  yes_votes: 8420,
  no_votes: 3201,
};

const FALLBACK_BRACKET = [
  { round: 'Group Stage',   status: 'FT',        home_team: 'Argentina', away_team: 'Poland',       home_score: 2,    away_score: 0,    match_date: '2026-06-12' },
  { round: 'Group Stage',   status: 'FT',        home_team: 'Saudi Arabia', away_team: 'Argentina', home_score: 0,    away_score: 2,    match_date: '2026-06-16' },
  { round: 'Round of 16',   status: 'scheduled', home_team: 'Argentina', away_team: 'TBD',          home_score: null, away_score: null, match_date: '2026-06-28' },
  { round: 'Quarter-finals',status: 'scheduled', home_team: 'Argentina', away_team: 'TBD',          home_score: null, away_score: null, match_date: '2026-07-04' },
  { round: 'Semi-finals',   status: 'scheduled', home_team: 'Argentina', away_team: 'TBD',          home_score: null, away_score: null, match_date: '2026-07-09' },
  { round: 'Final',         status: 'scheduled', home_team: 'Argentina', away_team: 'TBD',          home_score: null, away_score: null, match_date: '2026-07-19', venue: 'MetLife Stadium, NJ' },
];

const parseBullet = (text) => {
  const parts = text.split('**');
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: '#f0f0fa' }}>{part}</strong>
      : part
  );
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getDaysToKickoff() {
  return Math.ceil(
    (new Date('2026-06-11') - new Date()) / (1000 * 60 * 60 * 24)
  );
}


function getOpponent(match, team) {
  if (match.home_team === team) return match.away_team || 'TBD';
  if (match.away_team === team) return match.home_team || 'TBD';
  if (match.homeTeam === team) return match.awayTeam || 'TBD';
  return match.homeTeam || 'TBD';
}


function getTeamFlag(team) {
  const flags = {
    'Argentina': '🇦🇷', 'France': '🇫🇷', 'Brazil': '🇧🇷',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'USA': '🇺🇸', 'Germany': '🇩🇪',
    'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'Morocco': '🇲🇦',
    'Mexico': '🇲🇽', 'Netherlands': '🇳🇱', 'Italy': '🇮🇹',
    'Japan': '🇯🇵', 'Senegal': '🇸🇳', 'Croatia': '🇭🇷',
  };
  return flags[team] || '🌍';
}

function HomeScreen({ userContext, userId, onNavigate }) {
  const [recap, setRecap] = useState(null);
  const [hotTake, setHotTake] = useState(null);
  const [bracket, setBracket] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const dismissedFixtureId = useRef(null);

  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [teamHeadlines, setTeamHeadlines] = useState({});
  const touchStartX = useRef(null);

  const team = userContext?.team || 'Argentina';
  const firstName = team ? team.split(' ')[0] : 'Rishi';
  const daysLeft = getDaysToKickoff();
  const standingsData = GROUP_STANDINGS[team] || GROUP_STANDINGS['Argentina'];
  const teamFlag = FLAGS[team] ?? '🌍';

  useEffect(() => {
    Promise.all([
      getRecapForTeam(team),
      getHotTake(),
      getBracketForTeam(team),
      getLiveMatches(),
    ])
      .then(([recapRes, hotTakeRes, bracketRes, matchesRes]) => {
        setRecap(recapRes?.recap || null);
        setHotTake(hotTakeRes?.hotTake || null);
        setBracket(bracketRes?.bracket || []);
        setLiveMatches(matchesRes?.matches || []);
      })
      .catch(() => {});
  }, [team]);

  useEffect(() => {
    if (!userContext?.team) return;

    const checkBriefing = async () => {
      try {
        const sports = userContext.knownSports?.join(',') || 'NFL,NBA';
        const data = await getPreMatchBriefing(userContext.team, sports);
        if (data.briefing && data.briefing.fixtureId !== dismissedFixtureId.current) {
          setBriefing(data.briefing);
          setShowBriefing(true);
        }
      } catch (err) {
        console.error('Briefing check error:', err);
      }
    };

    checkBriefing();
    const interval = setInterval(checkBriefing, 30 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userContext?.team]);

  const featuredTeams = [
    team,
    'Argentina', 'France', 'Brazil', 'England',
    'USA', 'Germany', 'Spain', 'Portugal', 'Morocco',
  ].filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 8);

  useEffect(() => {
    const sports = userContext?.knownSports?.join(',') || 'NFL,NBA';
    const cached = {};

    async function load() {
      const results = await Promise.all(
        featuredTeams.map(t => getTeamHeadline(t, sports))
      );
      featuredTeams.forEach((t, i) => {
        cached[t] = results[i]?.headline || `Follow ${t}'s World Cup journey`;
      });
      setTeamHeadlines(cached);
    }

    load();
  }, [team]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(diff) < 50) return;
    if (diff > 0) {
      setActiveTeamIndex(prev => Math.min(prev + 1, featuredTeams.length - 1));
    } else {
      setActiveTeamIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const handleVote = (vote) => {
    const ht = hotTake || FALLBACK_HOT_TAKE;
    setUserVote(vote);
    if (ht.id && !String(ht.id).startsWith('fallback')) {
      voteOnHotTake(ht.id, vote)
        .then(res => { if (res?.hotTake) setHotTake(res.hotTake); })
        .catch(() => {});
    }
  };

  const displayRecap = recap || FALLBACK_RECAP;
  const displayHotTake = hotTake || FALLBACK_HOT_TAKE;
  const displayBracket = bracket.length ? bracket : FALLBACK_BRACKET;

  const bracketWithState = displayBracket.map((m, i) => {
    const prevDone = i === 0 || displayBracket[i - 1]?.status === 'FT';
    let dotState = 'future';
    if (m.status === 'FT') dotState = 'done';
    else if ((m.status === 'scheduled' || m.status === 'NS') && prevDone) dotState = 'next';
    return { ...m, dotState };
  });

  const yesVotes = displayHotTake.yes_votes || 0;
  const noVotes = displayHotTake.no_votes || 0;
  const totalVotes = yesVotes + noVotes || 1;
  const yesPct = Math.round((yesVotes / totalVotes) * 100);
  const noPct = 100 - yesPct;

  const handleDismissBriefing = () => {
    dismissedFixtureId.current = briefing?.fixtureId;
    setShowBriefing(false);
  };

  return (
    <div className="home-screen">

      {showBriefing && briefing && (
        <BriefingCard
          briefing={briefing}
          onDismiss={handleDismissBriefing}
          onNavigate={onNavigate}
        />
      )}

      {/* ── SECTION 1: Welcome bar ──────────────────────── */}
      <div className="home-welcome">
        <div className="welcome-left">
          <div className="welcome-greeting">Good {getTimeOfDay()}, {firstName}</div>
          <div className="welcome-sub">World Cup 2026 · 48 teams · 104 matches</div>
        </div>
        <div className={`kickoff-pill ${daysLeft <= 0 ? 'kickoff-pill--live' : ''}`}>
          {daysLeft > 0 ? `${daysLeft} days to kickoff` : 'Tournament underway 🔴'}
        </div>
      </div>

      {/* ── SECTION 2: My Team + Your Tournament ───────── */}
      <div className="home-grid-2">

        <div className="home-card">
          <div className="home-card-label">TEAMS TO WATCH</div>
          <div className="team-carousel">
            <div className="team-dots">
              {featuredTeams.map((t, i) => (
                <button
                  key={t}
                  className={`team-dot${i === activeTeamIndex ? ' active' : ''}`}
                  onClick={() => setActiveTeamIndex(i)}
                  aria-label={t}
                />
              ))}
            </div>
            <div
              className="team-card-carousel"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="team-card-flag">
                {getTeamFlag(featuredTeams[activeTeamIndex])}
              </div>
              <div className="team-card-name">{featuredTeams[activeTeamIndex]}</div>
              {activeTeamIndex === 0 && (
                <div className="your-team-badge">Your team</div>
              )}
              <div className="team-card-headline">
                {teamHeadlines[featuredTeams[activeTeamIndex]] || 'Loading...'}
              </div>
              <button
                className="follow-team-btn"
                onClick={() => onNavigate('companion', {
                  general: true,
                  preloadedQuestion: `Tell me about ${featuredTeams[activeTeamIndex]} — who are their key players and how do they play?`,
                })}
              >
                Follow in Companion →
              </button>
            </div>
            <div className="swipe-hint">← Swipe to explore teams →</div>
          </div>
        </div>

        <div className="home-card tournament-card">
          <div className="home-card-label">YOUR WORLD CUP</div>
          {/* TODO: fetch real stats from Supabase using userId once match data flows in */}
          <div className="tournament-stats-grid">
            <div className="tournament-stat">
              <div className="tournament-stat-value">
                8<span className="tournament-stat-denom">/12</span>
              </div>
              <div className="tournament-stat-label">Correct</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">#2</div>
              <div className="tournament-stat-label">Group Rank</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">4</div>
              <div className="tournament-stat-label">Watched</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">247</div>
              <div className="tournament-stat-label">Points</div>
            </div>
          </div>
          <div className="tournament-accuracy-label">Prediction accuracy</div>
          <div className="tournament-progress">
            <div className="tournament-progress-fill" style={{ width: '67%' }} />
          </div>
          <div className="tournament-accuracy-pct">67%</div>
        </div>

      </div>

      {/* ── SECTION 3: What You Missed + Talking Point ─── */}
      <div className="home-grid-2">

        <div className="home-card recap-card">
          <div className="home-card-header-row">
            <div className="home-card-label">WHAT YOU MISSED</div>
            <div className="recap-new-badge">NEW RECAP</div>
          </div>
          <div className="recap-match-row">
            <span className="recap-flag">{FLAGS[displayRecap.home_team] ?? '🌍'}</span>
            <span className="recap-team-name">{displayRecap.home_team}</span>
            <span className="recap-score">{displayRecap.home_score}–{displayRecap.away_score}</span>
            <span className="recap-team-name">{displayRecap.away_team}</span>
            <span className="recap-flag">{FLAGS[displayRecap.away_team] ?? '🌍'}</span>
          </div>
          <ul className="recap-bullets">
            {displayRecap.bullets.map((bullet, i) => (
              <li key={i} className="recap-bullet">
                <span className="recap-bullet-dot" />
                <span>{parseBullet(bullet)}</span>
              </li>
            ))}
          </ul>
          <button
            className="home-cta-link"
            onClick={() => onNavigate('companion', {
              general: true,
              preloadedQuestion: `Break down the ${displayRecap.home_team} ${displayRecap.home_score}–${displayRecap.away_score} ${displayRecap.away_team} match for me`,
            })}
          >
            Ask Companion about this match →
          </button>
        </div>

        <div className="home-card hottake-card">
          <div className="home-card-label">TODAY'S TALKING POINT</div>
          <p className="hottake-question">"{displayHotTake.question}"</p>

          {!userVote ? (
            <div className="vote-buttons">
              <button className="vote-btn vote-btn--yes" onClick={() => handleVote('yes')}>
                {displayHotTake.yes_label}
              </button>
              <button className="vote-btn vote-btn--no" onClick={() => handleVote('no')}>
                {displayHotTake.no_label}
              </button>
            </div>
          ) : (
            <div className="vote-results">
              <div className="vote-bar-row">
                <span className="vote-bar-label">{displayHotTake.yes_label}</span>
                <div className="vote-bar-track">
                  <div className="vote-bar-fill vote-bar-fill--yes" style={{ width: `${yesPct}%` }} />
                </div>
                <span className="vote-bar-pct">{yesPct}%</span>
              </div>
              <div className="vote-bar-row">
                <span className="vote-bar-label">{displayHotTake.no_label}</span>
                <div className="vote-bar-track">
                  <div className="vote-bar-fill vote-bar-fill--no" style={{ width: `${noPct}%` }} />
                </div>
                <span className="vote-bar-pct">{noPct}%</span>
              </div>
              <div className="vote-total">{(yesVotes + noVotes).toLocaleString()} votes</div>
            </div>
          )}

          <button
            className="home-cta-link"
            onClick={() => onNavigate('companion', { general: true })}
          >
            Ask Companion to explain →
          </button>
        </div>

      </div>

      {/* ── SECTION 4: Path to Final + Group Standings ─── */}
      <div className="home-grid-2">

        <div className="home-card bracket-card">
          <div className="home-card-label">{teamFlag} {team.toUpperCase()}'S ROAD TO METLIFE</div>
          <div className="timeline">
            {bracketWithState.map((m, i) => {
              const isDone = m.status === 'FT';
              const isNext = m.dotState === 'next';
              const opp = getOpponent(m, team);
              const oppFlag = FLAGS[opp] ?? '';
              const resultText = isDone
                ? `${m.home_score}–${m.away_score}`
                : isNext ? 'NEXT ↗' : 'TBD';

              return (
                <div key={i} className="timeline-item">
                  <div className="timeline-spine">
                    <div className={`timeline-dot timeline-dot--${m.dotState}`} />
                    {i < bracketWithState.length - 1 && (
                      <div className={`timeline-connector timeline-connector--${isDone ? 'done' : 'future'}`} />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-round">{m.round}</div>
                    <div className="timeline-matchup">
                      {oppFlag && <span className="timeline-opp-flag">{oppFlag}</span>}
                      <span className="timeline-opp-name">
                        {isDone || isNext ? opp : 'vs TBD'}
                      </span>
                    </div>
                  </div>
                  <div className={`timeline-result timeline-result--${isNext ? 'next' : isDone ? 'done' : 'tbd'}`}>
                    {resultText}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bracket-footer">48-team format · Group stage → knockout</div>
        </div>

        <div className="home-card standings-card">
          <div className="home-card-label">{standingsData.groupName} STANDINGS</div>
          <table className="standings-table">
            <thead>
              <tr className="standings-header-row">
                <th>#</th>
                <th className="standings-team-col">Team</th>
                <th>GD</th>
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {standingsData.teams.map((row, i) => (
                <Fragment key={row.name}>
                  <tr className={`standings-row ${row.name === team ? 'standings-row--user' : ''}`}>
                    <td className="standings-pos">{row.pos}</td>
                    <td className="standings-team-col">
                      <span className="standings-flag">{row.flag}</span>
                      <span className="standings-name">{row.name}</span>
                    </td>
                    <td className="standings-gd">{row.gd}</td>
                    <td className="standings-pts">{row.pts}</td>
                  </tr>
                  {i === 1 && (
                    <tr className="standings-qualify-row" key="qualify">
                      <td colSpan={4}>
                        <div className="standings-qualify-line" />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div className="standings-footer">Top 2 advance · Qualify line shown</div>
        </div>

      </div>

      {/* ── SECTION 5: Live Now (conditional) ──────────── */}
      {liveMatches.length > 0 && (
        <div className="home-section live-section">
          <div className="live-section-header">
            <div className="home-live-dot" />
            <span className="home-section-label" style={{ margin: 0 }}>LIVE NOW</span>
          </div>
          <div className="live-matches-grid">
            {liveMatches.map((m, i) => (
              <div key={i} className="live-match-card">
                <div className="live-match-teams">
                  <span>{FLAGS[m.homeTeam] ?? '🌍'} {m.homeTeam}</span>
                  <span className="live-match-score">{m.homeScore ?? 0}–{m.awayScore ?? 0}</span>
                  <span>{m.awayTeam} {FLAGS[m.awayTeam] ?? '🌍'}</span>
                </div>
                {m.minute && <div className="live-match-minute">{m.minute}'</div>}
                <button
                  className="live-watch-btn"
                  onClick={() => onNavigate('companion', m)}
                >
                  Watch with Companion →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 6: Feature navigation cards ─────────── */}
      <div className="home-section">
        <div className="home-section-label">QUICK ACCESS</div>
        <div className="feature-cards">
          <div className="feature-card" onClick={() => onNavigate('companion')}>
            <div className="feature-card-number">01</div>
            <div className="feature-card-title">Companion</div>
            <div className="feature-card-desc">Live match AI assistant</div>
            <div className="feature-card-arrow">→</div>
          </div>
          <div className="feature-card" onClick={() => onNavigate('predictions')}>
            <div className="feature-card-number">02</div>
            <div className="feature-card-title">Predictions</div>
            <div className="feature-card-desc">Bet before kickoff</div>
            <div className="feature-card-arrow">→</div>
          </div>
          <div className="feature-card" onClick={() => onNavigate('group')}>
            <div className="feature-card-number">03</div>
            <div className="feature-card-title">Group</div>
            <div className="feature-card-desc">Compete with friends</div>
            <div className="feature-card-arrow">→</div>
          </div>
        </div>
      </div>

      {/* ── SECTION 7: Bottom padding ───────────────────── */}
      <div style={{ height: 24 }} />

    </div>
  );
}

export default HomeScreen;
