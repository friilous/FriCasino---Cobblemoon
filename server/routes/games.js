const express = require('express')
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')
const slots    = require('../games/slots')
const plinko   = require('../games/plinko')
const roulette = require('../games/roulette')
const crash = require('../games/crash')
const blackjack = require('../games/blackjack')
const mines = require('../games/mines')

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


// ── Crash ────────────────────────────────────────────────────────────────────


router.post('/crash', authMiddleware, async (req, res) => {
  try {
    const bet      = parseInt(req.body.bet)
    const cashoutAt = req.body.cashoutAt ? parseFloat(req.body.cashoutAt) : null
 
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = userResult.rows[0]
 
    const err = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })
 
    const result     = crash.play(bet, cashoutAt)
    const newBalance = user.balance - bet + result.payout
 
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id])
    await query(
      `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'crash', $2, $3, $4)`,
      [user.id, bet, result.payout, JSON.stringify({ crashPoint: result.crashPoint, multiplier: result.multiplier })]
    )
 
    if (result.payout >= bet * 3) {
      await emitLiveFeed(req.user.username, 'crash', bet, result.payout, result.multiplier)
    }
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance })
 
    res.json({ ...result, balance: newBalance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── Blackjack ─────────────────────────────────────────────────────────────────────


const blackjackSessions = {}
 
router.post('/blackjack', authMiddleware, async (req, res) => {
  try {
    const { action, bet: betRaw } = req.body
    const userId = req.user.id
 
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [userId])
    const user = userResult.rows[0]
 
    // ── Nouvelle partie ──────────────────────────────────────────────────────
    if (action === 'deal') {
      const bet = parseInt(betRaw)
      const err = validateBet(bet, user.balance)
      if (err) return res.status(400).json({ error: err })
 
      // Déduire la mise immédiatement
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [user.balance - bet, userId])
 
      const result = blackjack.play(bet, 'deal', null)
      blackjackSessions[userId] = { ...result, bet, userId }
 
      return res.json({
        ...result,
        bet,
        balance: user.balance - bet,
        deck: undefined, // ne pas envoyer le deck au client
      })
    }
 
    // ── Hit ou Stand ─────────────────────────────────────────────────────────
    if (action === 'hit' || action === 'stand') {
      const session = blackjackSessions[userId]
      if (!session) return res.status(400).json({ error: 'Aucune partie en cours' })
      if (session.done) return res.status(400).json({ error: 'Partie déjà terminée' })
 
      const result = blackjack.play(session.bet, action, session)
 
      if (result.done) {
        // Mettre à jour le solde avec le gain
        const newBalance = user.balance + result.payout
        await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
        await query(
          `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'blackjack', $2, $3, $4)`,
          [userId, session.bet, result.payout, JSON.stringify({ status: result.status, multiplier: result.multiplier })]
        )
        if (result.payout >= session.bet * 2.5) {
          await emitLiveFeed(req.user.username, 'blackjack', session.bet, result.payout, result.multiplier)
        }
        if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
        delete blackjackSessions[userId]
        return res.json({ ...result, bet: session.bet, balance: newBalance, deck: undefined })
      }
 
      // Partie toujours en cours — mettre à jour la session
      blackjackSessions[userId] = { ...session, ...result }
      return res.json({ ...result, bet: session.bet, balance: user.balance, deck: undefined })
    }
 
    return res.status(400).json({ error: 'Action invalide' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})


// ── Mines ─────────────────────────────────────────────────────────────────────



const minesSessions = {}
 
router.post('/mines', authMiddleware, async (req, res) => {
  try {
    const { action, bet: betRaw, minesCount: minesRaw, cellIndex } = req.body
    const userId = req.user.id
 
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [userId])
    const user = userResult.rows[0]
 
    // ── Nouvelle partie ────────────────────────────────────────────────────────
    if (action === 'start') {
      const bet        = parseInt(betRaw)
      const minesCount = Math.min(Math.max(parseInt(minesRaw) || 3, 1), 24)
      const err        = validateBet(bet, user.balance)
      if (err) return res.status(400).json({ error: err })
 
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [user.balance - bet, userId])
 
      const result = require('../games/mines').play(bet, minesCount, [], 'start', null)
      minesSessions[userId] = {
        bet,
        minesCount,
        mines:    result.mines,
        revealed: [],
        status:   'playing',
      }
 
      return res.json({
        status:     'playing',
        multiplier: 1.00,
        payout:     0,
        balance:    user.balance - bet,
      })
    }
 
    // ── Révéler une case ───────────────────────────────────────────────────────
    if (action === 'reveal') {
      const session = minesSessions[userId]
      if (!session || session.status !== 'playing')
        return res.status(400).json({ error: 'Aucune partie en cours' })
 
      const cell = parseInt(cellIndex)
      if (session.revealed.includes(cell))
        return res.status(400).json({ error: 'Case déjà révélée' })
 
      session.revealed.push(cell)
      const result = require('../games/mines').play(
        session.bet, session.minesCount, session.revealed, 'reveal', session.mines
      )
 
      if (result.status === 'exploded') {
        session.status = 'exploded'
        await query(
          `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'mines', $2, 0, $3)`,
          [userId, session.bet, JSON.stringify({ minesCount: session.minesCount, revealed: session.revealed.length, status: 'exploded' })]
        )
        delete minesSessions[userId]
        return res.json({
          status:     'exploded',
          mines:      result.mines,
          multiplier: 0,
          payout:     0,
          balance:    user.balance,
        })
      }
 
      if (result.status === 'won') {
        const newBalance = user.balance + result.payout
        await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
        await query(
          `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'mines', $2, $3, $4)`,
          [userId, session.bet, result.payout, JSON.stringify({ minesCount: session.minesCount, revealed: session.revealed.length, status: 'won' })]
        )
        if (result.payout >= session.bet * 5)
          await emitLiveFeed(req.user.username, 'mines', session.bet, result.payout, result.multiplier)
        if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
        delete minesSessions[userId]
        return res.json({ ...result, mines: result.mines, balance: newBalance })
      }
 
      session.status = 'playing'
      return res.json({
        status:     'playing',
        multiplier: result.multiplier,
        payout:     result.payout,
        balance:    user.balance,
      })
    }
 
    // ── Encaisser ──────────────────────────────────────────────────────────────
    if (action === 'cashout') {
      const session = minesSessions[userId]
      if (!session || session.status !== 'playing' || session.revealed.length === 0)
        return res.status(400).json({ error: 'Impossible d\'encaisser' })
 
      const result     = require('../games/mines').play(
        session.bet, session.minesCount, session.revealed, 'cashout', session.mines
      )
      const newBalance = user.balance + result.payout
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
      await query(
        `INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1, 'mines', $2, $3, $4)`,
        [userId, session.bet, result.payout, JSON.stringify({ minesCount: session.minesCount, revealed: session.revealed.length, status: 'cashed' })]
      )
      if (result.payout >= session.bet * 3)
        await emitLiveFeed(req.user.username, 'mines', session.bet, result.payout, result.multiplier)
      if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
      delete minesSessions[userId]
      return res.json({ ...result, balance: newBalance })
    }
 
    return res.status(400).json({ error: 'Action invalide' })
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
