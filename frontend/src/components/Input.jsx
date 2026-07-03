export default function Input({ type = 'text', label, placeholder, value, onChange, error, required = false, min, max }) {
  return (
    <div className="input-group">
      {label && <label>{label}{required && <span style={{color:'var(--color-primary)'}}> *</span>}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        className={'input' + (error ? ' input-error-field' : '')}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  )
}
