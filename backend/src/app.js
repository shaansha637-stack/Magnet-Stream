const express = require('express'); const cors = require('cors'); const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); const crypto = require('crypto');
const config = require('./config'); const log = require('./utils/log');
const { AppError, errorBody } = require('./utils/errors');

function auth(req, _res, next) {
  const given = Buffer.from(String(req.get('x-api-key') || '')); const want = Buffer.from(config.apiSecret);
  if (!want.length || given.length !== want.length || !crypto.timingSafeEqual(given, want)) throw new AppError('UNAUTHORIZED', 'Missing or invalid API key.');
  next();
}
function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '10kb' }));
  app.use('/api/health', require('./routes/health'));
  app.use('/api', rateLimit({ windowMs: 60e3, limit: 120, standardHeaders: true, legacyHeaders: false,
    handler: (_q, res) => res.status(429).json(errorBody('RATE_LIMITED', 'Too many requests. Try again shortly.')) }));
  app.use('/api', auth);
  app.use('/api/magnet', require('./routes/magnet'));
  app.use('/api/status', require('./routes/status'));
  app.use((_q, _s, next) => next(new AppError('NOT_FOUND', 'Route not found.')));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') err = new AppError('INVALID_MAGNET', 'Request too large.');
    else if (err instanceof SyntaxError) err = new AppError('INVALID_MAGNET', 'Invalid JSON body.');
    else if (!(err instanceof AppError)) { log.error('Unhandled', err); err = new AppError('SERVER_ERROR', 'Internal server error.'); }
    res.status(err.status).json(errorBody(err.code, err.message));
  });
  return app;
}
module.exports = { createApp };

