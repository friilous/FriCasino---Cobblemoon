const express = require('express')
const { query } = require('../db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT amount FROM superjackpot WHERE id = 1')
    const amount = result.rows[0]?.amount ?? 5000
    const hist   = await query('SELECT amount_won FROM superjackpot_history ORDER BY drawn_at DESC LIMIT 1')
    res.json({ amount, record: hist.rows[0]?.amount_won ?? 0 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/history', async (req, res) => {
  try {
    const result = await query('SELECT * FROM superjackpot_history ORDER BY drawn_at DESC LIMIT 10')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/eligible', async (req, res) => {
  try {
    // Éligible = a misé au moins 500 jetons dans les 24h
    const result = await query(`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM game_history
      WHERE created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
      GROUP BY user_id
      HAVING SUM(bet) >= 500
    `)
    // Cherche si le user courant est éligible (pas de middleware auth ici, route publique)
    res.json({ count: parseInt(result.rows.length) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/eligible/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT COALESCE(SUM(bet), 0) AS total_bet
      FROM game_history
      WHERE user_id = $1
        AND created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
    `, [req.user.id])
    const totalBet = parseInt(result.rows[0]?.total_bet ?? 0)
    const eligible = totalBet >= 500

    const countResult = await query(`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM game_history
      WHERE created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
      GROUP BY user_id
      HAVING SUM(bet) >= 500
    `)
    res.json({ eligible, total_bet: totalBet, count: countResult.rows.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Remplacer la route GET /eligible par la version me pour avoir l'info du user courant
router.get('/eligible', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT COALESCE(SUM(bet), 0) AS total_bet
      FROM game_history
      WHERE user_id = $1
        AND created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
    `, [req.user.id])
    const totalBet = parseInt(result.rows[0]?.total_bet ?? 0)
    const eligible = totalBet >= 500
    const countResult = await query(`
      SELECT COUNT(DISTINCT gh.user_id) AS count
      FROM (
        SELECT user_id FROM game_history
        WHERE created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
        GROUP BY user_id
        HAVING SUM(bet) >= 500
      ) gh
    `)
    res.json({ eligible, total_bet: totalBet, count: parseInt(countResult.rows[0]?.count ?? 0) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Tirage jackpot — admin uniquement
router.post('/draw', adminMiddleware, async (req, res) => {
  try {
    const sjResult = await query('SELECT amount FROM superjackpot WHERE id = 1')
    const pot      = sjResult.rows[0]?.amount ?? 0

    // Récupère les éligibles
    const eligResult = await query(`
      SELECT DISTINCT gh.user_id, u.username
      FROM game_history gh
      JOIN users u ON u.id = gh.user_id
      WHERE gh.created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
      GROUP BY gh.user_id, u.username
      HAVING SUM(gh.bet) >= 500
    `)
    const elig = eligResult.rows
    if (elig.length === 0) {
      return res.json({ result: 'no_eligible', message: 'Aucun joueur éligible' })
    }

    // Boost si 10+ joueurs
    const multiplier = elig.length >= 10 ? 1.5 : 1
    const totalPot   = Math.floor(pot * multiplier)
    const carried    = Math.floor(totalPot * 0.3)
    const amountWon  = totalPot - carried

    // Tirage
    const winner = elig[Math.floor(Math.random() * elig.length)]
    await query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [amountWon, winner.user_id])
    await query(`UPDATE superjackpot SET amount = $1, updated_at = to_char(now(),'YYYY-MM-DD HH24:MI:SS') WHERE id = 1`, [carried])
    await query(`INSERT INTO superjackpot_history (winner, amount_won, carried, total_pot, eligible) VALUES ($1,$2,$3,$4,$5)`,
      [winner.username, amountWon, carried, totalPot, elig.length])

    if (global.io) {
      global.io.emit('superjackpot_update', { amount: carried })
      global.io.to(`user_${winner.user_id}`).emit('jackpot_won', { amount: amountWon })
      global.io.emit('live_feed', {
        username: winner.username, game: 'jackpot',
        bet: 0, payout: amountWon, multiplier: 0,
        timestamp: new Date().toISOString(),
      })
    }
    await query(`INSERT INTO live_feed (username, game, bet, payout, multiplier) VALUES ($1,'jackpot',0,$2,0)`, [winner.username, amountWon])

    res.json({ result: 'drawn', winner: winner.username, amount_won: amountWon, carried, total_pot: totalPot, eligible_count: elig.length })
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
})

module.exports = router
