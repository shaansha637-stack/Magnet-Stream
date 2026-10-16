const db = require('../database');
const { parseMagnet } = require('../utils/magnet');
function submit(input) { const { magnet, hash } = parseMagnet(input); return db.createJob(magnet, hash); }
function view(job) {
  if (job.status === 'error') return { success: false, job_id: job.id, status: 'error', error: { code: job.error_code, message: job.error_message } };
  const base = { success: true, job_id: job.id, status: job.status, progress: job.progress };
  return job.status === 'ready' && job.result ? { ...base, ...JSON.parse(job.result) } : base;
}
module.exports = { submit, view };

