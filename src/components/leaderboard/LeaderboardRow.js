// TODO: Phase 5 — single row in leaderboard table
function LeaderboardRow({ rank, displayName, totalPoints }) {
  return (
    <div className="leaderboard-row">
      <span>{rank}</span>
      <span>{displayName}</span>
      <span>{totalPoints} pts</span>
    </div>
  );
}

export default LeaderboardRow;
