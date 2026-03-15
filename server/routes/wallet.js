const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/wallet/balance
router.get('/balance', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  res.json({ balance: user.balance });
});

// GET /api/wallet/history
router.get('/history', authMiddleware, (req, res) => {
  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  const withdrawals = db.prepare(`
    SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.user.id);
  const games = db.prepare(`
    SELECT * FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
  `).all(req.user.id);
  res.json({ transactions, withdrawals, games });
});

// POST /api/wallet/withdraw
router.post('/withdraw', authMiddleware, (req, res) => {
  const { amount } = req.body;
  const parsedAmount = parseInt(amount);
  if (!parsedAmount || parsedAmount <= 0) return res.status(400).json({ error: 'Montant invalide' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.balance < parsedAmount) return res.status(400).json({ error: 'Solde insuffisant' });
  if (parsedAmount < 100) return res.status(400).json({ error: 'Retrait minimum : 100 jetons' });

  // Vérifier pas de retrait pending déjà en cours
  const pending = db.prepare("SELECT id FROM withdrawals WHERE user_id = ? AND status = 'pending'").get(req.user.id);
  if (pending) return res.status(400).json({ error: 'Tu as déjà une demande de retrait en attente' });

  // Déduire immédiatement du solde (bloqué en attendant)
  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(parsedAmount, req.user.id);
  const info = db.prepare("INSERT INTO withdrawals (user_id, amount) VALUES (?, ?)").run(req.user.id, parsedAmount);

  // Émettre event socket (géré dans index.js via io global)
  if (global.io) {
    global.io.to('admin').emit('new_withdrawal', {
      id: info.lastInsertRowid,
      username: req.user.username,
      amount: parsedAmount,
    });
  }

  res.status(201).json({ message: 'Demande de retrait envoyée ! L\'admin va traiter ça dès que possible.', id: info.lastInsertRowid });
});

module.exports = router;
