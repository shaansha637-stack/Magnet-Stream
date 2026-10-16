const { AppError } = require('./errors');
// Accepts btih as 40 hex chars or 32 base32 chars.
function parseMagnet(input) {
  const bad = () => new AppError('INVALID_MAGNET', 'The supplied magnet link is invalid.');
  if (typeof input !== 'string' || input.length > 4096) throw bad();
  const magnet = input.trim();
  if (!magnet.toLowerCase().startsWith('magnet:?')) throw bad();
  const params = new URLSearchParams(magnet.slice(8));
  const xt = params.getAll('xt').find(v => v.toLowerCase().startsWith('urn:btih:'));
  const hash = xt && xt.slice(9);
  if (!hash || !(/^[a-f0-9]{40}$/i.test(hash) || /^[a-z2-7]{32}$/i.test(hash))) throw bad();
  return { magnet, hash: hash.toLowerCase(), name: params.get('dn') || null };
}
module.exports = { parseMagnet };

