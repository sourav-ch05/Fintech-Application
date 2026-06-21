const express = require('express');
const mongo = require('../mongo');

const WalletModel = mongo.models.Wallet;
const router = express.Router();

router.get('/balance', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    let wallet = await WalletModel.findOne({ userId }).lean();
    if (!wallet) {
      wallet = await WalletModel.create({ userId, balance: 50000, currency: 'INR' });
    }

    return res.json({ ok: true, balance: wallet.balance, currency: wallet.currency || 'INR' });
  } catch (err) {
    console.error('Error fetching wallet balance:', err);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

router.post('/deduct', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }

    const deductAmount = parseFloat(amount);
    if (deductAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    if (wallet.balance < deductAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    wallet.balance -= deductAmount;
    await wallet.save();
    return res.json({ ok: true, balance: wallet.balance });
  } catch (err) {
    console.error('Error deducting from wallet:', err);
    return res.status(500).json({ error: 'Failed to deduct from wallet' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }

    const addAmount = parseFloat(amount);
    if (addAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      wallet = new WalletModel({ userId, balance: addAmount, currency: 'INR' });
    } else {
      wallet.balance += addAmount;
    }

    await wallet.save();
    return res.json({ ok: true, balance: wallet.balance });
  } catch (err) {
    console.error('Error adding to wallet:', err);
    return res.status(500).json({ error: 'Failed to add to wallet' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = await WalletModel.findOne({ userId }).lean();

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    return res.json({ ok: true, wallet });
  } catch (err) {
    console.error('Error fetching wallet:', err);
    return res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

module.exports = router;
