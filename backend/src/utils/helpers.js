const crypto = require('crypto');

const helpers = {
  generateId: () => crypto.randomBytes(16).toString('hex').toLowerCase(),
  calculateScore: (value, type, minValue = null) => {
    if (type === 'numeric' && minValue) {
      const ratio = parseInt(value) / minValue;
      return Math.min(Math.floor(ratio * 100), 100);
    }
    if (type === 'boolean') return value === 'true' || value === true ? 100 : 0;
    if (type === 'text') return 100;
    return 100;
  },
  getTodayDate: () => new Date().toISOString().split('T')[0],
  getYesterdayDate: () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  },

  calculateStreak: (dates) => {
    // dates: array de strings 'YYYY-MM-DD' ordenados DESC
    if (!dates || !dates.length) return 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })();
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i-1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((prev - curr) / 86400000);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
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
