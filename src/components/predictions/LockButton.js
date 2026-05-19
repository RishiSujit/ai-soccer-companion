function LockButton({ onLock, disabled, locked, isSubmitting }) {
  if (locked) {
    return (
      <div className="lock-button lock-button--locked">
        Prediction Locked ✓
      </div>
    );
  }

  return (
    <button
      className="lock-button"
      onClick={onLock}
      disabled={disabled || isSubmitting}
    >
      {isSubmitting ? 'Saving...' : 'Lock In Prediction'}
    </button>
  );
}

export default LockButton;
