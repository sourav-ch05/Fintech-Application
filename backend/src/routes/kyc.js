const express = require('express');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads') });
const mongo = require('../mongo');
const KYCModel = mongo.models.KYC;
const router = express.Router();

router.post('/upload', upload.fields([{ name: 'aadhaar_doc' }, { name: 'pan_doc' }, { name: 'other_id' }]), async (req, res) => {
  const { aadhaar, pan, userId } = req.body;
  const files = req.files || {};
  const rec = await KYCModel.create({ userId, aadhaar, pan, files, status: 'pending' });
  return res.json({ ok: true, record: rec });
});

router.get('/:userId/status', async (req, res) => {
  const rec = await KYCModel.findOne({ userId: req.params.userId }).lean();
  if (!rec) return res.json({ status: 'not_submitted' });
  return res.json({ status: rec.status, record: rec });
});

module.exports = router;
