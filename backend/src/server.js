const config = require('./config'); const db = require('./database'); const log = require('./utils/log');
if (!config.apiSecret || config.apiSecret.length < 16) { console.error('API_SECRET must be set (16+ chars).'); process.exit(1); }
db.init(config.dbPath);
require('./workers/magnetWorker').start();
require('./app').createApp().listen(config.port, () => log.info('API listening on', config.port));

