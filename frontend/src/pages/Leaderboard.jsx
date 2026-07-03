import { useState, useEffect, useContext } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import { leaderboardService } from '../services/leaderboardService'

function defaultAvatar(name) {
  return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent(name || 'hero') + '&backgroundColor=ffc107&backgroundType=solid&clothingColor=ffc107'
}

function RankMedal({ rank }) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other'
  return <div className={'rank-medal ' + cls}>{rank}</div>
}

export default function Leaderboard() {
  const { user } = useAuth()
  const { showToast } = useContext(AppContext)
  const [tab, setTab] = useState('daily')
  const [daily, setDaily] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, 20000)
    return () => clearInterval(iv)
  }, [])

  const loadAll = async () => {
    try {
      const [d, m] = await Promise.all([
        leaderboardService.getDailyLeaderboard(50),
        leaderboardService.getMonthlyLeaderboard(50),
      ])
      setDaily(d.entries || [])
      setMonthly(m.entries || [])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false) }
  }

  const entries = tab === 'daily' ? daily : monthly

  return (
    <>
      <Header title="Ranking" />
      <div className="page-content">
        <div className="leaderboard-tabs">
          <button className={'tab-btn' + (tab === 'daily' ? ' active' : '')} onClick={() => setTab('daily')}>Hoy</button>
          <button className={'tab-btn' + (tab === 'monthly' ? ' active' : '')} onClick={() => setTab('monthly')}>Este mes</button>
        </div>

        {loading ? (
          <div className="loading-screen" style={{minHeight:'200px'}}><div className="loading-dot">◆</div></div>
        ) : entries.length === 0 ? (
          <p className="text-muted" style={{textAlign:'center',padding:'32px'}}>Sin datos aún</p>
        ) : (
          <div className="leaderboard-list">
            {entries.map(entry => (
              <div key={entry.userId} className={'leaderboard-row' + (entry.userId === user?.id ? ' is-me' : '')}>
                <RankMedal rank={entry.rank} />
                <img src={entry.avatarUrl || defaultAvatar(entry.userName)} alt="" className="lb-avatar" />
                <span className="lb-name">{entry.userName}{entry.userId === user?.id ? ' (tú)' : ''}</span>
                <span className="lb-score">{entry.score} XP</span>
                {entry.changeFromYesterday !== null && entry.changeFromYesterday !== undefined && (
                  <span className={'lb-change ' + (entry.changeFromYesterday > 0 ? 'up' : entry.changeFromYesterday < 0 ? 'down' : '')}>
                    {entry.changeFromYesterday > 0 ? '▲' + entry.changeFromYesterday : entry.changeFromYesterday < 0 ? '▼' + Math.abs(entry.changeFromYesterday) : '—'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
