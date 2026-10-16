const db = require('../database'); const config = require('../config'); const log = require('../utils/log');
const providers = require('../providers'); const { AppError } = require('../utils/errors');
const { selectVideos } = require('../services/videoService'); const { createStream } = require('../services/streamService');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pipeline(job, pollMs) {
  const p = providers.get(); const set = (status, progress) => db.update(job.id, { status, progress });
  const deadline = Date.now() + config.jobTimeoutMs;
  set('validating', 2); set('submitting', 5);
  const { taskId, state } = await p.addMagnet(job.magnet);
  db.update(job.id, { provider_state: JSON.stringify(state) });
  set('processing', 10);
  let folder;
  for (;;) {
    if (Date.now() > deadline) throw new AppError('TIMEOUT', 'Processing took too long.');
    const s = await p.getStatus(taskId, state);
    if (s.done) { folder = s.taskId || taskId; break; }
    set(s.progress > 0 ? 'downloading' : 'processing', 10 + Math.round(s.progress * 0.7));
    await sleep(pollMs);
  }
  set('scanning', 85);
  const files = await p.listFiles(folder, state);
  set('finding_video', 90);
  const sel = selectVideos(files);
  if (!sel.videos.length) throw new AppError('NO_VIDEO_FOUND', 'No playable video file was found.');
  set('creating_stream', 95);
  const t = sel.primary || sel.videos[0];
  const stream = await createStream(t);
  const slim = v => ({ id: v.id, name: v.name, size: v.size, type: v.type, season: v.season, episode: v.episode, resolution: v.resolution });
  const result = {
    title: t.name.split('/').pop().replace(/\.[^.]+$/, '').replace(/[._]/g, ' '),
    file: slim(t), stream,
    files: sel.videos.length > 1 ? sel.videos.map(slim) : undefined,
    needs_selection: sel.isSeries,
  };
  db.update(job.id, { status: 'ready', progress: 100, result: JSON.stringify(result) });
}
async function runOne(job, pollMs = 4000) {
  try { await pipeline(job, pollMs); }
  catch (e) {
    const err = e instanceof AppError ? e : new AppError('PROCESSING_FAILED', 'Processing failed.');
    log.error('job', job.id, e);
    db.update(job.id, { status: 'error', error_code: err.code, error_message: err.message });
  }
}
function start() {
  db.requeueStuck(); let busy = 0;
  setInterval(() => { try { db.expireOld(config.jobTtlMs); } catch (e) { log.error(e); } }, 600e3);
  setInterval(() => {
    if (busy >= 3) return; const j = db.nextQueued(); if (!j) return;
    busy++; db.update(j.id, { status: 'validating' }); runOne(j).finally(() => busy--);
  }, 1000);
}
module.exports = { start, runOne };

