const SENSITIVE = () => [process.env.PROVIDER_ACCESS_TOKEN, process.env.PROVIDER_CLIENT_SECRET, process.env.API_SECRET].filter(Boolean);
const scrub = s => SENSITIVE().reduce((a, v) => a.split(v).join('[redacted]'), String(s));
module.exports = {
  info: (...a) => console.log(new Date().toISOString(), scrub(a.join(' '))),
  error: (...a) => console.error(new Date().toISOString(), scrub(a.map(x => (x && x.message) || x).join(' '))),
};

