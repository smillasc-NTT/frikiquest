import { Link } from 'react-router-dom'

/** `children` is rendered aligned to the right edge of the header. */
export default function Header({ title, children }) {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/dashboard" className="header-logo">FrikiQuest</Link>
        {title && <span className="header-page-title">{title}</span>}
        {children && <div className="header-aside">{children}</div>}
      </div>
    </header>
  )
}
