const express = require('express')
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')
const slots    = require('../games/slots')
const plinko   = require('../games/plinko')
const roulette = require('../games/roulette')

const router = express.Router()
const MIN_BET = 10
const MAX_BET = 10000

function validateBet(bet, balance) {
  if (!bet || isNaN(bet) || bet < MIN_BET) return `Mise minimum : ${MIN_BET} jetons`
  if (bet > MAX_BET) return `Mise maximum : ${MAX_BET} jetons`
  if (bet > balance) return 'Solde insuffisant'
  return null
}

async function emitLiveFeed(username, game, bet, payout, multiplier) {
  await query(
    `INSERT INTO live_feed (username, game, bet, payout, multiplier) VALUES ($1, $2, $3, $4, $5)`,
    [username, game, bet, payout, multiplier]
  )
  if (global.io) {
    global.io.emit('live_feed', { username, game, bet, payout, multiplier, timestamp: new Date().toISOString() })
  }
}

// ── Slots ─────────────────────────────────────────────────────────────────────
router.post('/slots', authMiddleware, async (req, res) => {
  try {
    const bet  = parseInt(req.body.bet)
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = userResult.rows[0]

    const err = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })

    const result     = slots.play(bet)
    const newBalance = user.balance - bet + result.payout

    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id])
    await query(
      `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'slots', $2, $3, $4)`,
      [user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, winType: result.winType })]
    )

    if (result.payout >= bet * 2) await emitLiveFeed(req.user.username, 'slots', bet, result.payout, result.multiplier)
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance })

    res.json({ ...result, balance: newBalance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── Plinko ────────────────────────────────────────────────────────────────────
router.post('/plinko', authMiddleware, async (req, res) => {
  try {
    const bet  = parseInt(req.body.bet)
    const risk = req.body.risk || 'medium'
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = userResult.rows[0]

    const err = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })

    const result     = plinko.play(bet, risk)
    const newBalance = user.balance - bet + result.payout

    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id])
    await query(
      `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'plinko', $2, $3, $4)`,
      [user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, bucket: result.bucket, risk })]
    )

    if (result.payout >= bet * 3) await emitLiveFeed(req.user.username, 'plinko', bet, result.payout, result.multiplier)
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance })

    res.json({ ...result, balance: newBalance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── Roulette ──────────────────────────────────────────────────────────────────
router.post('/roulette', authMiddleware, async (req, res) => {
  try {
    const bet  = parseInt(req.body.bet)
    const { betType, betValue } = req.body
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = userResult.rows[0]

    const err = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })
    if (!betType || !betValue) return res.status(400).json({ error: 'Pari invalide' })

    const result  = roulette.play(betType, betValue)
    result.payout = result.isWin ? Math.floor(bet * result.multiplier) : 0
    const finalBalance = user.balance - bet + result.payout

    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [finalBalance, user.id])
    await query(
      `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'roulette', $2, $3, $4)`,
      [user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, winning: result.winning, betType, betValue })]
    )

    if (result.payout >= bet * 5) await emitLiveFeed(req.user.username, 'roulette', bet, result.payout, result.multiplier)
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: finalBalance })

    res.json({ ...result, balance: finalBalance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── Live feed ─────────────────────────────────────────────────────────────────
router.get('/live-feed', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM live_feed ORDER BY created_at DESC LIMIT 30`)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/info', (req, res) => {
  res.json({
    slots:    { name: 'Slot Machine',      rtp: 94,   minBet: MIN_BET, maxBet: MAX_BET },
    plinko:   { name: 'Plinko',            rtp: 95,   minBet: MIN_BET, maxBet: MAX_BET },
    roulette: { name: 'Roulette Pokémon',  rtp: 93.8, minBet: MIN_BET, maxBet: MAX_BET },
  })
})

module.exports = router
