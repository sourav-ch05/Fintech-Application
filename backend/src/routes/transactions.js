const express = require('express');
const mongo = require('../mongo');
const TransactionModel = mongo.models.Transaction;
const router = express.Router();

router.get('/', async (req, res) => {
  const { status, q, userId } = req.query;
  let filter = {};
  if (userId) {
    filter.$or = [{ from: userId }, { to: userId }];
  }
  if (status) filter.status = status;
  if (q) {
    const search = [{ id: new RegExp(q, 'i') }, { from: new RegExp(q, 'i') }, { to: new RegExp(q, 'i') }];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: search }];
      delete filter.$or;
    } else {
      filter.$or = search;
    }
  }
  if (!userId) {
    return res.json({ ok: true, transactions: [] });
  }
  const list = await TransactionModel.find(filter).sort({ date: -1 }).lean();
  return res.json({ ok: true, transactions: list });
});

router.get('/:id', async (req, res) => {
  const t = await TransactionModel.findOne({ id: req.params.id }).lean();
  if (!t) return res.status(404).json({ error: 'Not found' });
  return res.json({ ok: true, transaction: t });
});

module.exports = router;
