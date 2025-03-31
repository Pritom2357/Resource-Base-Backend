import express from 'express';
import pkg from '../../package.json' assert {type:'json'};

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/version', (req, res) => {
  res.status(200).json({ version: pkg.version });
});

export default router;