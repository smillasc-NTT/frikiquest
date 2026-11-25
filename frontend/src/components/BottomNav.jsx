import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { CapShieldIcon, InfinityGauntletIcon, SpiderMaskIcon } from './NavIcons'

function IconAdmin({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>
    </svg>
  )
}

const baseTabs = [
  { to: '/dashboard', Icon: CapShieldIcon, label: 'Home' },
  { to: '/leaderboard', Icon: InfinityGauntletIcon, label: 'Ranking' },
  { to: '/profile', Icon: SpiderMaskIcon, label: 'Perfil' },
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
