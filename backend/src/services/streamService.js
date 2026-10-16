const providers = require('../providers');
const { AppError } = require('../utils/errors');
const { streamType } = require('./videoService');
async function createStream(file) {
  const { url } = await providers.get().getStreamUrl(file.id);
  if (!/^https:\/\//i.test(url)) throw new AppError('STREAM_UNAVAILABLE', 'Provider returned a non-HTTPS stream.');
  return { url, type: streamType(url, file.name) };
}
module.exports = { createStream };

