const db = require('../db');
const validators = require('../utils/validators');
const helpers = require('../utils/helpers');
const events = require('../utils/events');

/** Validates the admin form. Returns an error message or null. */
function validateEventInput({ title, description, startDate, endDate, complianceMargin, image }, { imageRequired }) {
  if (!title || !String(title).trim()) return 'El título es obligatorio';
  if (!description || !String(description).trim()) return 'La descripción es obligatoria';
  if (!helpers.isValidDate(startDate) || !helpers.isValidDate(endDate)) return 'Fechas no válidas';
  if (endDate < startDate) return 'La fecha de fin debe ser posterior a la de inicio';
  const margin = Number(complianceMargin);
  if (!Number.isInteger(margin) || margin < 10 || margin > 100) return 'El margen debe ser un entero entre 10 y 100';
  if (imageRequired && !image) return 'La imagen es obligatoria';
  if (image && !validators.isValidImageDataUrl(image)) return 'Imagen no válida (PNG, JPG, WEBP o GIF, máx ~1MB)';
  return null;
}

async function findOverlap(startDate, endDate, excludeId = null) {
  return db.get(
    'SELECT id, title, start_date, end_date FROM events WHERE start_date <= ? AND end_date >= ? AND id != ?',
    [endDate, startDate, excludeId || '']
  );
}

function overlapMessage(other) {
  return `Las fechas se solapan con "${other.title}" (${other.start_date} → ${other.end_date}). Elige otras fechas.`;
}

const eventController = {
  getActive: async (req, res, next) => {
    try {
      const today = helpers.getTodayDate();
      const event = await events.getActiveEvent(today);
      if (!event) return res.json({ event: null });

      const payload = await events.toEventPayload(event, today);
      payload.recentHits = await events.getRecentHits(event.id);
      payload.finishingBlow = payload.isDefeated ? await events.getFinishingBlow(event) : null;
      res.json({ event: payload });
    } catch (err) {
      next(err);
    }
  },

  /** Public (img tags can't send the JWT). Only serves validated raster images. */
  getImage: async (req, res, next) => {
    try {
      const row = await db.get('SELECT image FROM events WHERE id = ?', [req.params.id]);
      const match = row?.image && /^data:(image\/[a-z]+);base64,(.*)$/s.exec(row.image);
      if (!match) return res.status(404).json({ error: 'Image not found', code: 'NOT_FOUND' });
      res.set('Content-Type', match[1]);
      res.set('Cache-Control', 'public, max-age=31536000, immutable'); // URL is versioned by updated_at
      res.set('X-Content-Type-Options', 'nosniff');
      // The frontend may live on another origin (Vite dev server); helmet defaults to same-origin.
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.send(Buffer.from(match[2], 'base64'));
    } catch (err) {
      next(err);
    }
  },

  list: async (req, res, next) => {
    try {
      const today = helpers.getTodayDate();
      const rows = await db.all(`SELECT ${events.EVENT_COLUMNS} FROM events ORDER BY start_date DESC`);
      const list = await Promise.all(rows.map(e => events.toEventPayload(e, today)));
      res.json({ events: list, approvedUsers: await events.countApprovedUsers() });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const error = validateEventInput(req.body, { imageRequired: true });
      if (error) return res.status(400).json({ error, code: 'VALIDATION_ERROR' });

      const { title, description, startDate, endDate, image } = req.body;
      const margin = Number(req.body.complianceMargin);
      const overlap = await findOverlap(startDate, endDate);
      if (overlap) return res.status(400).json({ error: overlapMessage(overlap), code: 'EVENT_OVERLAP' });

      const maxHp = helpers.calculateMaxHp(await events.countApprovedUsers(), startDate, endDate, margin);
      const id = helpers.generateId();
      await db.run(
        'INSERT INTO events (id, title, description, image, start_date, end_date, compliance_margin, max_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title.trim(), description.trim(), image, startDate, endDate, margin, maxHp]
      );
      const event = await db.get(`SELECT ${events.EVENT_COLUMNS} FROM events WHERE id = ?`, [id]);
      res.status(201).json(await events.toEventPayload(event));
    } catch (err) {
      next(err);
    }
  },

  /** Recomputes max_hp with the current number of approved users; damage already dealt is kept. */
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existing = await db.get('SELECT id FROM events WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ error: 'Event not found', code: 'NOT_FOUND' });

      const error = validateEventInput(req.body, { imageRequired: false });
      if (error) return res.status(400).json({ error, code: 'VALIDATION_ERROR' });

      const { title, description, startDate, endDate, image } = req.body;
      const margin = Number(req.body.complianceMargin);
      const overlap = await findOverlap(startDate, endDate, id);
      if (overlap) return res.status(400).json({ error: overlapMessage(overlap), code: 'EVENT_OVERLAP' });

      const maxHp = helpers.calculateMaxHp(await events.countApprovedUsers(), startDate, endDate, margin);
      await db.run(
        `UPDATE events SET title = ?, description = ?, start_date = ?, end_date = ?, compliance_margin = ?, max_hp = ?,
         image = COALESCE(?, image), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [title.trim(), description.trim(), startDate, endDate, margin, maxHp, image || null, id]
      );
      const event = await db.get(`SELECT ${events.EVENT_COLUMNS} FROM events WHERE id = ?`, [id]);
      res.json(await events.toEventPayload(event));
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existing = await db.get('SELECT id FROM events WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ error: 'Event not found', code: 'NOT_FOUND' });
      await db.run('DELETE FROM event_hits WHERE event_id = ?', [id]);
      await db.run('DELETE FROM events WHERE id = ?', [id]);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = eventController;
