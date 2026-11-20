const CONFETTI = ['🎉', '⭐', '🏆', '✨', '💥', '🎊']

export default function VictoryOverlay({ event, onClose }) {
  return (
    <div className="victory-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Villano derrotado">
      <div className="victory-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ left: (i * 37) % 100 + '%', animationDelay: (i % 6) * 0.25 + 's' }}>
            {CONFETTI[i % CONFETTI.length]}
          </span>
        ))}
      </div>
      <div className="victory-box" onClick={e => e.stopPropagation()}>
        <div className="victory-kicker">Victoria del grupo</div>
        <h2 className="victory-title">¡{event.title} ha caído!</h2>
        <p className="victory-text">
          Entre todos habéis agotado su vida.
          {event.finishingBlow && <> El golpe final fue de <strong>{event.finishingBlow.userName}</strong>.</>}
        </p>
        <button className="btn btn-primary" onClick={onClose}>¡A por el siguiente!</button>
      </div>
    </div>
  )
}
