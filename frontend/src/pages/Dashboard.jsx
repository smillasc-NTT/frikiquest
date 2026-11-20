import { useState, useEffect, useContext, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import VillainBoss from '../components/VillainBoss'
import DailyCheckin from '../components/DailyCheckin'
import VictoryOverlay from '../components/VictoryOverlay'
import { logService } from '../services/logService'
import { eventService } from '../services/eventService'
import { leaderboardService } from '../services/leaderboardService'

const POLL_MS = 20000

function defaultAvatar(name) {
  return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent(name || 'hero') + '&backgroundColor=ffc107&backgroundType=solid&clothingColor=ffc107'
}

function RankMedal({ rank }) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other'
  return <div className={'rank-medal ' + cls}>{rank}</div>
}

function victorySeen(eventId) {
  try { return localStorage.getItem('fq_victory_' + eventId) === '1' } catch { return false }
}
function markVictorySeen(eventId) {
  try { localStorage.setItem('fq_victory_' + eventId, '1') } catch {}
}

function StreakBadge({ streak }) {
  if (!streak) return null
  return (
    <span className={'streak-badge' + (streak >= 7 ? ' pulse' : '')}>
      🔥 {streak} {streak === 1 ? 'día' : 'días'}
    </span>
  )
}

/** Full player card, used when there is no active event. */
function PlayerCard({ user }) {
  const rank = user?.rank
  return (
    <div className="dashboard-stats-card">
      <div className="user-avatar-wrap">
        <img src={user?.avatarUrl || defaultAvatar(user?.name)} alt="avatar" className="user-avatar" />
        <div className="user-avatar-glow" />
      </div>
      <h2 className="user-avatar-name">{user?.name}</h2>
      <div className="user-badges">
        {rank && (
          <span className="rank-badge" style={{ borderColor: rank.color, color: rank.color }}>
            {rank.emoji} {rank.name}
          </span>
        )}
        <StreakBadge streak={user?.streak} />
      </div>
      <div className="stat-item" style={{ justifyContent: 'center', marginTop: '12px' }}>
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
            <div className="rank-progress-fill" style={{ width: rank.progress + '%' }} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Compact player strip shown under the villain during an event. */
function PlayerStrip({ user, xpPulseKey }) {
  const rank = user?.rank
  return (
    <div className="player-strip">
      <img src={user?.avatarUrl || defaultAvatar(user?.name)} alt="" className="player-strip-avatar" />
      <div className="player-strip-main">
        <div className="player-strip-name">{user?.name}</div>
        <div className="player-strip-badges">
          {rank && <span className="player-strip-rank" style={{ color: rank.color }}>{rank.emoji} {rank.name}</span>}
          <StreakBadge streak={user?.streak} />
        </div>
      </div>
      <div className={'player-strip-xp' + (xpPulseKey ? ' pulse' : '')} key={xpPulseKey}>
        <span className="player-strip-xp-value">{user?.totalScore || 0}</span>
        <span className="player-strip-xp-label">XP</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useContext(AppContext)

  const [event, setEvent] = useState(null)
  const [log, setLog] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(null)
  const [hit, setHit] = useState({ key: 0, amount: 0 })
  const [xpPulseKey, setXpPulseKey] = useState(0)
  const [showVictory, setShowVictory] = useState(false)

  const lastSeqRef = useRef(null)   // highest hit seq already seen
  const userIdRef = useRef(user?.id)
  userIdRef.current = user?.id

  const playHit = (amount) => setHit(h => ({ key: h.key + 1, amount }))

  const applyEvent = (ev, { animateOthers }) => {
    setEvent(prev => (ev && prev && prev.id === ev.id && !ev.recentHits ? { ...prev, ...ev } : ev))
    if (!ev) return

    if (ev.recentHits) {
      const maxSeq = ev.recentHits.reduce((m, h) => Math.max(m, h.seq), 0)
      if (animateOthers && lastSeqRef.current !== null && maxSeq > lastSeqRef.current) {
        const fresh = ev.recentHits.filter(h => h.seq > lastSeqRef.current && h.userId !== userIdRef.current)
        if (fresh.length) {
          playHit(fresh.length)
          const names = [...new Set(fresh.map(h => h.userName))]
          const who = names.length === 1 ? names[0] : `${names[0]} y ${names.length - 1} más`
          showToast(`⚔️ ¡${who} ${names.length === 1 ? 'ha' : 'han'} golpeado al villano!`, 'info')
        }
      }
      lastSeqRef.current = Math.max(lastSeqRef.current ?? 0, maxSeq)
    }

    if (ev.isDefeated && !victorySeen(ev.id)) setShowVictory(true)
  }

  const loadEvent = async (opts = { animateOthers: false }) => {
    try {
      const { event: ev } = await eventService.getActive()
      applyEvent(ev, opts)
    } catch {}
  }

  const loadLeaderboard = async () => {
    try {
      const d = await leaderboardService.getDailyLeaderboard(5)
      setLeaderboard(d.entries || [])
    } catch {}
  }

  const loadLog = async () => {
    try {
      setLog(await logService.getToday())
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  useEffect(() => {
    Promise.all([loadEvent(), loadLog(), loadLeaderboard(), refreshUser()]).finally(() => setLoading(false))
    const iv = setInterval(() => {
      loadEvent({ animateOthers: true })
      loadLeaderboard()
    }, POLL_MS)
    return () => clearInterval(iv)
  }, [])

  const handleMark = async (category, value) => {
    setPending(category + ':' + value)
    try {
      const res = await logService.markToday(category, value)
      setLog(res.log)
      if (res.event) applyEvent(res.event, { animateOthers: false })
      if (res.hit) playHit(1)
      if (res.event?.isDefeated) loadEvent() // fetch the finishing blow for the victory screen
      if (res.xpGained) {
        setXpPulseKey(k => k + 1)
        showToast(res.hit ? `+${res.xpGained} XP · ¡Golpe al villano!` : `+${res.xpGained} XP`, 'success')
      }
      refreshUser()
      loadLeaderboard()
    } catch (err) {
      showToast(err.message, 'error')
      loadLog()
    } finally {
      setPending(null)
    }
  }

  const closeVictory = () => {
    if (event) markVictorySeen(event.id)
    setShowVictory(false)
  }

  if (loading) return (
    <><Header /><div className="loading-screen"><div className="loading-dot">◆</div><span>Cargando...</span></div></>
  )

  return (
    <>
      <Header />
      <div className="page-content">

        {event ? (
          <>
            <VillainBoss event={event} hit={hit} />
            <PlayerStrip user={user} xpPulseKey={xpPulseKey} />
          </>
        ) : (
          <PlayerCard user={user} />
        )}

        <DailyCheckin log={log} pending={pending} onMark={handleMark} />

        <div className="leaderboard-section" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top hoy</h3>
            <Link to="/leaderboard" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>Ver todo →</Link>
          </div>
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <p className="text-muted" style={{ padding: '16px', textAlign: 'center', fontSize: '13px' }}>Sin datos aún</p>
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

      {showVictory && event && <VictoryOverlay event={event} onClose={closeVictory} />}
    </>
  )
}
