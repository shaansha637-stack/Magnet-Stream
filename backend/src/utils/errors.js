const STATUS = { INVALID_MAGNET:400, UNAUTHORIZED:401, RATE_LIMITED:429, PROVIDER_AUTH_ERROR:502, PROVIDER_LIMIT:507,
  MAGNET_REJECTED:422, PROCESSING_FAILED:500, NO_VIDEO_FOUND:404, STREAM_UNAVAILABLE:502, TIMEOUT:504, NETWORK_ERROR:502,
  SERVER_ERROR:500, NOT_FOUND:404 };
class AppError extends Error {
  constructor(code, message) { super(message); this.code = code; this.status = STATUS[code] || 500; }
}
const errorBody = (code, message) => ({ success: false, error: { code, message } });
module.exports = { AppError, errorBody };

