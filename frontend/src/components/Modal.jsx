/** `closeOnBackdrop={false}` for forms, where a stray tap would discard what was typed. */
export default function Modal({ isOpen, onClose, title, children, closeOnBackdrop = true }) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={closeOnBackdrop ? onClose : undefined}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
