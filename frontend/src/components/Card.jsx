export default function Card({ highlighted = false, hover = false, children, className = '' }) {
  const cls = ['card', highlighted && 'card-highlighted', hover && 'card-hover', className].filter(Boolean).join(' ')
  return <div className={cls}>{children}</div>
}
