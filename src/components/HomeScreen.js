import { useState, useEffect, useRef } from 'react';
import {
  getRecapForTeam,
  getHotTake,
  getBracketForTeam,
  getLiveMatches,
  getUpcomingMatches,
  getGroupStandings,
  voteOnHotTake,
} from '../services/api';
import { supabase } from '../lib/supabase';
import { GROUPS, TOURNAMENT_FORMAT } from '../lib/worldCupData';
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
  yes_votes: 0,
  no_votes: 0,
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

// Canonical name normalization for matching livescore API names to GROUPS names
function normTeam(name) {
  const MAP = {
    'korea republic': 'south korea',
    'united states': 'usa',
    "cote d'ivoire": 'ivory coast',
    "côte d'ivoire": 'ivory coast',
    'bosnia and herzegovina': 'bosnia & herzegovina',
    'bosnia': 'bosnia & herzegovina',
    'turkey': 'türkiye',
    'curacao': 'curaçao',
    'czech republic': 'czechia',
    'congo dr': 'dr congo',
  };
  if (!name) return '';
  const lower = name.toLowerCase();
  return MAP[lower] || lower;
}

// Return the group letter for any team name (uses normalized matching)
function getTeamGroup(teamName) {
  if (!teamName) return null;
  const norm = normTeam(teamName);
  for (const [letter, group] of Object.entries(GROUPS)) {
    if (group.teams.some(t => normTeam(t.name) === norm)) return letter;
  }
  return null;
}

// Find a team's live standing row from the standings API data
// API fields: name, rank, points, goal_diff, group_name
function getTeamStanding(teamName, standings) {
  if (!standings?.table) return null;
  const norm = normTeam(teamName);
  return standings.table.find(s => {
    const sNorm = normTeam(s.name);
    return sNorm === norm ||
      sNorm.startsWith(norm.split(' ')[0]) ||
      norm.startsWith(sNorm.split(' ')[0]);
  }) || null;
}

function HomeScreen({ userContext, userId, onNavigate }) {
  const [recap, setRecap] = useState(null);
  const [hotTake, setHotTake] = useState(null);
  const [bracket, setBracket] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [standings, setStandings] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [userStats, setUserStats] = useState({ watched: 0, points: 0, correct: 0, total: 0, groupRank: null });

  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const touchStartX = useRef(null);

  const [selectedGroup, setSelectedGroup] = useState('A');

  const team = userContext?.team || 'USA';
  const firstName = team ? team.split(' ')[0] : 'Fan';
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
      getUpcomingMatches(),
      getGroupStandings(),
    ])
      .then(([recapRes, hotTakeRes, bracketRes, matchesRes, upcomingRes, standingsRes]) => {
        setRecap(recapRes?.recap || null);
        setHotTake(hotTakeRes?.hotTake || null);
        setBracket(bracketRes?.bracket || []);
        setLiveMatches(matchesRes?.matches || []);
        setUpcomingMatches(upcomingRes?.matches || []);
        setStandings(standingsRes?.standings || null);
      })
      .catch(() => {});
  }, [team]);


  useEffect(() => {
    if (!userId) return;

    // Watched count from localStorage (written by App.js whenever companion opens a real match)
    try {
      const watched = JSON.parse(localStorage.getItem(`wcc_watched_${userId}`) || '[]');
      setUserStats(prev => ({ ...prev, watched: watched.length }));
    } catch {}

    async function fetchUserStats() {
      try {
        // Points + group rank from group_members
        const { data: memberRows } = await supabase
          .from('group_members')
          .select('total_points, group_id')
          .eq('user_id', userId);

        if (memberRows?.length) {
          const totalPoints = memberRows.reduce((sum, m) => sum + (m.total_points || 0), 0);

          // Rank within the first group the user belongs to
          const { data: groupRows } = await supabase
            .from('group_members')
            .select('user_id, total_points')
            .eq('group_id', memberRows[0].group_id)
            .order('total_points', { ascending: false });

          const rankIdx = groupRows?.findIndex(m => m.user_id === userId);
          const groupRank = rankIdx != null && rankIdx >= 0 ? rankIdx + 1 : null;

          setUserStats(prev => ({ ...prev, points: totalPoints, groupRank }));
        }

        // Correct predictions from scored daily_predictions
        const { data: predictions } = await supabase
          .from('daily_predictions')
          .select('points_earned, scored_at')
          .eq('user_id', userId)
          .not('scored_at', 'is', null);

        if (predictions?.length) {
          const correct = predictions.filter(p => (p.points_earned || 0) > 0).length;
          setUserStats(prev => ({ ...prev, correct, total: predictions.length }));
        }
      } catch {}
    }

    fetchUserStats();
  }, [userId]);

  // Poll live matches, standings, and bracket every 60s so scores and standings stay current
  useEffect(() => {
    const poll = async () => {
      const [matchesRes, standingsRes, bracketRes] = await Promise.all([
        getLiveMatches().catch(() => null),
        getGroupStandings().catch(() => null),
        getBracketForTeam(team).catch(() => null),
      ]);
      if (matchesRes?.matches) setLiveMatches(matchesRes.matches);
      if (standingsRes?.standings) setStandings(standingsRes.standings);
      if (bracketRes?.bracket?.length > 0) setBracket(bracketRes.bracket);
    };

    const interval = setInterval(poll, 60 * 1000);
    return () => clearInterval(interval);
  }, [team]);

  // Featured teams: user's group first, then host nations not already in group, then popular teams
  const userGroupLetter = getTeamGroup(team) || getUserGroup(team);
  const userGroupTeamNames = GROUPS[userGroupLetter]?.teams.map(t => t.name) || [];
  const HOST_TEAMS = ['USA', 'Canada', 'Mexico'];
  const POPULAR_TEAMS = ['Brazil', 'France', 'Argentina', 'England', 'Germany', 'Spain', 'Portugal', 'Netherlands'];
  const featuredTeams = [
    team,
    ...userGroupTeamNames.filter(t => t !== team),
    ...HOST_TEAMS.filter(t => !userGroupTeamNames.includes(t)),
    ...POPULAR_TEAMS.filter(t => !userGroupTeamNames.includes(t) && !HOST_TEAMS.includes(t)),
  ].filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 8);

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
  const displayBracket = bracket;

  const bracketWithState = displayBracket.map((m, i) => {
    const prevDone = i === 0 || displayBracket[i - 1]?.status === 'FT';
    const isFinished = m.status === 'FT';
    const isLive = m.status === 'LIVE' || (m.status && !['FT', 'scheduled', 'NS'].includes(m.status) && m.home_score != null);
    let dotState = 'future';
    if (isFinished) dotState = 'done';
    else if (isLive) dotState = 'next';
    else if ((m.status === 'scheduled' || m.status === 'NS') && prevDone) dotState = 'next';
    return { ...m, dotState, isLive };
  });

  const yesVotes = displayHotTake.yes_votes || 0;
  const noVotes = displayHotTake.no_votes || 0;
  const totalVotes = yesVotes + noVotes || 1;
  const yesPct = Math.round((yesVotes / totalVotes) * 100);
  const noPct = 100 - yesPct;

  const currentGroup = GROUPS[selectedGroup];

  // Next match for user's team from upcoming API
  const teamLower = team.toLowerCase();
  const nextMatch = upcomingMatches.find(m =>
    m.homeTeam?.toLowerCase() === teamLower ||
    m.awayTeam?.toLowerCase() === teamLower ||
    m.homeTeam?.toLowerCase().includes(teamLower.split(' ')[0]) ||
    m.awayTeam?.toLowerCase().includes(teamLower.split(' ')[0])
  );


  return (
    <div className="home-screen stagger-children">

      {/* ── SECTION 1: Welcome bar ──────────────────────── */}
      <div className="home-welcome">
        <div className="welcome-left">
          <div className="welcome-greeting">Good {getTimeOfDay()}, {firstName}</div>
          <div className="welcome-sub">World Cup 2026 · 48 teams · 104 matches</div>
        </div>
        <div className="kickoff-pill kickoff-pill--live">
          Tournament underway 🔴
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
                {(() => {
                  const t = featuredTeams[activeTeamIndex];
                  const groupLetter = getTeamGroup(t);
                  const row = getTeamStanding(t, standings);
                  if (row) {
                    const gdNum = parseInt(row.goal_diff || '0');
                    const gd = gdNum > 0 ? `+${gdNum}` : `${gdNum}`;
                    return `Group ${groupLetter} · #${row.rank} · ${row.points} pts · GD ${gd}`;
                  }
                  return groupLetter ? `Group ${groupLetter} · 2026 World Cup` : '2026 World Cup';
                })()}
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
          <div className="tournament-stats-grid">
            <div className="tournament-stat">
              <div className="tournament-stat-value">
                {userStats.correct}<span className="tournament-stat-denom">/{userStats.total}</span>
              </div>
              <div className="tournament-stat-label">Correct</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">
                {userStats.groupRank != null ? `#${userStats.groupRank}` : '—'}
              </div>
              <div className="tournament-stat-label">Group Rank</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">{userStats.watched}</div>
              <div className="tournament-stat-label">Watched</div>
            </div>
            <div className="tournament-stat">
              <div className="tournament-stat-value">{userStats.points}</div>
              <div className="tournament-stat-label">Points</div>
            </div>
          </div>
          {userStats.total > 0 ? (
            <>
              <div className="tournament-accuracy-label">
                Prediction accuracy
              </div>
              <div className="tournament-progress">
                <div
                  className="tournament-progress-fill"
                  style={{ width: `${Math.round((userStats.correct / userStats.total) * 100)}%` }}
                />
              </div>
              <div className="tournament-accuracy-pct">
                {Math.round((userStats.correct / userStats.total) * 100)}%
              </div>
            </>
          ) : (
            <>
              <div className="tournament-accuracy-label">Make predictions to track accuracy</div>
              <div className="tournament-progress">
                <div className="tournament-progress-fill" style={{ width: '0%' }} />
              </div>
              <div className="tournament-accuracy-pct">—</div>
            </>
          )}
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
                <div className="next-match-info">No upcoming matches scheduled</div>
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
                : m.isLive
                  ? `${m.home_score ?? 0}–${m.away_score ?? 0}${m.minute ? ` (${m.minute}')` : ' LIVE'}`
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
                        {isDone || isNext || m.isLive ? opp : 'vs TBD'}
                      </span>
                    </div>
                  </div>
                  <div className={`timeline-result timeline-result--${isDone ? 'done' : m.isLive ? 'next' : isNext ? 'next' : 'tbd'}`}>
                    {resultText}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bracket-footer">{TOURNAMENT_FORMAT.totalTeams}-team format · Group stage → {TOURNAMENT_FORMAT.knockoutRounds[0].name} → Final</div>
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
            {(() => {
              // Use live API rows (sorted by rank) when available, else fall back to worldCupData order
              const liveRows = standings?.table
                ? standings.table
                    .filter(s => s.group_name === selectedGroup)
                    .sort((a, b) => parseInt(a.rank) - parseInt(b.rank))
                : [];
              const teamsToDisplay = liveRows.length > 0
                ? liveRows.map(row => {
                    const norm = normTeam(row.name);
                    const wcTeam = currentGroup.teams.find(t => normTeam(t.name) === norm)
                      || { name: row.name, flag: '🌍', code: row.name, isHost: false };
                    return { wcTeam, row };
                  })
                : currentGroup.teams.map(t => ({ wcTeam: t, row: null }));

              return teamsToDisplay.map(({ wcTeam, row }, i) => {
                const isUserTeam = normTeam(userContext?.team) === normTeam(wcTeam.name);
                const gdNum = parseInt(row?.goal_diff || '0');
                return (
                  <div
                    key={wcTeam.code || i}
                    className={`group-standings-row ${isUserTeam ? 'user-team' : ''} ${i < 2 ? 'qualifying' : ''}`}
                  >
                    <span className="gsr-rank">{row?.rank ?? i + 1}</span>
                    <span className="gsr-team">
                      {wcTeam.flag} {wcTeam.name}
                      {wcTeam.isHost && <span className="host-badge">HOST</span>}
                    </span>
                    <span className="gsr-gd">{row ? (gdNum >= 0 ? '+' : '') + gdNum : '—'}</span>
                    <span className="gsr-pts">{row?.points ?? '—'}</span>
                  </div>
                );
              });
            })()}
          </div>

          <div className="standings-footer">Top 2 + 8 best 3rd-place advance to Round of 32</div>
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
