const config = require('../config');
const registry = { seedr: () => new (require('./seedr'))() };
let instance;
module.exports = {
  get() {
    if (!instance) { const f = registry[config.provider]; if (!f) throw new Error('Unknown provider ' + config.provider); instance = f(); }
    return instance;
  },
  set: p => { instance = p; }, // used by tests
};

