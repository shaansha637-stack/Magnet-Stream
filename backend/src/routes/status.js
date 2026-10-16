const r = require('express').Router(); r.get('/:jobId', require('../controllers/statusController').get); module.exports = r;

