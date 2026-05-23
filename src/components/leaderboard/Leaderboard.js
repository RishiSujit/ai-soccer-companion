import LeaderboardRow from './LeaderboardRow';

function Leaderboard({ leaderboard, userId }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="leaderboard-empty">
        No predictions locked in yet
      </div>
    );
  }

  return (
    <div className="leaderboard">
      {leaderboard.map((member, i) => (
        <LeaderboardRow
          key={member.id ?? i}
          rank={i + 1}
          displayName={member.display_name}
          totalPoints={member.total_points}
          isCurrentUser={member.user_id === userId}
        />
      ))}
    </div>
  );
}

export default Leaderboard;
