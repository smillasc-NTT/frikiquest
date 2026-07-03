export default function Button({ variant = 'primary', disabled = false, loading = false, onClick, children, className = '', type = 'button', auto = false }) {
  return (
    <button
      type={type}
      className={'btn btn-' + variant + (auto ? ' btn-auto' : '') + (className ? ' ' + className : '')}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? '···' : children}
    </button>
  )
}
