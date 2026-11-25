const db = require('../db');
const helpers = require('./helpers');

const EVENT_COLUMNS = 'id, title, description, start_date, end_date, compliance_margin, max_hp, custom_max_hp, damage_adjust, created_at, updated_at, image IS NOT NULL AS has_image';

async function countApprovedUsers() {
  const row = await db.get("SELECT COUNT(*) AS count FROM users WHERE status = 'approved'");
  return row.count;
}

function getActiveEvent(today = helpers.getTodayDate()) {
  return db.get(`SELECT ${EVENT_COLUMNS} FROM events WHERE start_date <= ? AND end_date >= ? ORDER BY start_date LIMIT 1`, [today, today]);
}

async function countHits(eventId) {
  const row = await db.get('SELECT COUNT(*) AS count FROM event_hits WHERE event_id = ?', [eventId]);
  return row.count;
}

function eventStatus(event, today) {
  if (today < event.start_date) return 'upcoming';
  if (today > event.end_date) return 'finished';
  return 'active';
}

/** Public shape of an event, without the (large) image payload. */
async function toEventPayload(event, today = helpers.getTodayDate()) {
  // Damage = real hits plus the admin's manual adjustment, kept within the life bar.
  const rawDamage = (await countHits(event.id)) + event.damage_adjust;
  const damage = Math.max(0, Math.min(rawDamage, event.max_hp));
  const hp = event.max_hp - damage;
  const totalDays = helpers.daysBetween(event.start_date, event.end_date) + 1;
  const status = eventStatus(event, today);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl: event.has_image ? `/api/events/${event.id}/image?v=${encodeURIComponent(event.updated_at)}` : null,
    startDate: event.start_date,
    endDate: event.end_date,
    complianceMargin: event.compliance_margin,
    maxHp: event.max_hp,
    customMaxHp: event.custom_max_hp,
    damage,
    hp,
    hpPercent: Math.round((hp / event.max_hp) * 1000) / 10,
    isDefeated: hp <= 0,
    totalDays,
    daysLeft: status === 'active' ? helpers.daysBetween(today, event.end_date) + 1 : status === 'upcoming' ? totalDays : 0,
    status,
  };
}

/**
 * Removes one hit point from the event, unless the villain is already dead or
 * this exact item was already counted. Single statement so concurrent hits
 * can't push damage past max_hp.
 */
async function registerHit(event, userId, logDate, category) {
  const result = await db.run(
    `INSERT OR IGNORE INTO event_hits (id, event_id, user_id, log_date, category)
     SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM event_hits WHERE event_id = ?)
       + (SELECT damage_adjust FROM events WHERE id = ?) < ?`,
    [helpers.generateId(), event.id, userId, logDate, category, event.id, event.id, event.max_hp]
  );
  return result.changes === 1;
}

async function getRecentHits(eventId, limit = 10) {
  const rows = await db.all(
    `SELECT h.rowid AS seq, h.user_id, h.category, h.created_at, u.name
     FROM event_hits h LEFT JOIN users u ON u.id = h.user_id
     WHERE h.event_id = ? ORDER BY h.rowid DESC LIMIT ?`,
    [eventId, limit]
  );
  return rows.map(r => ({ seq: r.seq, userId: r.user_id, userName: r.name || 'Alguien', category: r.category, createdAt: r.created_at }));
}

async function getFinishingBlow(event) {
  // Position of the killing hit; negative if an admin edit alone left the villain dead.
  const offset = event.max_hp - event.damage_adjust - 1;
  if (offset < 0) return null;
  const row = await db.get(
    `SELECT h.user_id, h.created_at, u.name FROM event_hits h LEFT JOIN users u ON u.id = h.user_id
     WHERE h.event_id = ? ORDER BY h.rowid LIMIT 1 OFFSET ?`,
    [event.id, offset]
  );
  return row ? { userId: row.user_id, userName: row.name || 'Alguien', createdAt: row.created_at } : null;
}

module.exports = { EVENT_COLUMNS, countApprovedUsers, countHits, getActiveEvent, toEventPayload, registerHit, getRecentHits, getFinishingBlow };
