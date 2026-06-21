const express = require('express');
const mongo = require('../mongo');
const MerchantModel = mongo.models.Merchant;
const TransactionModel = mongo.models.Transaction;
const router = express.Router();

// Onboard merchant
router.post('/onboard', async (req, res) => {
  const { business_name, contact, phone } = req.body;
  const m = await MerchantModel.create({ business_name, contact, phone });
  return res.json({ ok: true, merchant: m });
});

// Generate QR (placeholder)
router.post('/generate-qr', (req, res) => {
  const { merchant_id, amount } = req.body;
  const payload = { merchant_id, amount, ts: Date.now() };
  res.json({ ok: true, qr: payload });
});

// Get merchant payments (simple filter)
router.get('/:id/payments', async (req, res) => {
  const id = req.params.id;
  const payments = await TransactionModel.find({ $or: [{ to: id }, { merchantId: id }] }).lean();
  return res.json({ ok: true, payments });
});

module.exports = router;
