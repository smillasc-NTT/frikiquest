const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const db = require('./db');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const resultRoutes = require('./routes/results');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'), (err) => { if (err) next(); });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', code: 'NOT_FOUND' });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log('[' + new Date().toISOString() + '] FrikiQuest API running on port ' + config.port);
  console.log('Environment: ' + config.nodeEnv);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
