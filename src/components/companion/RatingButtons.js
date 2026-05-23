function RatingButtons({ onRate, rated }) {
  return (
    <div className="rating-buttons">
      <button
        className={`rating-btn ${rated === 'up' ? 'rating-btn--active rated-up' : ''}`}
        onClick={() => onRate('up')}
        disabled={rated !== null}
        aria-label="Helpful"
      >
        Helpful
      </button>
      <button
        className={`rating-btn ${rated === 'down' ? 'rating-btn--active rated-down' : ''}`}
        onClick={() => onRate('down')}
        disabled={rated !== null}
        aria-label="Not helpful"
      >
        Not helpful
      </button>
    </div>
  );
}

export default RatingButtons;
