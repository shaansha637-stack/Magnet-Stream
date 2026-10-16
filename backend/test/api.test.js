process.env.API_SECRET = 'test-secret-test-secret';
const test = require('node:test'); const assert = require('node:assert');
const db = require('../src/database'); db.init(':memory:');
const { createApp } = require('../src/app'); const { parseMagnet } = require('../src/utils/magnet');
const { selectVideos, streamType } = require('../src/services/videoService');
const providers = require('../src/providers'); const { runOne } = require('../src/workers/magnetWorker');
const { AppError } = require('../src/utils/errors');
const HASH = 'a'.repeat(40); const MAGNET = `magnet:?xt=urn:btih:${HASH}&dn=x`;
let server, base;
test.before(async () => { server = createApp().listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
const call = (path, opt = {}, key = 'test-secret-test-secret') => fetch(base + path, { ...opt, headers: { 'content-type': 'application/json', ...(key ? { 'x-api-key': key } : {}) } });

test('magnet validation', () => {
  assert.equal(parseMagnet(MAGNET).hash, HASH);
  assert.throws(() => parseMagnet('http://x'), e => e.code === 'INVALID_MAGNET');
  assert.throws(() => parseMagnet('magnet:?xt=urn:btih:zzz'), e => e.code === 'INVALID_MAGNET');
});
test('auth required', async () => {
  assert.equal((await call('/api/status/x', {}, null)).status, 401);
  assert.equal((await call('/api/health', {}, null)).status, 200);
});
test('job creation + polling + errors', async () => {
  const r = await call('/api/magnet', { method: 'POST', body: JSON.stringify({ magnet: MAGNET }) });
  const j = await r.json(); assert.equal(r.status, 202); assert.equal(j.status, 'queued');
  const s = await (await call('/api/status/' + j.job_id)).json(); assert.equal(s.status, 'queued');
  const bad = await call('/api/magnet', { method: 'POST', body: JSON.stringify({ magnet: 'nope' }) });
  assert.equal((await bad.json()).error.code, 'INVALID_MAGNET');
  assert.equal((await call('/api/status/missing')).status, 404);
});
test('video detection', () => {
  const r = selectVideos([{ id: '1', name: 'a/Movie.2020.1080p.mkv', size: 5 }, { id: '2', name: 'a/Movie.nfo', size: 1 },
    { id: '3', name: 'a/Sample.mp4', size: 99 }, { id: '4', name: 'a/Movie.2020.1080p.mp4', size: 4 }]);
  assert.equal(r.primary.id, '4'); assert.equal(r.videos.length, 3);
  const tv = selectVideos([{ id: '1', name: 'Show.S01E02.mp4', size: 1 }, { id: '2', name: 'Show.S01E01.mp4', size: 1 }]);
  assert.equal(tv.isSeries, true); assert.equal(tv.videos[0].episode, 1);
  assert.equal(streamType('https://x/y/index.m3u8?a=1'), 'hls'); assert.equal(streamType('https://x/a.mp4'), 'mp4');
});
test('worker happy path and failure', async () => {
  let polls = 0;
  providers.set({ addMagnet: async () => ({ taskId: 't', state: {} }), getStatus: async () => (++polls < 2 ? { done: false, progress: 50 } : { done: true, progress: 100, taskId: 'f' }),
    listFiles: async () => [{ id: '9', name: 'Cool.Movie.1080p.mp4', size: 100 }], getStreamUrl: async () => ({ url: 'https://cdn.example/v.mp4' }) });
  const id = db.createJob(MAGNET, HASH); await runOne(db.getJob(id), 1);
  const s = await (await call('/api/status/' + id)).json();
  assert.equal(s.status, 'ready'); assert.equal(s.stream.type, 'mp4'); assert.equal(s.title, 'Cool Movie 1080p');
  providers.set({ addMagnet: async () => { throw new AppError('MAGNET_REJECTED', 'no'); } });
  const id2 = db.createJob(MAGNET, HASH); await runOne(db.getJob(id2), 1);
  const e = await (await call('/api/status/' + id2)).json(); assert.equal(e.error.code, 'MAGNET_REJECTED');
});

