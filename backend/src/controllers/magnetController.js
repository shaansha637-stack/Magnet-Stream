const magnetService = require('../services/magnetService');
exports.create = (req, res) => {
  const id = magnetService.submit(req.body && req.body.magnet);
  res.status(202).json({ success: true, job_id: id, status: 'queued' });
};

