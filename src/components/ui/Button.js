function Button({ children, onClick, disabled = false, variant = 'primary' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn--${variant}`}
    >
      {children}
    </button>
  );
}

export default Button;
