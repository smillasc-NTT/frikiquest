import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function IconHome({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active
        ? <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        : <path d="M12 5.69L17 10.19V18H15V12H9V18H7V10.19L12 5.69ZM12 3L2 12H5V20H11V14H13V20H19V12H22L12 3Z"/>
      }
    </svg>
  )
}

function IconTrophy({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active
        ? <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.44 4.94.63 1.5 1.98 2.63 3.56 2.96V18H9v2h6v-2h-2v-2.1c1.58-.33 2.93-1.46 3.56-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM7 10.82C5.84 10.4 5 9.3 5 8V7h2v3.82zM19 8c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
        : <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.44 4.94.63 1.5 1.98 2.63 3.56 2.96V18H9v2h6v-2h-2v-2.1c1.58-.33 2.93-1.46 3.56-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-14-1h2v3.82C5.84 7.4 5 6.3 5 5V7h0v-.18C5 6.37 5.37 6 5.82 6H5zm12 3.82V5h2v1c0 1.3-.84 2.4-2 2.82zM7 5h10v8c0 2.76-2.24 5-5 5s-5-2.24-5-5V5z"/>
      }
    </svg>
  )
}

function IconPerson({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active
        ? <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        : <>
            <circle cx="12" cy="8" r="3.5"/>
            <path d="M20 20c0-3.33-5.33-5-8-5s-8 1.67-8 5"/>
          </>
      }
    </svg>
  )
}

function IconAdmin({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>
    </svg>
  )
}

const baseTabs = [
  { to: '/dashboard', Icon: IconHome, label: 'Home' },
  { to: '/leaderboard', Icon: IconTrophy, label: 'Ranking' },
  { to: '/profile', Icon: IconPerson, label: 'Perfil' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const tabs = user?.role === 'admin'
    ? [...baseTabs, { to: '/admin', Icon: IconAdmin, label: 'Admin' }]
    : baseTabs
  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, Icon, label }) => {
        const active = pathname === to
        return (
          <Link key={to} to={to} className={'bottom-nav-item' + (active ? ' active' : '')}>
            <span className="bottom-nav-icon"><Icon active={active} /></span>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
