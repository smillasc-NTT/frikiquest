import { useState, useEffect, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import Card from '../components/Card'
import { challengeService } from '../services/challengeService'
import { leaderboardService } from '../services/leaderboardService'

function defaultAvatar(name) {
  return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent(name || 'hero') + '&backgroundColor=ffc107&backgroundType=solid&clothingColor=ffc107'
}

function RankMedal({ rank }) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other'
  return <div className={'rank-medal ' + cls}>{rank}</div>
}

export default function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()

  const [challenge, setChallenge] = useState(null)
  const [noChallenge, setNoChallenge] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const iv = setInterval(loadLeaderboard, 20000)
    return () => clearInterval(iv)
  }, [])

  const loadData = async () => {
    await Promise.all([loadChallenge(), loadLeaderboard()])
    setLoading(false)
  }

  const loadChallenge = async () => {
    try {
      const ch = await challengeService.getTodayChallenge()
      setChallenge(ch)
      setNoChallenge(false)
    } catch (err) {
      if (err.message === 'No challenge for today') setNoChallenge(true)
      else showToast(err.message, 'error')
    }
  }

  const loadLeaderboard = async () => {
    try {
      const d = await leaderboardService.getDailyLeaderboard(5)
      setLeaderboard(d.entries || [])
    } catch {}
  }

  if (loading) return (
    <><Header /><div className="loading-screen"><div className="loading-dot">◆</div><span>Cargando...</span></div></>
  )

  const rank = user?.rank
  const streak = user?.streak || 0
  const avatarSrc = user?.avatarUrl || defaultAvatar(user?.name)

  return (
    <>
      <Header />
      <div className="page-content">

        {/* User stats */}
        <div className="dashboard-stats-card">
          <div className="user-avatar-wrap">
            <img src={avatarSrc} alt="avatar" className="user-avatar" />
            <div className="user-avatar-glow" />
          </div>
          <h2 className="user-avatar-name">{user?.name}</h2>

          <div className="user-badges">
            {rank && (
              <span className="rank-badge" style={{borderColor: rank.color, color: rank.color}}>
                {rank.emoji} {rank.name}
              </span>
            )}
            {streak > 0 && (
              <span className={'streak-badge' + (streak >= 7 ? ' pulse' : '')}>
                🔥 {streak} {streak === 1 ? 'día' : 'días'}
              </span>
            )}
          </div>

          <div className="stat-item" style={{justifyContent:'center',marginTop:'12px'}}>
            <span className="stat-value">{user?.totalScore || 0}</span>
            <span className="stat-label">XP total</span>
          </div>

          {rank && rank.nextThreshold && (
            <div className="rank-progress-wrap">
              <div className="rank-progress-label">
                <span>Hacia {rank.nextName}</span>
                <span>{rank.progress}%</span>
              </div>
              <div className="rank-progress-bar">
                <div className="rank-progress-fill" style={{width: rank.progress + '%'}} />
              </div>
            </div>
          )}
        </div>

        {/* Challenge */}
        {noChallenge ? (
          <Card style={{marginTop:'16px'}}>
            <div className="no-challenge">
              <div className="no-challenge-icon">⚔️</div>
              <h3>Sin misión hoy</h3>
              <p className="text-muted mt-sm">No hay reto configurado. ¡Vuelve mañana!</p>
            </div>
          </Card>
        ) : challenge ? (
          <Card highlighted style={{marginTop:'16px'}}>
            <div className="challenge-tag">⚡ Reto del día</div>
            <h2 className="challenge-title">{challenge.title}</h2>
            <p className="challenge-desc">{challenge.description}</p>
            <div className="challenge-criteria">{challenge.criteria}</div>
            {challenge.userHasSubmitted ? (
              <div className="badge badge-success">✓ Completado hoy</div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/report', { state: { challenge } })}
              >
                Reportar Resultado
              </button>
            )}
          </Card>
        ) : null}

        {/* Mini leaderboard */}
        <div className="leaderboard-section" style={{marginTop:'24px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <h3 style={{fontSize:'14px',color:'var(--color-text-muted)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Top hoy</h3>
            <Link to="/leaderboard" style={{fontSize:'12px',color:'var(--color-primary)'}}>Ver todo →</Link>
          </div>
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <p className="text-muted" style={{padding:'16px',textAlign:'center',fontSize:'13px'}}>Sin datos aún</p>
            ) : leaderboard.map(entry => (
              <div key={entry.userId} className={'leaderboard-row' + (entry.userId === user?.id ? ' is-me' : '')}>
                <RankMedal rank={entry.rank} />
                <img src={entry.avatarUrl || defaultAvatar(entry.userName)} alt="" className="lb-avatar" />
                <span className="lb-name">{entry.userName}{entry.userId === user?.id ? ' (tú)' : ''}</span>
                <span className="lb-score">{entry.score} XP</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
