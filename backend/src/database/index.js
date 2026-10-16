const Database = require('better-sqlite3');
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
let db;
function init(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY, magnet TEXT NOT NULL, hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
    progress INTEGER DEFAULT 0, provider_state TEXT, result TEXT, error_code TEXT, error_message TEXT,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  return db;
}
const now = () => Date.now();
function createJob(magnet, hash) {
  const id = crypto.randomBytes(8).toString('hex');
  db.prepare('INSERT INTO jobs (id,magnet,hash,created_at,updated_at) VALUES (?,?,?,?,?)').run(id, magnet, hash, now(), now());
  return id;
}
const getJob = id => db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
function update(id, fields) {
  const keys = Object.keys(fields);
  db.prepare(`UPDATE jobs SET ${keys.map(k => k + '=?').join(',')}, updated_at=? WHERE id=?`).run(...keys.map(k => fields[k]), now(), id);
}
const nextQueued = () => db.prepare("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").get();
const expireOld = ttl => db.prepare("UPDATE jobs SET status='expired', result=NULL, magnet='', updated_at=? WHERE created_at<? AND status!='expired'").run(now(), now() - ttl);
const requeueStuck = () => db.prepare("UPDATE jobs SET status='queued' WHERE status IN ('validating','submitting','processing','downloading','scanning','finding_video','creating_stream')").run();
module.exports = { init, createJob, getJob, update, nextQueued, expireOld, requeueStuck };

