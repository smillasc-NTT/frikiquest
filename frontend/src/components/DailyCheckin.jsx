import { HulkArmIcon, SpeedsterBootIcon, ChimichangaIcon } from './QuestIcons'

const ITEMS = [
  { category: 'training', Icon: HulkArmIcon, label: 'Entreno', hint: 'del día', tone: 'fire' },
  { category: 'steps', Icon: SpeedsterBootIcon, label: '10.000', hint: 'pasos', tone: 'volt' },
  { category: 'nutrition', Icon: ChimichangaIcon, label: 'Nutrición', hint: 'Dieta cumplida', tone: 'toxic' },
]

/**
 * One big button per daily habit. Pressing it marks the habit as done for
 * today (+XP, hits the villain) and it stays pressed — it can't be undone.
 */
export default function DailyCheckin({ log, pending, onMark, xpPerItem = 10 }) {
  const doneCount = ITEMS.filter(i => log?.[i.category] === 'done').length

  return (
    <div className="checkin-card">
      <div className="checkin-header">
        <h3>Misiones de hoy</h3>
        <span className="checkin-xp">{doneCount}/3 · +{log?.xp || 0} XP</span>
      </div>

      <div className="quest-grid">
        {ITEMS.map(item => {
          const done = log?.[item.category] === 'done'
          const loading = pending === item.category + ':done'
          return (
            <button
              key={item.category}
              type="button"
              className={'quest-btn tone-' + item.tone + (done ? ' is-done' : '') + (loading ? ' is-loading' : '')}
              disabled={done || !!pending}
              aria-pressed={done}
              onClick={() => onMark(item.category, 'done')}
            >
              <span className="quest-glow" aria-hidden="true" />
              <span className="quest-icon">{done ? '✔' : <item.Icon />}</span>
              <span className="quest-label">{item.label}</span>
              <span className="quest-hint">{item.hint}</span>
              <span className="quest-reward">{done ? `+${xpPerItem} XP ✓` : `+${xpPerItem} XP`}</span>
            </button>
          )
        })}
      </div>

      <p className="checkin-footnote">
        {doneCount === 3
          ? '🏆 ¡Día perfecto! Vuelve mañana a por más.'
          : 'Pulsa cada misión al completarla: sumas XP y dañas al villano.'}
      </p>
    </div>
  )
}
