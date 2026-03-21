const express = require('express')
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')
const slots     = require('../games/slots')
const plinko    = require('../games/plinko')
const roulette  = require('../games/roulette')
const crash     = require('../games/crash')
const blackjack = require('../games/blackjack')
const mines     = require('../games/mines')

const router  = express.Router()
const MIN_BET = 10
const MAX_BET = 10000

function validateBet(bet, balance) {
  if (!bet || isNaN(bet) || bet < MIN_BET) return `Mise minimum : ${MIN_BET} jetons`
  if (bet > MAX_BET) return `Mise maximum : ${MAX_BET} jetons`
  if (bet > balance) return 'Solde insuffisant'
  return null
}

async function checkGameEnabled(game) {
  try {
    const result = await query(`SELECT enabled FROM game_settings WHERE game = $1`, [game])
    if (result.rows.length === 0) return true
    return result.rows[0].enabled === 1 || result.rows[0].enabled === true
  } catch { return true }
}

function generateBetId(game, dbId) {
  return `#${game.slice(0, 3).toUpperCase()}-${dbId.toString().padStart(6, '0')}`
}

async function contributeToSuperJackpot(bet) {
  try {
    const contrib = Math.floor(bet * 0.05)
    if (contrib <= 0) return
    await query(
      `UPDATE superjackpot SET amount = amount + $1, updated_at = to_char(now(),'YYYY-MM-DD HH24:MI:SS') WHERE id = 1`,
      [contrib]
    )
    const r = await query(`SELECT amount FROM superjackpot WHERE id = 1`)
    if (global.io) global.io.emit('superjackpot_update', { amount: r.rows[0]?.amount })
  } catch (err) { console.error('SuperJackpot contribution error:', err.message) }
}

async function emitLiveFeed(username, game, bet, payout, multiplier, betId) {
  await query(
    `INSERT INTO live_feed (username, game, bet, payout, multiplier) VALUES ($1, $2, $3, $4, $5)`,
    [username, game, bet, payout, multiplier]
  )
  if (global.io) global.io.emit('live_feed', { username, game, bet, payout, multiplier, bet_id: betId, timestamp: new Date().toISOString() })
}

const blackjackSessions = {}
const minesSessions     = {}

// ── Slots ─────────────────────────────────────────────────────────────────────
router.post('/slots', authMiddleware, async (req, res) => {
  try {
    const enabled = await checkGameEnabled('slots')
    if (!enabled) return res.status(403).json({ error: 'Les Slots sont temporairement désactivées.' })
    const bet = parseInt(req.body.bet)
    const ur  = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = ur.rows[0]
    const err = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })
    const result     = slots.play(bet)
    const newBalance = user.balance - bet + result.payout
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id])
    const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'slots',$2,$3,$4) RETURNING id`,
      [user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, winType: result.winType })])
    const betId = generateBetId('slots', hr.rows[0].id)
    await contributeToSuperJackpot(bet)
    if (result.payout >= bet * 2) await emitLiveFeed(req.user.username, 'slots', bet, result.payout, result.multiplier, betId)
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance })
    res.json({ ...result, balance: newBalance, bet_id: betId })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// ── Plinko ────────────────────────────────────────────────────────────────────
router.post('/plinko', authMiddleware, async (req, res) => {
  try {
    const enabled = await checkGameEnabled('plinko')
    if (!enabled) return res.status(403).json({ error: 'Plinko est temporairement désactivé.' })
    const bet  = parseInt(req.body.bet)
    const risk = req.body.risk || 'medium'
    const ur   = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = ur.rows[0]
    const err  = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })
    const result     = plinko.play(bet, risk)
    const newBalance = user.balance - bet + result.payout
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id])
    const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'plinko',$2,$3,$4) RETURNING id`,
      [user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, bucket: result.bucket, risk })])
    const betId = generateBetId('plinko', hr.rows[0].id)
    await contributeToSuperJackpot(bet)
    if (result.payout >= bet * 3) await emitLiveFeed(req.user.username, 'plinko', bet, result.payout, result.multiplier, betId)
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance })
    res.json({ ...result, balance: newBalance, bet_id: betId })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// ── Roulette ──────────────────────────────────────────────────────────────────
router.post('/roulette', authMiddleware, async (req, res) => {
  try {
    const enabled = await checkGameEnabled('roulette')
    if (!enabled) return res.status(403).json({ error: 'La Roulette est temporairement désactivée.' })
    const bet = parseInt(req.body.bet)
    const { betType, betValue } = req.body
    const ur   = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = ur.rows[0]
    const err  = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })
    if (!betType || !betValue) return res.status(400).json({ error: 'Pari invalide' })
    const result       = roulette.play(betType, betValue)
    result.payout      = result.isWin ? Math.floor(bet * result.multiplier) : 0
    const finalBalance = user.balance - bet + result.payout
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [finalBalance, user.id])
    const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'roulette',$2,$3,$4) RETURNING id`,
      [user.id, bet, result.payout, JSON.stringify({ multiplier: result.multiplier, winning: result.winning, betType, betValue })])
    const betId = generateBetId('roulette', hr.rows[0].id)
    await contributeToSuperJackpot(bet)
    if (result.payout >= bet * 5) await emitLiveFeed(req.user.username, 'roulette', bet, result.payout, result.multiplier, betId)
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: finalBalance })
    res.json({ ...result, balance: finalBalance, bet_id: betId })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// ── Crash ─────────────────────────────────────────────────────────────────────
router.post('/crash', authMiddleware, async (req, res) => {
  try {
    const enabled = await checkGameEnabled('crash')
    if (!enabled) return res.status(403).json({ error: 'Crash est temporairement désactivé.' })
    const bet       = parseInt(req.body.bet)
    const cashoutAt = req.body.cashoutAt ? parseFloat(req.body.cashoutAt) : null
    const ur        = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user      = ur.rows[0]
    const err       = validateBet(bet, user.balance)
    if (err) return res.status(400).json({ error: err })
    const result     = crash.play(bet, cashoutAt)
    const newBalance = user.balance - bet + result.payout
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id])
    const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'crash',$2,$3,$4) RETURNING id`,
      [user.id, bet, result.payout, JSON.stringify({ crashPoint: result.crashPoint, multiplier: result.multiplier })])
    const betId = generateBetId('crash', hr.rows[0].id)
    await contributeToSuperJackpot(bet)
    if (result.payout >= bet * 3) await emitLiveFeed(req.user.username, 'crash', bet, result.payout, result.multiplier, betId)
    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance })
    res.json({ ...result, balance: newBalance, bet_id: betId })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// ── Blackjack ─────────────────────────────────────────────────────────────────
router.post('/blackjack', authMiddleware, async (req, res) => {
  try {
    const { action, bet: betRaw } = req.body
    const userId = req.user.id
    const ur     = await query(`SELECT * FROM users WHERE id = $1`, [userId])
    const user   = ur.rows[0]

    if (action === 'deal') {
      const enabled = await checkGameEnabled('blackjack')
      if (!enabled) return res.status(403).json({ error: 'Le Blackjack est temporairement désactivé.' })
      const bet = parseInt(betRaw)
      const err = validateBet(bet, user.balance)
      if (err) return res.status(400).json({ error: err })
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [user.balance - bet, userId])
      await contributeToSuperJackpot(bet)
      const result = blackjack.play(bet, 'deal', null)
      blackjackSessions[userId] = { ...result, bet, userId }
      if (result.done) {
        const newBalance = user.balance - bet + result.payout
        await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
        const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'blackjack',$2,$3,$4) RETURNING id`,
          [userId, bet, result.payout, JSON.stringify({ status: result.status, multiplier: result.multiplier })])
        const betId = generateBetId('blackjack', hr.rows[0].id)
        if (result.payout >= bet * 2) await emitLiveFeed(req.user.username, 'blackjack', bet, result.payout, result.multiplier, betId)
        if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
        delete blackjackSessions[userId]
        return res.json({ ...result, bet, balance: newBalance, bet_id: betId, deck: undefined })
      }
      return res.json({ ...result, bet, balance: user.balance - bet, deck: undefined })
    }

    if (['hit', 'stand', 'double'].includes(action)) {
      const session = blackjackSessions[userId]
      if (!session)     return res.status(400).json({ error: 'Aucune partie en cours' })
      if (session.done) return res.status(400).json({ error: 'Partie déjà terminée' })
      if (action === 'double') {
        if (user.balance < session.bet) return res.status(400).json({ error: 'Solde insuffisant pour doubler' })
        await query(`UPDATE users SET balance = $1 WHERE id = $2`, [user.balance - session.bet, userId])
        await contributeToSuperJackpot(session.bet)
      }
      const result = blackjack.play(session.bet, action, session)
      if (result.done) {
        const extraBet   = action === 'double' ? session.bet : 0
        const newBalance = user.balance - extraBet + result.payout
        await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
        const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'blackjack',$2,$3,$4) RETURNING id`,
          [userId, session.bet + extraBet, result.payout,
           JSON.stringify({ status: result.status, multiplier: result.multiplier, doubled: result.doubled || false })])
        const betId = generateBetId('blackjack', hr.rows[0].id)
        if (result.payout >= session.bet * 2) await emitLiveFeed(req.user.username, 'blackjack', session.bet, result.payout, result.multiplier, betId)
        if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
        delete blackjackSessions[userId]
        return res.json({ ...result, bet: session.bet, balance: newBalance, bet_id: betId, deck: undefined })
      }
      blackjackSessions[userId] = { ...session, ...result }
      return res.json({ ...result, bet: session.bet, balance: user.balance, deck: undefined })
    }
    return res.status(400).json({ error: 'Action invalide' })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// ── Mines ─────────────────────────────────────────────────────────────────────
router.post('/mines', authMiddleware, async (req, res) => {
  try {
    const { action, bet: betRaw, minesCount: minesRaw, cellIndex } = req.body
    const userId = req.user.id
    const ur     = await query(`SELECT * FROM users WHERE id = $1`, [userId])
    const user   = ur.rows[0]

    if (action === 'start') {
      const enabled = await checkGameEnabled('mines')
      if (!enabled) return res.status(403).json({ error: 'Mines est temporairement désactivé.' })
      const bet        = parseInt(betRaw)
      const minesCount = Math.min(Math.max(parseInt(minesRaw) || 3, 1), 24)
      const err        = validateBet(bet, user.balance)
      if (err) return res.status(400).json({ error: err })
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [user.balance - bet, userId])
      await contributeToSuperJackpot(bet)
      const result = mines.play(bet, minesCount, [], 'start', null)
      minesSessions[userId] = { bet, minesCount, mines: result.mines, revealed: [], status: 'playing' }
      return res.json({ status: 'playing', multiplier: 1.00, payout: 0, balance: user.balance - bet })
    }

    if (action === 'reveal') {
      const session = minesSessions[userId]
      if (!session || session.status !== 'playing') return res.status(400).json({ error: 'Aucune partie en cours' })
      const cell = parseInt(cellIndex)
      if (session.revealed.includes(cell)) return res.status(400).json({ error: 'Case déjà révélée' })
      session.revealed.push(cell)
      const result = mines.play(session.bet, session.minesCount, session.revealed, 'reveal', session.mines)
      if (result.status === 'exploded') {
        session.status = 'exploded'
        await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'mines',$2,0,$3)`,
          [userId, session.bet, JSON.stringify({ minesCount: session.minesCount, revealed: session.revealed.length, status: 'exploded' })])
        delete minesSessions[userId]
        return res.json({ status: 'exploded', mines: result.mines, multiplier: 0, payout: 0, balance: user.balance })
      }
      if (result.status === 'won') {
        const newBalance = user.balance + result.payout
        await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
        const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'mines',$2,$3,$4) RETURNING id`,
          [userId, session.bet, result.payout, JSON.stringify({ minesCount: session.minesCount, revealed: session.revealed.length, status: 'won' })])
        const betId = generateBetId('mines', hr.rows[0].id)
        if (result.payout >= session.bet * 5) await emitLiveFeed(req.user.username, 'mines', session.bet, result.payout, result.multiplier, betId)
        if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
        delete minesSessions[userId]
        return res.json({ ...result, mines: result.mines, balance: newBalance, bet_id: betId })
      }
      session.status = 'playing'
      return res.json({ status: 'playing', multiplier: result.multiplier, payout: result.payout, balance: user.balance })
    }

    if (action === 'cashout') {
      const session = minesSessions[userId]
      if (!session || session.status !== 'playing' || session.revealed.length === 0)
        return res.status(400).json({ error: "Impossible d'encaisser" })
      const result     = mines.play(session.bet, session.minesCount, session.revealed, 'cashout', session.mines)
      const newBalance = user.balance + result.payout
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
      const hr = await query(`INSERT INTO game_history (user_id, game, bet, payout, meta) VALUES ($1,'mines',$2,$3,$4) RETURNING id`,
        [userId, session.bet, result.payout, JSON.stringify({ minesCount: session.minesCount, revealed: session.revealed.length, status: 'cashed' })])
      const betId = generateBetId('mines', hr.rows[0].id)
      if (result.payout >= session.bet * 3) await emitLiveFeed(req.user.username, 'mines', session.bet, result.payout, result.multiplier, betId)
      if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
      delete minesSessions[userId]
      return res.json({ ...result, balance: newBalance, bet_id: betId })
    }
    return res.status(400).json({ error: 'Action invalide' })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// ── Live feed ─────────────────────────────────────────────────────────────────
router.get('/live-feed', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM live_feed ORDER BY created_at DESC LIMIT 30`)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

router.get('/info', (req, res) => {
  res.json({
    slots:     { name: 'Slot Machine',     rtp: 88, minBet: MIN_BET, maxBet: MAX_BET },
    plinko:    { name: 'Plinko',           rtp: 91, minBet: MIN_BET, maxBet: MAX_BET },
    roulette:  { name: 'Roulette Pokémon', rtp: 91, minBet: MIN_BET, maxBet: MAX_BET },
    crash:     { name: 'Crash',            rtp: 92, minBet: MIN_BET, maxBet: MAX_BET },
    blackjack: { name: 'Blackjack',        rtp: 91, minBet: MIN_BET, maxBet: MAX_BET },
    mines:     { name: 'Mines',            rtp: 92, minBet: MIN_BET, maxBet: MAX_BET },
  })
})

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { filter = 'all', limit = 50, offset = 0 } = req.query
    let where  = 'WHERE gh.user_id = $1'
    const params = [req.user.id]
    if (filter === 'wins')          where += ' AND gh.payout > gh.bet'
    else if (filter === 'losses')   where += ' AND gh.payout < gh.bet'
    else if (filter === 'big_wins') where += ' AND gh.payout >= gh.bet * 2'
    const result = await query(`
      SELECT gh.id, CONCAT('#',UPPER(SUBSTRING(gh.game,1,3)),'-',LPAD(gh.id::text,6,'0')) as bet_id,
             gh.game, gh.bet, gh.payout, gh.payout - gh.bet as profit, gh.meta, gh.created_at
      FROM game_history gh ${where}
      ORDER BY gh.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), parseInt(offset)])
    const countResult = await query(`SELECT COUNT(*) as total FROM game_history ${where}`, params)
    res.json({ history: result.rows, total: parseInt(countResult.rows[0].total) })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// ── Leaderboard — requêtes 100% paramétrées (pas de concaténation SQL) ────────
router.get('/leaderboard', async (req, res) => {
  try {
    const { game } = req.query
    const VALID    = ['slots', 'plinko', 'roulette', 'crash', 'blackjack', 'mines']
    const g        = VALID.includes(game) ? game : null   // null = tous les jeux

    // Meilleur gain unique par joueur (gain le plus élevé en jetons)
    const q1 = g
      ? `SELECT u.username, gh.game, gh.bet::int, gh.payout::int,
                CONCAT('#',UPPER(SUBSTRING(gh.game,1,3)),'-',LPAD(gh.id::text,6,'0')) AS bet_id
         FROM game_history gh JOIN users u ON u.id = gh.user_id
         WHERE gh.payout > gh.bet AND gh.game = $1
         ORDER BY gh.payout DESC LIMIT 20`
      : `SELECT u.username, gh.game, gh.bet::int, gh.payout::int,
                CONCAT('#',UPPER(SUBSTRING(gh.game,1,3)),'-',LPAD(gh.id::text,6,'0')) AS bet_id
         FROM game_history gh JOIN users u ON u.id = gh.user_id
         WHERE gh.payout > gh.bet
         ORDER BY gh.payout DESC LIMIT 20`
    const topBestWin = await query(q1, g ? [g] : [])

    // Plus gros gains (= même chose, alias différent côté front)
    const topWins = topBestWin

    // Plus grosses mises
    const q3 = g
      ? `SELECT u.username, gh.game, gh.bet::int, gh.payout::int,
                CONCAT('#',UPPER(SUBSTRING(gh.game,1,3)),'-',LPAD(gh.id::text,6,'0')) AS bet_id
         FROM game_history gh JOIN users u ON u.id = gh.user_id
         WHERE gh.game = $1
         ORDER BY gh.bet DESC LIMIT 20`
      : `SELECT u.username, gh.game, gh.bet::int, gh.payout::int,
                CONCAT('#',UPPER(SUBSTRING(gh.game,1,3)),'-',LPAD(gh.id::text,6,'0')) AS bet_id
         FROM game_history gh JOIN users u ON u.id = gh.user_id
         ORDER BY gh.bet DESC LIMIT 20`
    const topBet = await query(q3, g ? [g] : [])

    // Plus actifs
    const q4 = g
      ? `SELECT u.username, COUNT(gh.id)::int AS games_played, COALESCE(SUM(gh.bet),0)::int AS total_bet
         FROM users u JOIN game_history gh ON gh.user_id = u.id
         WHERE gh.game = $1
         GROUP BY u.username ORDER BY games_played DESC LIMIT 20`
      : `SELECT u.username, COUNT(gh.id)::int AS games_played, COALESCE(SUM(gh.bet),0)::int AS total_bet
         FROM users u JOIN game_history gh ON gh.user_id = u.id
         GROUP BY u.username ORDER BY games_played DESC LIMIT 20`
    const mostPlayed = await query(q4, g ? [g] : [])

    res.json({
      topBestWin:  topBestWin.rows,
      topWins:     topWins.rows,
      topBet:      topBet.rows,
      mostPlayed:  mostPlayed.rows,
    })
  } catch (err) {
    console.error('Leaderboard error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
