function RatingButtons({ onRate, rated }) {
  return (
    <div className="rating-buttons">
      <button
        className={`rating-btn ${rated === 'up' ? 'rating-btn--active' : ''}`}
        onClick={() => onRate('up')}
        disabled={rated !== null}
        aria-label="Helpful"
      >
        👍
      </button>
      <button
        className={`rating-btn ${rated === 'down' ? 'rating-btn--active' : ''}`}
        onClick={() => onRate('down')}
        disabled={rated !== null}
        aria-label="Not helpful"
      >
        👎
      </button>
    </div>
  );
}

export default RatingButtons;
