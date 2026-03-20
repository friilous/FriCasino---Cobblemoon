const express = require('express')
const bcrypt = require('bcryptjs')
const { query } = require('../db')
const { adminMiddleware } = require('../middleware/auth')

const router = express.Router()

const GAMES = ['slots', 'roulette', 'crash', 'blackjack', 'mines', 'plinko']

function generateTempPassword() {
  const prefixes = ['Bulbi','Salame','Cara','Pika','Magie','Florizarre','Reptincel','Aquali','Noctali','Voltali']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${num}`
}

// ── Init game_settings ────────────────────────────────────────────────────────
async function initGameSettings() {
  await query(`
    CREATE TABLE IF NOT EXISTS game_settings (
      game    TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1
    )
  `)
  for (const game of GAMES) {
    await query(`
      INSERT INTO game_settings (game, enabled)
      VALUES ($1, 1)
      ON CONFLICT (game) DO NOTHING
    `, [game])
  }
}
initGameSettings().catch(console.error)

// ── GET /api/admin/game-settings ─────────────────────────────────────────────
router.get('/game-settings', async (req, res) => {
  try {
    const result = await query(`SELECT game, enabled FROM game_settings`)
    const settings = {}
    for (const row of result.rows) {
      settings[row.game] = row.enabled === 1 || row.enabled === true
    }
    for (const game of GAMES) {
      if (!(game in settings)) settings[game] = true
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── PUT /api/admin/game-settings/:game ────────────────────────────────────────
router.put('/game-settings/:game', adminMiddleware, async (req, res) => {
  try {
    const game    = req.params.game
    const enabled = req.body.enabled ? 1 : 0

    if (!GAMES.includes(game)) return res.status(400).json({ error: 'Jeu invalide' })

    await query(`
      INSERT INTO game_settings (game, enabled)
      VALUES ($1, $2)
      ON CONFLICT (game) DO UPDATE SET enabled = $2
    `, [game, enabled])

    if (global.io) {
      global.io.emit('game_settings_update', { game, enabled: enabled === 1 })
    }

    res.json({
      game,
      enabled: enabled === 1,
      message: enabled
        ? `${game} activé`
        : `${game} désactivé — les parties en cours peuvent se terminer normalement`,
    })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        u.id, u.username, u.is_admin, u.is_temp_pw, u.balance, u.created_at,
        COUNT(gh.id) as games_played,
        COALESCE(SUM(gh.bet), 0) as total_bet,
        COALESCE(SUM(gh.payout), 0) as total_payout
      FROM users u
      LEFT JOIN game_history gh ON gh.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `)
    res.json(result.rows.map(u => ({
      ...u,
      is_admin:   u.is_admin === 1,
      is_temp_pw: u.is_temp_pw === 1,
      games_played:  parseInt(u.games_played),
      total_bet:     parseInt(u.total_bet),
      total_payout:  parseInt(u.total_payout),
      net_loss:      parseInt(u.total_bet) - parseInt(u.total_payout),
    })))
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── POST /api/admin/users ─────────────────────────────────────────────────────
router.post('/users', adminMiddleware, async (req, res) => {
  try {
    const { username, initial_balance = 0 } = req.body
    if (!username) return res.status(400).json({ error: 'Pseudo requis' })

    const exists = await query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1)`, [username.trim()])
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Ce pseudo existe déjà' })

    const tempPw = generateTempPassword()
    const hash   = bcrypt.hashSync(tempPw, 10)
    const bal    = Math.max(0, parseInt(initial_balance) || 0)

    const result = await query(
      `INSERT INTO users (username, password, is_temp_pw, balance) VALUES ($1, $2, 1, $3) RETURNING id`,
      [username.trim().toLowerCase(), hash, bal]
    )
    const newId = result.rows[0].id

    if (bal > 0) {
      await query(
        `INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, 'credit', $2, $3)`,
        [newId, bal, 'Dépôt initial à la création du compte']
      )
    }

    res.status(201).json({
      id: newId,
      username: username.trim().toLowerCase(),
      temp_password: tempPw,
      balance: bal,
      message: `Compte créé ! Envoie ce mot de passe provisoire au joueur : ${tempPw}`,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── PUT /api/admin/users/:id/balance ─────────────────────────────────────────
router.put('/users/:id/balance', adminMiddleware, async (req, res) => {
  try {
    const { amount, type, description } = req.body
    const userId       = parseInt(req.params.id)
    const parsedAmount = parseInt(amount)

    if (!parsedAmount || parsedAmount <= 0) return res.status(400).json({ error: 'Montant invalide' })
    if (!['credit','debit'].includes(type)) return res.status(400).json({ error: 'Type invalide' })

    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [userId])
    const user = userResult.rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (type === 'debit' && user.balance < parsedAmount) return res.status(400).json({ error: 'Solde insuffisant' })

    const newBalance = type === 'credit' ? user.balance + parsedAmount : user.balance - parsedAmount
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId])
    await query(
      `INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)`,
      [userId, type, parsedAmount, description || (type === 'credit' ? 'Crédit admin' : 'Débit admin')]
    )

    if (global.io) {
      global.io.to(`user_${userId}`).emit('balance_update', { balance: newBalance })
    }

    res.json({ balance: newBalance, message: 'Solde mis à jour' })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── PUT /api/admin/users/:id/reset-password ───────────────────────────────────
router.put('/users/:id/reset-password', adminMiddleware, async (req, res) => {
  try {
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [parseInt(req.params.id)])
    const user = userResult.rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const tempPw = generateTempPassword()
    const hash   = bcrypt.hashSync(tempPw, 10)
    await query(`UPDATE users SET password = $1, is_temp_pw = 1 WHERE id = $2`, [hash, user.id])

    res.json({ temp_password: tempPw, message: `Envoie ce nouveau mot de passe provisoire : ${tempPw}` })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const userId     = parseInt(req.params.id)
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [userId])
    const user       = userResult.rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (user.is_admin) return res.status(403).json({ error: 'Impossible de supprimer un admin' })
    await query(`DELETE FROM users WHERE id = $1`, [userId])
    res.json({ message: 'Compte supprimé' })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/admin/withdrawals ────────────────────────────────────────────────
router.get('/withdrawals', adminMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT w.*, u.username
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── PUT /api/admin/withdrawals/:id ────────────────────────────────────────────
router.put('/withdrawals/:id', adminMiddleware, async (req, res) => {
  try {
    const { action, admin_note } = req.body
    const wResult    = await query(`SELECT * FROM withdrawals WHERE id = $1`, [parseInt(req.params.id)])
    const withdrawal = wResult.rows[0]
    if (!withdrawal) return res.status(404).json({ error: 'Demande introuvable' })
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Demande déjà traitée' })

    if (action === 'approve') {
      await query(
        `UPDATE withdrawals SET status = 'approved', resolved_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), admin_note = $1 WHERE id = $2`,
        [admin_note || null, withdrawal.id]
      )
      await query(
        `INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, 'debit', $2, $3)`,
        [withdrawal.user_id, withdrawal.amount, `Retrait approuvé #${withdrawal.id}`]
      )
      res.json({ message: 'Retrait approuvé — pense à verser les Pokédollars en jeu !' })
    } else if (action === 'reject') {
      const userResult = await query(`SELECT balance FROM users WHERE id = $1`, [withdrawal.user_id])
      const user = userResult.rows[0]
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [user.balance + withdrawal.amount, withdrawal.user_id])
      await query(
        `UPDATE withdrawals SET status = 'rejected', resolved_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), admin_note = $1 WHERE id = $2`,
        [admin_note || null, withdrawal.id]
      )
      await query(
        `INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, 'credit', $2, $3)`,
        [withdrawal.user_id, withdrawal.amount, `Retrait refusé — jetons remboursés #${withdrawal.id}`]
      )
      if (global.io) global.io.to(`user_${withdrawal.user_id}`).emit('balance_update', { balance: user.balance + withdrawal.amount })
      res.json({ message: 'Retrait refusé, jetons remboursés au joueur' })
    } else {
      res.status(400).json({ error: 'Action invalide' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/admin/bets ───────────────────────────────────────────────────────
router.get('/bets', adminMiddleware, async (req, res) => {
  try {
    const { game, filter = 'all', userId, limit = 100, offset = 0, search } = req.query
    const params  = []
    const clauses = []

    if (game && GAMES.includes(game)) {
      params.push(game)
      clauses.push(`gh.game = $${params.length}`)
    }
    if (userId) {
      params.push(parseInt(userId))
      clauses.push(`gh.user_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`)
      clauses.push(`LOWER(u.username) LIKE $${params.length}`)
    }
    if (filter === 'wins') clauses.push('gh.payout > gh.bet')
    if (filter === 'losses') clauses.push('gh.payout < gh.bet')
    if (filter === 'big_wins') clauses.push('gh.payout >= gh.bet * 2')

    const whereSQL = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

    const result = await query(`
      SELECT
        gh.id,
        CONCAT('#', UPPER(SUBSTRING(gh.game, 1, 3)), '-', LPAD(gh.id::text, 6, '0')) as bet_id,
        u.username,
        gh.game,
        gh.bet,
        gh.payout,
        gh.payout - gh.bet as profit,
        gh.meta,
        gh.created_at
      FROM game_history gh
      JOIN users u ON gh.user_id = u.id
      ${whereSQL}
      ORDER BY gh.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), parseInt(offset)])

    const countResult = await query(
      `SELECT COUNT(*) as total FROM game_history gh JOIN users u ON gh.user_id = u.id ${whereSQL}`,
      params
    )

    res.json({
      bets:  result.rows,
      total: parseInt(countResult.rows[0].total),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/admin/players/:id/history ───────────────────────────────────────
router.get('/players/:id/history', adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id)
    const { filter = 'all', limit = 50, offset = 0 } = req.query

    const params  = [userId]
    const clauses = [`gh.user_id = $1`]

    if (filter === 'wins')     clauses.push('gh.payout > gh.bet')
    if (filter === 'losses')   clauses.push('gh.payout < gh.bet')
    if (filter === 'big_wins') clauses.push('gh.payout >= gh.bet * 2')

    const whereSQL = `WHERE ${clauses.join(' AND ')}`

    const [userResult, histResult, statsResult] = await Promise.all([
      query(`SELECT id, username, balance, created_at FROM users WHERE id = $1`, [userId]),
      query(`
        SELECT
          gh.id,
          CONCAT('#', UPPER(SUBSTRING(gh.game, 1, 3)), '-', LPAD(gh.id::text, 6, '0')) as bet_id,
          gh.game, gh.bet, gh.payout,
          gh.payout - gh.bet as profit,
          gh.meta, gh.created_at
        FROM game_history gh
        ${whereSQL}
        ORDER BY gh.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), parseInt(offset)]),
      query(`
        SELECT
          COUNT(*) as games_played,
          COALESCE(SUM(bet), 0) as total_bet,
          COALESCE(SUM(payout), 0) as total_payout,
          COALESCE(MAX(payout), 0) as biggest_win,
          COALESCE(MAX(payout - bet), 0) as biggest_profit
        FROM game_history WHERE user_id = $1
      `, [userId]),
    ])

    if (!userResult.rows[0]) return res.status(404).json({ error: 'Joueur introuvable' })

    const stats = statsResult.rows[0]
    res.json({
      user:    userResult.rows[0],
      history: histResult.rows,
      stats: {
        games_played:   parseInt(stats.games_played),
        total_bet:      parseInt(stats.total_bet),
        total_payout:   parseInt(stats.total_payout),
        net_loss:       parseInt(stats.total_bet) - parseInt(stats.total_payout),
        biggest_win:    parseInt(stats.biggest_win),
        biggest_profit: parseInt(stats.biggest_profit),
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [players, balances, pending, games, bets, byGame, topWinners, topLosers] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM users WHERE is_admin = 0`),
      query(`SELECT SUM(balance) as total FROM users WHERE is_admin = 0`),
      query(`SELECT COUNT(*) as count, SUM(amount) as total FROM withdrawals WHERE status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM game_history`),
      query(`SELECT SUM(bet) as total_bet, SUM(payout) as total_payout FROM game_history`),
      query(`
        SELECT game,
          COUNT(*) as plays,
          SUM(bet) as total_bet,
          SUM(payout) as total_payout,
          ROUND(SUM(payout)::numeric / NULLIF(SUM(bet), 0) * 100, 2) as actual_rtp
        FROM game_history
        GROUP BY game
        ORDER BY total_bet DESC
      `),
      query(`
        SELECT gh.id, u.username, gh.game, gh.bet, gh.payout, gh.payout - gh.bet as profit, gh.created_at,
          CONCAT('#', UPPER(SUBSTRING(gh.game, 1, 3)), '-', LPAD(gh.id::text, 6, '0')) as bet_id
        FROM game_history gh JOIN users u ON gh.user_id = u.id
        ORDER BY gh.payout DESC LIMIT 5
      `),
      query(`
        SELECT gh.id, u.username, gh.game, gh.bet, gh.payout, gh.bet - gh.payout as loss, gh.created_at,
          CONCAT('#', UPPER(SUBSTRING(gh.game, 1, 3)), '-', LPAD(gh.id::text, 6, '0')) as bet_id
        FROM game_history gh JOIN users u ON gh.user_id = u.id
        WHERE gh.payout = 0
        ORDER BY gh.bet DESC LIMIT 5
      `),
    ])

    const totalBet    = parseInt(bets.rows[0].total_bet)    || 0
    const totalPayout = parseInt(bets.rows[0].total_payout) || 0

    res.json({
      totalPlayers:       parseInt(players.rows[0].count),
      totalBalance:       parseInt(balances.rows[0].total) || 0,
      pendingWithdrawals: { count: parseInt(pending.rows[0].count), total: parseInt(pending.rows[0].total) || 0 },
      gamesPlayed:        parseInt(games.rows[0].count),
      totalBet,
      totalPayout,
      houseProfit:        totalBet - totalPayout,
      houseEdge:          totalBet > 0 ? (((totalBet - totalPayout) / totalBet) * 100).toFixed(2) : 0,
      byGame:             byGame.rows,
      topWinners:         topWinners.rows,
      topLosers:          topLosers.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
//  NEXTLEG MOD — Routes de tracking
// ═════════════════════════════════════════════════════════════════════════════

// ── POST /api/admin/nextleg-ping ─────────────────────────────────────────────
// Appelé par le mod Minecraft (pas de adminMiddleware — le mod n'est pas connecté)
router.post('/nextleg-ping', async (req, res) => {
  try {
    const { player, alias = '', uid, version = '' } = req.body
    if (!uid || !player) return res.status(400).json({ error: 'uid et player requis' })

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const existing = await query(`SELECT id FROM nextleg_users WHERE uid = $1`, [uid])

    if (existing.rows.length > 0) {
      await query(`
        UPDATE nextleg_users
        SET player = $1, alias = $2, version = $3, last_seen = $4, ping_count = ping_count + 1
        WHERE uid = $5
      `, [player, alias || '', version, now, uid])
    } else {
      await query(`
        INSERT INTO nextleg_users (uid, player, alias, version, first_seen, last_seen, ping_count)
        VALUES ($1, $2, $3, $4, $5, $5, 1)
      `, [uid, player, alias || '', version, now])

      // Notif temps réel dans le panel admin
      if (global.io) {
        global.io.to('admin').emit('nextleg_new_user', { uid, player, alias, version, first_seen: now })
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[NextLeg ping]', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/admin/nextleg-users ─────────────────────────────────────────────
router.get('/nextleg-users', adminMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, uid, player, alias, version, first_seen, last_seen, ping_count, note
      FROM nextleg_users
      ORDER BY last_seen DESC
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── PUT /api/admin/nextleg-users/:uid/note ────────────────────────────────────
router.put('/nextleg-users/:uid/note', adminMiddleware, async (req, res) => {
  try {
    const { note } = req.body
    await query(`UPDATE nextleg_users SET note = $1 WHERE uid = $2`, [note || '', req.params.uid])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── DELETE /api/admin/nextleg-users/:uid ─────────────────────────────────────
router.delete('/nextleg-users/:uid', adminMiddleware, async (req, res) => {
  try {
    await query(`DELETE FROM nextleg_users WHERE uid = $1`, [req.params.uid])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
