const StorageProvider = require('./provider.interface');
const { AppError } = require('../utils/errors');
// Uses Seedr's OAuth resource endpoint with YOUR account's access token.
// !! Verify function names/response shapes against the API docs for your account before production. !!
const ENDPOINT = process.env.PROVIDER_API_URL || 'https://www.seedr.cc/oauth_test/resource.php';

class SeedrProvider extends StorageProvider {
  async call(func, params = {}) {
    const token = process.env.PROVIDER_ACCESS_TOKEN;
    if (!token) throw new AppError('PROVIDER_AUTH_ERROR', 'Provider is not configured.');
    const body = new URLSearchParams({ access_token: token, func, ...params });
    let res;
    try { res = await fetch(ENDPOINT, { method: 'POST', body, signal: AbortSignal.timeout(20000) }); }
    catch { throw new AppError('NETWORK_ERROR', 'Could not reach the provider.'); }
    if (res.status === 401 || res.status === 403) throw new AppError('PROVIDER_AUTH_ERROR', 'Provider rejected credentials.');
    if (res.status === 429) throw new AppError('PROVIDER_LIMIT', 'Provider rate limit reached.');
    const data = await res.json().catch(() => ({}));
    if (data.error === 'expired_token' || data.error === 'invalid_token') throw new AppError('PROVIDER_AUTH_ERROR', 'Provider token expired.');
    if (data.result === false) {
      if (/space|storage|limit|quota/i.test(String(data.error || ''))) throw new AppError('PROVIDER_LIMIT', 'Provider storage limit reached.');
      throw new AppError('MAGNET_REJECTED', 'The provider rejected this request.');
    }
    return data;
  }
  async addMagnet(magnet) {
    const before = await this.call('get_folder', { folder_id: 0 });
    const data = await this.call('add_torrent', { torrent_magnet: magnet });
    const id = String(data.user_torrent_id);
    return { taskId: id, state: { torrentId: id, knownFolders: (before.folders || []).map(f => f.id) } };
  }
  async getStatus(taskId, state) {
    const root = await this.call('get_folder', { folder_id: 0 });
    const t = (root.torrents || []).find(x => String(x.id) === String(state.torrentId));
    if (t) return { done: false, progress: Math.min(99, Math.round(+t.progress || 0)) };
    const folder = (root.folders || []).find(f => !state.knownFolders.includes(f.id));
    if (!folder) throw new AppError('PROCESSING_FAILED', 'The transfer disappeared from the provider.');
    return { done: true, progress: 100, taskId: String(folder.id) };
  }
  async listFiles(folderId) {
    const out = [];
    const walk = async (id, depth) => {
      const d = await this.call('get_folder', { folder_id: id });
      for (const f of d.files || []) out.push({ id: String(f.folder_file_id), name: f.name, size: +f.size || 0 });
      if (depth < 4) for (const sub of d.folders || []) await walk(sub.id, depth + 1);
    };
    await walk(folderId, 0);
    return out;
  }
  async getStreamUrl(fileId) {
    const d = await this.call('fetch_file', { folder_file_id: fileId });
    if (!d.url) throw new AppError('STREAM_UNAVAILABLE', 'No stream URL available for this file.');
    return { url: d.url };
  }
}
module.exports = SeedrProvider;

