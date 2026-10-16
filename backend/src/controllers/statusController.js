const db = require('../database'); const magnetService = require('../services/magnetService');
const { AppError } = require('../utils/errors');
exports.get = (req, res) => {
  const job = db.getJob(req.params.jobId);
  if (!job) throw new AppError('NOT_FOUND', 'Job not found.');
  res.json(magnetService.view(job));
};

