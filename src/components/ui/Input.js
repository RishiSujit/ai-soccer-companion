function Input({ value, onChange, placeholder = '', disabled = false, onKeyDown }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className="input"
    />
  );
}

export default Input;
