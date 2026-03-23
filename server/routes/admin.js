const express = require('express')
const bcrypt  = require('bcryptjs')
const { query } = require('../db')
const { adminMiddleware, authMiddleware } = require('../middleware/auth')

const router = express.Router()

// ── Stats globales ─────────────────────────────────────────────────────────────
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [users, games, bets, balance, withdrawals] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM users`),
      query(`SELECT COUNT(*)::int AS total FROM game_history`),
      query(`SELECT COALESCE(SUM(bet), 0)::int AS total FROM game_history`),
      query(`SELECT COALESCE(SUM(balance), 0)::int AS total FROM users`),
      query(`SELECT COUNT(*)::int AS total FROM withdrawals WHERE status = 'pending'`),
    ])
    res.json({
      total_users:       users.rows[0].total,
      total_games:       games.rows[0].total,
      total_bets:        bets.rows[0].total,
      total_balance:     balance.rows[0].total,
      total_withdrawals: withdrawals.rows[0].total,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Liste joueurs ──────────────────────────────────────────────────────────────
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, username, balance, is_admin, is_temp_pw, created_at,
             total_wagered, rank_id
      FROM users ORDER BY id DESC
    `)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Créer un joueur ───────────────────────────────────────────────────────────
router.post('/users', adminMiddleware, async (req, res) => {
  try {
    const { username, password, balance = 0, is_admin = 0 } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Pseudo et mot de passe requis' })
    const hash = bcrypt.hashSync(password, 10)
    const result = await query(
      `INSERT INTO users (username, password, is_temp_pw, is_admin, balance, total_wagered, rank_id)
       VALUES ($1, $2, 1, $3, $4, 0, 1) RETURNING id, username, balance, is_admin, is_temp_pw, created_at`,
      [username.trim(), hash, is_admin ? 1 : 0, parseInt(balance) || 0]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.message.includes('unique')) return res.status(400).json({ error: 'Ce pseudo existe déjà' })
    res.status(500).json({ error: err.message })
  }
})

// ── Créditer un joueur ────────────────────────────────────────────────────────
router.post('/credit', adminMiddleware, async (req, res) => {
  try {
    const { userId, amount, description = 'Crédit admin' } = req.body
    const n = parseInt(amount)
    if (!n || !userId) return res.status(400).json({ error: 'userId et amount requis' })
    const result = await query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
      [n, userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Joueur introuvable' })
    await query(`INSERT INTO transactions (user_id, type, amount, description) VALUES ($1,$2,$3,$4)`,
      [userId, n > 0 ? 'credit' : 'debit', Math.abs(n), description])
    if (global.io) global.io.to(`user_${userId}`).emit('balance_update', { balance: result.rows[0].balance })
    res.json({ newBalance: result.rows[0].balance })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Reset mot de passe ────────────────────────────────────────────────────────
router.post('/reset-password', adminMiddleware, async (req, res) => {
  try {
    const { userId, newPassword } = req.body
    if (!userId || !newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Paramètres invalides' })
    const hash = bcrypt.hashSync(newPassword, 10)
    await query(`UPDATE users SET password = $1, is_temp_pw = 1 WHERE id = $2`, [hash, userId])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Retraits ──────────────────────────────────────────────────────────────────
router.get('/withdrawals', adminMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT w.*, u.username
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
      ORDER BY
        CASE w.status WHEN 'pending' THEN 0 ELSE 1 END,
        w.created_at DESC
      LIMIT 100
    `)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/withdrawals/:id', adminMiddleware, async (req, res) => {
  try {
    const { status, admin_note = '' } = req.body
    const id = parseInt(req.params.id)
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Statut invalide' })

    const wd = await query(`SELECT * FROM withdrawals WHERE id = $1`, [id])
    if (!wd.rows[0]) return res.status(404).json({ error: 'Retrait introuvable' })
    const w = wd.rows[0]

    if (w.status !== 'pending') return res.status(400).json({ error: 'Retrait déjà traité' })

    await query(`UPDATE withdrawals SET status = $1, admin_note = $2, resolved_at = to_char(now(),'YYYY-MM-DD HH24:MI:SS') WHERE id = $3`,
      [status, admin_note, id])

    // Si refusé, rembourser
    if (status === 'rejected') {
      await query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [w.amount, w.user_id])
      await query(`INSERT INTO transactions (user_id, type, amount, description) VALUES ($1,'credit',$2,'Retrait refusé — remboursement')`,
        [w.user_id, w.amount])
      if (global.io) {
        const bal = await query(`SELECT balance FROM users WHERE id = $1`, [w.user_id])
        global.io.to(`user_${w.user_id}`).emit('balance_update', { balance: bal.rows[0]?.balance })
      }
    }
    if (global.io) global.io.to(`user_${w.user_id}`).emit('withdrawal_status', { id, status, admin_note })

    res.json({ ok: true, status })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Paramètres jeux — SANS Crash ─────────────────────────────────────────────
const VALID_GAMES = ['slots', 'roulette', 'blackjack', 'mines', 'plinko']

router.get('/game-settings', async (req, res) => {
  try {
    const result = await query(`SELECT game, enabled FROM game_settings WHERE game = ANY($1)`, [VALID_GAMES])
    const settings = {}
    for (const row of result.rows) settings[row.game] = row.enabled === 1 || row.enabled === true
    // Défaut ON pour les jeux manquants
    for (const g of VALID_GAMES) if (settings[g] === undefined) settings[g] = true
    res.json(settings)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/game-settings', adminMiddleware, async (req, res) => {
  try {
    const { game, enabled } = req.body
    if (!VALID_GAMES.includes(game)) return res.status(400).json({ error: 'Jeu invalide. Crash a été retiré du casino.' })
    await query(`INSERT INTO game_settings (game, enabled) VALUES ($1, $2) ON CONFLICT (game) DO UPDATE SET enabled = $2`,
      [game, enabled ? 1 : 0])
    if (global.io) global.io.emit('game_settings_update', { game, enabled })
    res.json({ ok: true, game, enabled })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SuperJackpot ──────────────────────────────────────────────────────────────
router.post('/jackpot', adminMiddleware, async (req, res) => {
  try {
    const { amount } = req.body
    const n = parseInt(amount)
    if (!n || n < 0) return res.status(400).json({ error: 'Montant invalide' })
    await query(`UPDATE superjackpot SET amount = $1, updated_at = to_char(now(),'YYYY-MM-DD HH24:MI:SS') WHERE id = 1`, [n])
    if (global.io) global.io.emit('superjackpot_update', { amount: n })
    res.json({ ok: true, amount: n })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
