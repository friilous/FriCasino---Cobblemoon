const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const slots = require('../games/slots');
const plinko = require('../games/plinko');
const roulette = require('../games/roulette');

const router = express.Router();

const MIN_BET = 10;
const MAX_BET = 10000;

function validateBet(bet, balance) {
  if (!bet || isNaN(bet) || bet < MIN_BET) return `Mise minimum : ${MIN_BET} jetons`;
  if (bet > MAX_BET) return `Mise maximum : ${MAX_BET} jetons`;
  if (bet > balance) return 'Solde insuffisant';
  return null;
}

function emitLiveFeed(username, game, bet, payout, multiplier) {
  // Enregistrer dans la BDD
  db.prepare(`INSERT INTO live_feed (username, game, bet, payout, multiplier) VALUES (?, ?, ?, ?, ?)`).run(
    username, game, bet, payout, multiplier
  );
  // Émettre à tous les clients connectés
  if (global.io) {
    global.io.emit('live_feed', {
      username,
      game,
      bet,
      payout,
      multiplier,
      timestamp: new Date().toISOString(),
    });
  }
}

// ── Slots ─────────────────────────────────────────────────────────────────────
router.post('/slots', authMiddleware, (req, res) => {
  const bet = parseInt(req.body.bet);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const err = validateBet(bet, user.balance);
  if (err) return res.status(400).json({ error: err });

  const result = slots.play(bet);
  const newBalance = user.balance - bet + result.payout;

  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, user.id);
  db.prepare(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES (?, 'slots', ?, ?, ?)`).run(
    user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, winType: result.winType })
  );

  // Live feed uniquement pour les gains significatifs
  if (result.payout >= bet * 2) {
    emitLiveFeed(req.user.username, 'slots', bet, result.payout, result.multiplier);
  }

  // Emit balance update to user
  if (global.io) {
    global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance });
  }

  res.json({ ...result, balance: newBalance });
});

// ── Plinko ────────────────────────────────────────────────────────────────────
router.post('/plinko', authMiddleware, (req, res) => {
  const bet = parseInt(req.body.bet);
  const risk = req.body.risk || 'medium';
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const err = validateBet(bet, user.balance);
  if (err) return res.status(400).json({ error: err });

  const result = plinko.play(bet, risk);
  const newBalance = user.balance - bet + result.payout;

  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, user.id);
  db.prepare(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES (?, 'plinko', ?, ?, ?)`).run(
    user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, bucket: result.bucket, risk })
  );

  if (result.payout >= bet * 3) {
    emitLiveFeed(req.user.username, 'plinko', bet, result.payout, result.multiplier);
  }

  if (global.io) {
    global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance });
  }

  res.json({ ...result, balance: newBalance });
});

// ── Roulette ──────────────────────────────────────────────────────────────────
router.post('/roulette', authMiddleware, (req, res) => {
  const bet = parseInt(req.body.bet)
  const { betType, betValue } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)

  const err = validateBet(bet, user.balance)
  if (err) return res.status(400).json({ error: err })
  if (!betType || !betValue) return res.status(400).json({ error: 'Pari invalide' })

  const result = roulette.play(betType, betValue)
  result.payout = result.isWin ? Math.floor(bet * result.multiplier) : 0
  const finalBalance = user.balance - bet + result.payout

  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(finalBalance, user.id)
  db.prepare(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES (?, 'roulette', ?, ?, ?)`)
    .run(user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, winning: result.winning, betType, betValue }))

  if (result.payout >= bet * 5) emitLiveFeed(req.user.username, 'roulette', bet, result.payout, result.multiplier)
  if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: finalBalance })

  res.json({ ...result, balance: finalBalance })
})

// GET /api/games/live-feed — derniers événements
router.get('/live-feed', (req, res) => {
  const feed = db.prepare(`SELECT * FROM live_feed ORDER BY created_at DESC LIMIT 30`).all();
  res.json(feed);
});

// GET /api/games/info — infos des jeux (RTP, etc.)
router.get('/info', (req, res) => {
  res.json({
    slots: { name: 'Slot Machine', rtp: 94, minBet: MIN_BET, maxBet: MAX_BET },
    plinko: { name: 'Plinko', rtp: 95, minBet: MIN_BET, maxBet: MAX_BET },
    roulette: { name: 'Roulette Pokémon', rtp: 94.6, minBet: MIN_BET, maxBet: MAX_BET },
  });
});

module.exports = router;
