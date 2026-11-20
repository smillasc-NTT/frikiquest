const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const bcrypt = require('bcryptjs');
const config = require('./src/config');
const helpers = require('./src/utils/helpers');

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
  try {
    await db.ready;
    console.log('Seeding database...');
    const users = [];
    const passwordHash = await bcrypt.hash('password123', 10);

    for (let i = 1; i <= 5; i++) {
      const userId = helpers.generateId();
      const role = i === 1 ? 'admin' : 'user';
      await db.run('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [userId, 'Superfriki ' + i, 'user' + i + '@test.com', passwordHash, role]);
      users.push(userId);
      console.log('Created user: Superfriki ' + i);
    }

    // Test boss event: 7 days starting on the seed date, so a fresh DB always has an active villain.
    const today = helpers.getTodayDate();
    const startDate = today;
    const endDate = helpers.addDays(today, 6);
    const image = 'data:image/webp;base64,' + fs.readFileSync(path.join(__dirname, 'seed-assets', 'villain.webp')).toString('base64');
    const eventId = helpers.generateId();
    const maxHp = helpers.calculateMaxHp(users.length, startDate, endDate, 70);
    await db.run(
      'INSERT INTO events (id, title, description, image, start_date, end_date, compliance_margin, max_hp) VALUES (?, ?, ?, ?, ?, ?, 70, ?)',
      [eventId, 'Doctor Doom', 'El tirano de Latveria ha llegado para poner a prueba vuestra constancia. Cada hábito cumplido le arranca un pedazo de armadura.', image, startDate, endDate, maxHp]
    );
    console.log('Created event (' + startDate + ' → ' + endDate + ', ' + maxHp + ' HP)');

    // Logs for the previous 10 days (today is left empty so it can be marked by hand).
    for (let d = 10; d >= 1; d--) {
      const date = helpers.addDays(today, -d);
      for (const userId of users) {
        // null = button not pressed that day
        const log = { training: pick(['done', 'done', null]), steps: pick(['done', null]), nutrition: pick(['done', 'done', null]) };
        const xp = Object.values(log).filter(v => v === 'done').length * config.xpPerItem;
        await db.run(
          'INSERT INTO daily_logs (id, user_id, date, training, steps, nutrition, xp) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [helpers.generateId(), userId, date, log.training, log.steps, log.nutrition, xp]
        );
        if (date >= startDate) {
          for (const [category, value] of Object.entries(log)) {
            if (value !== 'done') continue;
            await db.run('INSERT INTO event_hits (id, event_id, user_id, log_date, category) VALUES (?, ?, ?, ?, ?)', [helpers.generateId(), eventId, userId, date, category]);
          }
        }
      }
    }
    console.log('Created daily logs');
    console.log('Seed completed!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seed();
