const VIDEO = new Set(['mp4','mkv','webm','mov','m4v','avi','ts']);
const ext = n => (n.split('.').pop() || '').toLowerCase();
const isVideo = n => VIDEO.has(ext(n));
const MIME = { mp4:'video/mp4', m4v:'video/x-m4v', mov:'video/quicktime', mkv:'video/x-matroska', webm:'video/webm', avi:'video/x-msvideo', ts:'video/mp2t' };
function parse(name) {
  const base = name.split('/').pop();
  const ep = base.match(/S(\d{1,2})[ ._-]?E(\d{1,3})/i) || base.match(/\b(\d{1,2})x(\d{2,3})\b/i);
  const res = base.match(/\b(2160|1440|1080|720|576|480)p\b/i);
  return { season: ep ? +ep[1] : null, episode: ep ? +ep[2] : null, resolution: res ? +res[1] : (/\b4k\b/i.test(base) ? 2160 : null) };
}
/** Deterministic ranking: samples last; iOS-native containers preferred; then larger size; then name. */
function score(f) {
  const n = f.name.toLowerCase(); let s = 0;
  if (/(^|[^a-z])(sample|trailer|featurette)([^a-z]|$)/.test(n)) s -= 1e12;
  if (ext(n) === 'mp4' || ext(n) === 'm4v') s += 5e9;
  if (ext(n) === 'mov') s += 4e9;
  if (ext(n) === 'ts') s -= 1e9;
  return s + f.size;
}
function selectVideos(files) {
  const vids = files.filter(f => isVideo(f.name)).map(f => ({ ...f, ...parse(f.name), type: MIME[ext(f.name)] }));
  const isSeries = vids.filter(v => v.episode !== null).length >= 2;
  vids.sort((a, b) => isSeries ? (((a.season ?? 0) - (b.season ?? 0)) || ((a.episode ?? 0) - (b.episode ?? 0)) || a.name.localeCompare(b.name))
    : ((score(b) - score(a)) || a.name.localeCompare(b.name)));
  return { videos: vids, isSeries, primary: isSeries ? null : vids[0] || null };
}
function streamType(url, name) {
  let p; try { p = new URL(url).pathname.toLowerCase(); } catch { p = url.toLowerCase(); }
  if (p.endsWith('.m3u8')) return 'hls';
  const e = ext(p) || ext(name || '');
  return VIDEO.has(e) ? e : 'mp4';
}
module.exports = { isVideo, selectVideos, parse, streamType };

