import { useEffect, useRef, useState } from 'react'
import { eventService } from '../services/eventService'

const IMPACTS = ['💥', '⚡', '💢', '✴️']

function hpTone(pct) {
  if (pct > 50) return 'hp-high'
  if (pct > 20) return 'hp-mid'
  return 'hp-low'
}

/** Floating impact effects for each new hit key (auto-removed after the animation). */
function useHitEffects(hit) {
  const [effects, setEffects] = useState([])
  const timers = useRef([])

  useEffect(() => {
    if (!hit?.key) return
    const id = hit.key
    setEffects(prev => [...prev, {
      id,
      amount: hit.amount || 1,
      icon: IMPACTS[Math.floor(Math.random() * IMPACTS.length)],
      x: 30 + Math.random() * 40,
      y: 25 + Math.random() * 35,
    }])
    timers.current.push(setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 1100))
  }, [hit?.key])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  return effects
}

function HitEffects({ effects }) {
  return effects.map(fx => (
    <div key={fx.id} className="boss-fx" style={{ left: fx.x + '%', top: fx.y + '%' }}>
      <span className="boss-fx-burst">{fx.icon}</span>
      <span className="boss-fx-dmg">-{fx.amount} HP</span>
    </div>
  ))
}

function BossImage({ event, src }) {
  return src
    ? <img src={src} alt={event.title} className="boss-img" draggable="false" />
    : <div className="boss-img boss-img-fallback" aria-label={event.title}>👹</div>
}

function HpBar({ pct, small = false }) {
  return (
    <div className={'boss-hp-bar' + (small ? ' is-small' : '')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="boss-hp-trail" style={{ width: pct + '%' }} />
      <div className={'boss-hp-fill ' + hpTone(pct)} style={{ width: pct + '%' }} />
    </div>
  )
}

/**
 * Boss card for the active event, plus a compact HUD pinned under the header
 * while the card is scrolled out of view, so hits are always visible.
 * `hit` = { key, amount } — every new key plays the damage animation.
 */
export default function VillainBoss({ event, hit }) {
  const effects = useHitEffects(hit)
  const stageRef = useRef(null)
  const [cardHidden, setCardHidden] = useState(false)

  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // Show the HUD when the header starts covering the life bar overlaid on the
    // bottom of the image (60px = sticky header height).
    const obs = new IntersectionObserver(
      ([entry]) => setCardHidden(entry.intersectionRatio < 0.4),
      { rootMargin: '-60px 0px 0px 0px', threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const src = eventService.imageSrc(event)
  const pct = Math.max(0, Math.min(100, event.hpPercent))
  const dead = event.isDefeated
  const daysLabel = `${event.daysLeft} ${event.daysLeft === 1 ? 'día' : 'días'}`
  // Remounting the figure on every hit key replays the shake/flash animation.
  const figureKey = hit?.key || 0
  const figureClass = 'boss-figure' + (hit?.key ? ' is-hit' : '')

  return (
    <>
      <div className={'boss-card' + (dead ? ' is-dead' : '')}>
        <div className="boss-stage" ref={stageRef}>
          <div key={figureKey} className={figureClass}>
            <BossImage event={event} src={src} />
            <div className="boss-flash" />
          </div>
          {!cardHidden && <HitEffects effects={effects} />}
          {dead && <div className="boss-dead-stamp">DERROTADO</div>}
        </div>

        <div className="boss-tag">☠ Evento · {daysLabel} {event.daysLeft === 1 ? 'restante' : 'restantes'}</div>

        <div className="boss-overlay">
          <h2 className="boss-title">{event.title}</h2>
          <p className="boss-desc">{event.description}</p>

          <div className="boss-hp">
            <div className="boss-hp-label">
              <span>Vida</span>
              <span className="boss-hp-value">{dead ? '0' : pct.toFixed(1)}%</span>
            </div>
            <HpBar pct={pct} />
            <div className="boss-hp-meta">{event.hp} / {event.maxHp} HP</div>
          </div>

          {dead && event.finishingBlow && (
            <p className="boss-finisher">Golpe final: <strong>{event.finishingBlow.userName}</strong></p>
          )}
        </div>
      </div>

      {cardHidden && (
        <div className={'boss-hud' + (dead ? ' is-dead' : '')} aria-hidden="true">
          <div className="boss-hud-inner">
            <div className="boss-hud-stage">
              <div key={figureKey} className={figureClass}>
                <BossImage event={event} src={src} />
                <div className="boss-flash" />
              </div>
              <HitEffects effects={effects} />
            </div>
            <div className="boss-hud-main">
              <div className="boss-hud-top">
                <span className="boss-hud-title">{dead ? '☠ ' : ''}{event.title}</span>
                <span className="boss-hud-pct">{dead ? 'DERROTADO' : pct.toFixed(1) + '%'}</span>
              </div>
              <HpBar pct={pct} small />
              <div className="boss-hud-meta">{event.hp} / {event.maxHp} HP · {daysLabel}</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
