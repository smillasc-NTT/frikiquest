const crypto = require('crypto');
const config = require('../config');

// 'YYYY-MM-DD' for a Date in the app time zone (en-CA formats as ISO date).
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
});

// Plain calendar arithmetic on 'YYYY-MM-DD' strings (UTC-based, no DST issues).
function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().split('T')[0];
}

function daysBetween(fromStr, toStr) {
  return Math.round((new Date(toStr + 'T00:00:00Z') - new Date(fromStr + 'T00:00:00Z')) / 86400000);
}

const helpers = {
  generateId: () => crypto.randomBytes(16).toString('hex').toLowerCase(),
  getTodayDate: () => dateFormatter.format(new Date()),
  getYesterdayDate: () => addDays(dateFormatter.format(new Date()), -1),
  addDays,
  daysBetween,
  isValidDate: (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00Z')),

  /**
   * Streak = consecutive days (ending today or yesterday) with at least one
   * completed item (xp > 0). Today not being done yet doesn't break it.
   * logs: [{ date, xp }]
   */
  calculateStreak: (logs, today = helpers.getTodayDate()) => {
    const xpByDate = new Map(logs.map(l => [l.date, l.xp]));
    let day = (xpByDate.get(today) || 0) > 0 ? today : addDays(today, -1);
    let streak = 0;
    while (streak < 400 && (xpByDate.get(day) || 0) > 0) {
      streak++;
      day = addDays(day, -1);
    }
    return streak;
  },

  /** Hit points needed to kill the villain: users × days × 3 items × margin. */
  calculateMaxHp: (users, startDate, endDate, marginPct) => {
    const days = daysBetween(startDate, endDate) + 1;
    return Math.max(1, Math.ceil(Math.max(users, 1) * days * 3 * (marginPct / 100)));
  },

  getRank: (totalScore) => {
    const tiers = [
      { min: 2500, name: 'Diamante', emoji: '💎', color: '#a8d8ff', next: null, nextName: null },
      { min: 1000, name: 'Oro',      emoji: '🥇', color: '#FFD700', next: 2500, nextName: 'Diamante' },
      { min: 500,  name: 'Plata',    emoji: '🥈', color: '#C0C0C0', next: 1000, nextName: 'Oro' },
      { min: 200,  name: 'Bronce',   emoji: '🥉', color: '#CD7F32', next: 500,  nextName: 'Plata' },
      { min: 0,    name: 'Novato',   emoji: '⚔️',  color: '#9c8f78', next: 200,  nextName: 'Bronce' },
    ];
    const tier = tiers.find(t => totalScore >= t.min);
    const progress = tier.next
      ? Math.min(100, Math.round(((totalScore - tier.min) / (tier.next - tier.min)) * 100))
      : 100;
    return { name: tier.name, emoji: tier.emoji, color: tier.color, progress, nextThreshold: tier.next, nextName: tier.nextName };
  },
};

module.exports = helpers;
