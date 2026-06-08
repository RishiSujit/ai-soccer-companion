import { useState, useEffect, useRef } from 'react';
import {
  getRecapForTeam,
  getHotTake,
  getBracketForTeam,
  getLiveMatches,
  voteOnHotTake,
  getPreMatchBriefing,
  getTeamHeadline,
} from '../services/api';
import { GROUPS, OPENING_MATCHES } from '../lib/worldCupData';
import BriefingCard from './BriefingCard';
import './HomeScreen.css';

const FLAGS = {
  'Argentina': '🇦🇷', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Morocco': '🇲🇦',
  'Senegal': '🇸🇳', 'Uruguay': '🇺🇾', 'South Korea': '🇰🇷',
  'Czechia': '🇨🇿', 'South Africa': '🇿🇦', 'Canada': '🇨🇦',
  'Qatar': '🇶🇦', 'Switzerland': '🇨🇭', 'Paraguay': '🇵🇾',
  'Australia': '🇦🇺', 'Türkiye': '🇹🇷', 'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨', 'Curaçao': '🇨🇼', 'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳', 'Saudi Arabia': '🇸🇦', 'Cape Verde': '🇨🇻',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷',
  'New Zealand': '🇳🇿', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Croatia': '🇭🇷',
  'Ghana': '🇬🇭', 'Panama': '🇵🇦', 'Bosnia & Herzegovina': '🇧🇦',
};

const FALLBACK_HOT_TAKE = {
  id: 'fallback-wc2026',
  question: "Can a North American host (USA, Canada, or Mexico) reach the knockout stage?",
  yes_label: "Home field advantage",
  no_label: "Star power wins",
  yes_votes: 6200,
  no_votes: 3800,
};

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
  return FLAGS[team] || '🌍';
}

function getUserGroup(teamName) {
  if (!teamName) return 'A';
  for (const [letter, group] of Object.entries(GROUPS)) {
    if (group.teams.some(t =>
      t.name === teamName ||
      teamName.includes(t.name) ||
      t.name.includes(teamName)
    )) {
      return letter;
    }
  }
  return 'A';
}

function getPreTournamentBracket(teamName) {
  const teamMatches = OPENING_MATCHES.filter(
    m => m.homeTeam === teamName || m.awayTeam === teamName
  );
  const groupMatches = teamMatches.slice(0, 3).map(m => ({
    round: 'Group Stage',
    status: 'NS',
    home_team: m.homeTeam,
    away_team: m.awayTeam,
    home_score: null,
    away_score: null,
    match_date: m.date,
  }));
  if (groupMatches.length === 0) {
    groupMatches.push({
      round: 'Group Stage',
      status: 'NS',
      home_team: teamName,
      away_team: 'TBD',
      home_score: null,
      away_score: null,
      match_date: '2026-06-11',
    });
  }
  return [
    ...groupMatches,
    { round: 'Round of 32',   status: 'scheduled', home_team: teamName, away_team: 'TBD', home_score: null, away_score: null, match_date: '2026-06-27' },
    { round: 'Round of 16',   status: 'scheduled', home_team: teamName, away_team: 'TBD', home_score: null, away_score: null, match_date: '2026-07-01' },
    { round: 'Quarter-finals',status: 'scheduled', home_team: teamName, away_team: 'TBD', home_score: null, away_score: null, match_date: '2026-07-04' },
    { round: 'Semi-finals',   status: 'scheduled', home_team: teamName, away_team: 'TBD', home_score: null, away_score: null, match_date: '2026-07-09' },
    { round: 'Final',         status: 'scheduled', home_team: teamName, away_team: 'TBD', home_score: null, away_score: null, match_date: '2026-07-19', venue: 'MetLife Stadium, NJ' },
  ];
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

  const [selectedGroup, setSelectedGroup] = useState('A');

  const team = userContext?.team || 'USA';
  const firstName = team ? team.split(' ')[0] : 'Fan';
  const daysLeft = getDaysToKickoff();
  const teamFlag = FLAGS[team] ?? '🌍';

  // Auto-select user's group on mount
  useEffect(() => {
    const userGroup = getUserGroup(userContext?.team);
    setSelectedGroup(userGroup);
  }, [userContext?.team]);

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
    'USA', 'Brazil', 'England', 'Germany',
    'Spain', 'France', 'Portugal', 'Netherlands',
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

  const displayHotTake = hotTake || FALLBACK_HOT_TAKE;
  const displayBracket = bracket.length ? bracket : getPreTournamentBracket(team);

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

  const currentGroup = GROUPS[selectedGroup];

  // Next match for user's team from WC schedule
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMatch = OPENING_MATCHES.find(m =>
    m.date >= todayStr &&
    (m.homeTeam === team || m.awayTeam === team)
  );

  return (
    <div className="home-screen stagger-children">

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
                0<span className="tournament-stat-denom">/0</span>
              </div>
              <div className="tournament-stat-label">Correct</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">—</div>
              <div className="tournament-stat-label">Group Rank</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">0</div>
              <div className="tournament-stat-label">Watched</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">0</div>
              <div className="tournament-stat-label">Points</div>
            </div>
          </div>
          <div className="tournament-accuracy-label">Predictions open June 11</div>
          <div className="tournament-progress">
            <div className="tournament-progress-fill" style={{ width: '0%' }} />
          </div>
          <div className="tournament-accuracy-pct">—</div>
        </div>

      </div>

      {/* ── SECTION 3: Next Match + Talking Point ────────── */}
      <div className="home-grid-2">

        {recap ? (
          <div className="home-card recap-card">
            <div className="home-card-header-row">
              <div className="home-card-label">WHAT YOU MISSED</div>
              <div className="recap-new-badge">NEW RECAP</div>
            </div>
            <div className="recap-match-row">
              <span className="recap-flag">{FLAGS[recap.home_team] ?? '🌍'}</span>
              <span className="recap-team-name">{recap.home_team}</span>
              <span className="recap-score">{recap.home_score}–{recap.away_score}</span>
              <span className="recap-team-name">{recap.away_team}</span>
              <span className="recap-flag">{FLAGS[recap.away_team] ?? '🌍'}</span>
            </div>
            <ul className="recap-bullets">
              {recap.bullets.map((bullet, i) => (
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
                preloadedQuestion: `Break down the ${recap.home_team} ${recap.home_score}–${recap.away_score} ${recap.away_team} match for me`,
              })}
            >
              Ask Companion about this match →
            </button>
          </div>
        ) : (
          <div className="home-card next-match-card">
            <div className="home-card-label">NEXT MATCH</div>
            {nextMatch ? (
              <>
                <div className="recap-match-row">
                  <span className="recap-flag">{nextMatch.homeFlag}</span>
                  <span className="recap-team-name">{nextMatch.homeTeam}</span>
                  <span className="recap-score">vs</span>
                  <span className="recap-team-name">{nextMatch.awayTeam}</span>
                  <span className="recap-flag">{nextMatch.awayFlag}</span>
                </div>
                <div className="next-match-details">
                  <span>Group {nextMatch.group}</span>
                  <span>{nextMatch.kickoffET}</span>
                  <span>{nextMatch.tvUS}</span>
                </div>
                {nextMatch.venue !== 'TBD' && (
                  <div className="next-match-venue">{nextMatch.venue}, {nextMatch.city}</div>
                )}
                <button
                  className="home-cta-link"
                  onClick={() => onNavigate('companion', {
                    general: true,
                    preloadedQuestion: `Preview ${nextMatch.homeTeam} vs ${nextMatch.awayTeam} for me — what should I watch for?`,
                  })}
                >
                  Get AI preview →
                </button>
              </>
            ) : (
              <div className="next-match-empty">
                <div className="next-match-flag">{teamFlag}</div>
                <div className="next-match-info">Tournament kicks off June 11</div>
                <button
                  className="home-cta-link"
                  onClick={() => onNavigate('companion', { general: true })}
                >
                  Ask Companion anything →
                </button>
              </div>
            )}
          </div>
        )}

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
          <div className="bracket-footer">48-team format · Group stage → Round of 32 → knockout</div>
        </div>

        <div className="home-card standings-card">
          <div className="home-card-label">GROUP STANDINGS</div>

          {/* Group tabs A–L */}
          <div className="group-tabs">
            {Object.keys(GROUPS).map(letter => (
              <button
                key={letter}
                className={`group-tab ${selectedGroup === letter ? 'active' : ''}`}
                onClick={() => setSelectedGroup(letter)}
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="group-standings-title">{currentGroup.name}</div>

          <div className="group-standings-table">
            <div className="group-standings-header">
              <span>#</span>
              <span>Team</span>
              <span>GD</span>
              <span>PTS</span>
            </div>
            {currentGroup.teams.map((t, i) => {
              const isUserTeam = userContext?.team === t.name ||
                userContext?.team?.includes(t.name) ||
                t.name?.includes(userContext?.team || '');
              return (
                <div
                  key={t.code}
                  className={`group-standings-row ${isUserTeam ? 'user-team' : ''} ${i < 2 ? 'qualifying' : ''}`}
                >
                  <span className="gsr-rank">{i + 1}</span>
                  <span className="gsr-team">
                    {t.flag} {t.name}
                    {t.isHost && <span className="host-badge">HOST</span>}
                  </span>
                  <span className="gsr-gd">—</span>
                  <span className="gsr-pts">0</span>
                </div>
              );
            })}
          </div>

          <div className="standings-footer">Top 2 + 8 best 3rd-place advance to Round of 32 · Group stage not started</div>
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

      <div style={{ height: 24 }} />

    </div>
  );
}

export default HomeScreen;
