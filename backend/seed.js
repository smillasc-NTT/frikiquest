const db = require('./src/db');
const bcrypt = require('bcryptjs');
const helpers = require('./src/utils/helpers');

async function seed() {
  try {
    console.log('Seeding database...');
    const users = [];

    for (let i = 1; i <= 5; i++) {
      const userId = helpers.generateId();
      const passwordHash = await bcrypt.hash('password123', 10);
      const role = i === 1 ? 'admin' : 'user';
      await db.run('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [userId, 'Superfriki ' + i, 'user' + i + '@test.com', passwordHash, role]);
      await db.run('INSERT INTO user_stats (user_id, total_score, results_count) VALUES (?, ?, ?)', [userId, Math.floor(Math.random() * 1000), Math.floor(Math.random() * 20)]);
      users.push(userId);
      console.log('Created user: Superfriki ' + i);
    }

    const challengeId = helpers.generateId();
    const today = helpers.getTodayDate();
    await db.run('INSERT INTO daily_challenges (id, date, title, description, criteria, type, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [challengeId, today, '50 Flexiones', 'Completa 50 flexiones hoy. Mantén la forma correcta y registra tu resultado.', 'Mínimo: 50 repeticiones', 'numeric', 50, 500]);
    console.log('Created daily challenge');

    for (let i = 0; i < users.length; i++) {
      const resultId = helpers.generateId();
      const value = 50 + Math.floor(Math.random() * 100);
      const score = Math.min(100, Math.floor((value / 50) * 100));
      await db.run('INSERT INTO results (id, user_id, challenge_id, value, score) VALUES (?, ?, ?, ?, ?)', [resultId, users[i], challengeId, String(value), score]);
      await db.run('UPDATE user_stats SET total_score = total_score + ?, results_count = results_count + 1 WHERE user_id = ?', [score, users[i]]);
    }
    console.log('Created results');
    console.log('Seed completed!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setTimeout(seed, 500);
