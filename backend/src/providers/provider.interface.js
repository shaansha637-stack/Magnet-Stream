/** Contract every storage provider implements. `state` is an opaque, JSON-serializable object persisted per job. */
class StorageProvider {
  /** @returns {Promise<{taskId:string, state:object}>} */
  async addMagnet(magnet) { throw new Error('not implemented'); }
  /** @returns {Promise<{done:boolean, progress:number, taskId?:string}>} progress 0-100 */
  async getStatus(taskId, state) { throw new Error('not implemented'); }
  /** @returns {Promise<Array<{id:string,name:string,size:number}>>} flat file list */
  async listFiles(taskId, state) { throw new Error('not implemented'); }
  /** @returns {Promise<{url:string}>} */
  async getStreamUrl(fileId) { throw new Error('not implemented'); }
}
module.exports = StorageProvider;

