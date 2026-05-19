function PropBetCard({ prop, selected, onSelect, isPastKickoff, locked }) {
  const { question, options } = prop;
  const disabled = isPastKickoff || locked;

  return (
    <div className="prop-bet-card">
      <div className="prop-bet-card__question">{question}</div>
      <div className="prop-bet-options">
        {options.map(opt => (
          <button
            key={opt}
            className={`prop-bet-option ${selected === opt ? 'prop-bet-option--selected' : ''}`}
            onClick={() => !disabled && onSelect(opt)}
            disabled={disabled}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default PropBetCard;
