module.exports = {
  port: +process.env.PORT || 3000,
  dbPath: process.env.DATABASE_PATH || './data/jobs.db',
  apiSecret: process.env.API_SECRET || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  provider: process.env.PROVIDER || 'seedr',
  jobTtlMs: (+process.env.JOB_TTL_HOURS || 24) * 3600e3,
  jobTimeoutMs: (+process.env.JOB_TIMEOUT_MINUTES || 45) * 60e3,
};

