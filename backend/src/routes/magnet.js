const r = require('express').Router(); r.post('/', require('../controllers/magnetController').create); module.exports = r;

