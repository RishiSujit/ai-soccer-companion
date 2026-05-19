// TODO: Phase 5 — lock predictions before kickoff
function LockButton({ onLock, disabled }) {
  return (
    <button onClick={onLock} disabled={disabled} className="lock-btn">
      Lock Predictions
    </button>
  );
}

export default LockButton;
