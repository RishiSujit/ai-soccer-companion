function LeaderboardRow({ rank, displayName, totalPoints, isCurrentUser }) {
  const isFirst = rank === 1;
  const initial = (displayName ?? '?')[0].toUpperCase();

  return (
    <div className={`leaderboard-row ${isFirst ? 'leaderboard-row--first' : ''} ${isCurrentUser ? 'leaderboard-row--you' : ''}`}>
      <span className="leaderboard-row__rank">
        {isFirst ? '🏆' : rank}
      </span>
      <div className="leaderboard-row__avatar">{initial}</div>
      <span className="leaderboard-row__name">
        {displayName}
        {isCurrentUser && <span className="leaderboard-row__you-tag"> (you)</span>}
      </span>
      <span className="leaderboard-row__points">{totalPoints} pts</span>
    </div>
  );
}

export default LeaderboardRow;
