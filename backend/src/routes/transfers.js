const express = require('express');
const mongoose = require('mongoose');
const mongo = require('../mongo');
const { normalizeIndianPhone } = require('../validators');
const TransactionModel = mongo.models.Transaction;
const WalletModel = mongo.models.Wallet;
const UserModel = mongo.models.User;
const router = express.Router();

async function resolveWalletUserId(identifier) {
  const value = String(identifier || '').trim();
  if (!value) return null;

  const directWallet = await WalletModel.findOne({ userId: value }).lean();
  if (directWallet) return directWallet.userId;

  const userConditions = [{ id: value }, { email: value }];
  if (mongoose.Types.ObjectId.isValid(value)) {
    userConditions.push({ _id: value });
  }
  const normalizedPhone = normalizeIndianPhone(value);
  if (normalizedPhone) {
    userConditions.push({ phone: { $in: [normalizedPhone, `+91${normalizedPhone}`] } });
  }

  const user = await UserModel.findOne({ $or: userConditions }).lean();
  if (!user) return null;
  return String(user._id);
}

// Wallet to wallet
router.post('/wallet', async (req, res) => {
  const { from, to, amount } = req.body;
  const transferAmount = Number(amount);
  if (!from || !to || !Number.isFinite(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'from, to and valid amount are required' });
  }
  const txnObj = { id: `tx_${Date.now()}`, from, to, amount: transferAmount, status: 'success', date: Date.now() };
  const senderUserId = await resolveWalletUserId(from);
  if (!senderUserId) return res.status(404).json({ error: 'Sender wallet not found' });

  const wallet = await WalletModel.findOne({ userId: senderUserId });
  if (!wallet) return res.status(404).json({ error: 'Sender wallet not found' });
  if (wallet.balance < transferAmount) return res.status(400).json({ error: 'Insufficient balance' });

  wallet.balance -= transferAmount;
  wallet.updatedAt = Date.now();
  await wallet.save();

  const txn = await TransactionModel.create({ id: txnObj.id, from: senderUserId, to, amount: transferAmount, status: 'success' });
  
  return res.json({ ok: true, txn });
});

// Bank transfer (simulate pending)
router.post('/bank', async (req, res) => {
  const { from, account, ifsc, amount } = req.body;
  const transferAmount = Number(amount);
  if (!from || !account || !ifsc || !Number.isFinite(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'from, account, ifsc and valid amount are required' });
  }
  const txnObj = { id: `tx_${Date.now()}`, from, to: account, amount: transferAmount, status: 'pending', method: 'bank', date: Date.now() };
  const senderUserId = await resolveWalletUserId(from);
  if (!senderUserId) return res.status(404).json({ error: 'Sender wallet not found' });

  const wallet = await WalletModel.findOne({ userId: senderUserId });
  if (!wallet) return res.status(404).json({ error: 'Sender wallet not found' });
  if (wallet.balance < transferAmount) return res.status(400).json({ error: 'Insufficient balance' });

  wallet.balance -= transferAmount;
  wallet.updatedAt = Date.now();
  await wallet.save();

  const txn = await TransactionModel.create({ id: txnObj.id, from: senderUserId, to: account, amount: transferAmount, status: 'pending', method: 'bank' });
  
  return res.json({ ok: true, txn });
});

// History
router.get('/history', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.json({ ok: true, transactions: [] });
  }
  const txns = await TransactionModel.find({ $or: [{ from: userId }, { to: userId }] })
    .sort({ date: -1 })
    .lean();
  return res.json({ ok: true, transactions: txns });
});

module.exports = router;
