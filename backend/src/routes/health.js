const r = require('express').Router(); r.get('/', (_q, res) => res.json({ success: true, status: 'ok' })); module.exports = r;

