import { Link } from 'react-router-dom'

export default function Header({ title }) {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/dashboard" className="header-logo">FrikiQuest</Link>
        {title && <span className="header-page-title">{title}</span>}
      </div>
    </header>
  )
}
