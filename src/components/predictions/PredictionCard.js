function PredictionCard({ match, selected, onSelect, isPastKickoff, locked }) {
  const { homeTeam, awayTeam, kickoff_time } = match;
  const disabled = isPastKickoff || locked;

  const kickoffLabel = new Date(kickoff_time).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const options = [
    { value: 'home', label: `${homeTeam} Win` },
    { value: 'draw', label: 'Draw' },
    { value: 'away', label: `${awayTeam} Win` },
  ];

  return (
    <div className="prediction-card">
      <div className="prediction-card__header">
        <div className="prediction-card__teams">{homeTeam} vs {awayTeam}</div>
        <div className="prediction-card__kickoff">⏱ {kickoffLabel}</div>
      </div>
      <div className="prediction-card__label">Match result</div>
      <div className="prediction-options">
        {options.map(opt => (
          <button
            key={opt.value}
            className={`prediction-option ${selected === opt.value ? 'prediction-option--selected' : ''}`}
            onClick={() => !disabled && onSelect(opt.value)}
            disabled={disabled}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default PredictionCard;
