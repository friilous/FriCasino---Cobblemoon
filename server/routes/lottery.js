// ── routes/lottery.js ─────────────────────────────────────────────────────────
// Loterie : tickets à 5 000 jetons
// Tirage toutes les 48h à 20h heure FR
// Gagnant = 80% de la cagnotte, 20% reporté au prochain tirage

const express = require('express')
const router  = express.Router()
const { getDB } = require('../db')

const { authMiddleware: verifyToken } = require('../middleware/auth')
}

const TICKET_PRICE   = 5000
const WINNER_SHARE   = 0.80
const CARRY_SHARE    = 0.20
const CARRY_MIN      = 5000   // pot minimum reporté

// ── Init tables ───────────────────────────────────────────────────────────────
async function initLotteryTables() {
  const db = getDB()
  await db.run(`CREATE TABLE IF NOT EXISTS lottery_pot (
    id         INTEGER PRIMARY KEY,
    amount     INTEGER NOT NULL DEFAULT 0,
    draw_count INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  await db.run(`CREATE TABLE IF NOT EXISTS lottery_tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    username   TEXT NOT NULL,
    draw_id    INTEGER NOT NULL,
    bought_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  await db.run(`CREATE TABLE IF NOT EXISTS lottery_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id    INTEGER NOT NULL,
    winner     TEXT NOT NULL,
    amount_won INTEGER NOT NULL,
    carried    INTEGER NOT NULL,
    tickets    INTEGER NOT NULL,
    drawn_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  // Seed
  const row = await db.get('SELECT id FROM lottery_pot WHERE id = 1')
  if (!row) await db.run('INSERT INTO lottery_pot (id, amount, draw_count) VALUES (1, 0, 1)')
}
initLotteryTables().catch(console.error)

// ── GET /api/lottery — état actuel ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db      = getDB()
    const pot     = await db.get('SELECT * FROM lottery_pot WHERE id = 1')
    const drawId  = pot?.draw_count ?? 1
    const tickets = await db.all(
      'SELECT username, COUNT(*) as count FROM lottery_tickets WHERE draw_id = ? GROUP BY username',
      [drawId]
    )
    const totalTickets = tickets.reduce((s, t) => s + t.count, 0)
    res.json({
      pot:          pot?.amount ?? 0,
      draw_id:      drawId,
      ticket_price: TICKET_PRICE,
      total_tickets: totalTickets,
      players:      tickets,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/lottery/mytickets — tickets du joueur connecté ───────────────────
router.get('/mytickets', verifyToken, async (req, res) => {
  try {
    const db     = getDB()
    const pot    = await db.get('SELECT draw_count FROM lottery_pot WHERE id = 1')
    const drawId = pot?.draw_count ?? 1
    const count  = await db.get(
      'SELECT COUNT(*) as n FROM lottery_tickets WHERE user_id = ? AND draw_id = ?',
      [req.user.id, drawId]
    )
    res.json({ tickets: count?.n ?? 0, draw_id: drawId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/lottery/buy — acheter des tickets ───────────────────────────────
// body: { amount: number } (nombre de tickets)
router.post('/buy', verifyToken, async (req, res) => {
  const qty = Math.max(1, parseInt(req.body.amount) || 1)
  const total = qty * TICKET_PRICE

  try {
    const db   = getDB()
    const user = await db.get('SELECT id, username, balance FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (user.balance < total) return res.status(400).json({ error: `Fonds insuffisants (${user.balance} < ${total})` })

    const pot    = await db.get('SELECT * FROM lottery_pot WHERE id = 1')
    const drawId = pot?.draw_count ?? 1

    // Débiter le joueur
    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [total, user.id])
    // Créditer le pot
    await db.run('UPDATE lottery_pot SET amount = amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [total])

    // Créer les tickets
    for (let i = 0; i < qty; i++) {
      await db.run('INSERT INTO lottery_tickets (user_id, username, draw_id) VALUES (?,?,?)',
        [user.id, user.username, drawId])
    }

    const newBalance = user.balance - total
    const newPot     = (pot?.amount ?? 0) + total

    // Émettre update live
    if (global.io) global.io.emit('lottery_update', { pot: newPot, total_tickets: drawId })

    // Notifier wallet
    if (global.io) global.io.to(`user_${user.id}`).emit('balance_update', { balance: newBalance })

    res.json({ balance: newBalance, pot: newPot, tickets_bought: qty })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/lottery/draw — tirage (cron ou admin) ───────────────────────────
router.post('/draw', async (req, res) => {
  try {
    const db     = getDB()
    const pot    = await db.get('SELECT * FROM lottery_pot WHERE id = 1')
    const drawId = pot?.draw_count ?? 1
    const amount = pot?.amount ?? 0

    // Récupérer tous les tickets
    const tickets = await db.all('SELECT user_id, username FROM lottery_tickets WHERE draw_id = ?', [drawId])
    if (tickets.length === 0) {
      return res.status(400).json({ error: 'Aucun ticket pour ce tirage' })
    }

    // Tirage au sort (probabilité = nombre de tickets)
    const idx    = Math.floor(Math.random() * tickets.length)
    const winner = tickets[idx]

    const amountWon = Math.floor(amount * WINNER_SHARE)
    const carried   = Math.max(amount - amountWon, CARRY_MIN)

    // Créditer le gagnant
    await db.run('UPDATE users SET balance = balance + ? WHERE username = ?', [amountWon, winner.username])
    // Passer au tirage suivant avec le montant reporté
    await db.run('UPDATE lottery_pot SET amount = ?, draw_count = draw_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [carried])
    // Historique
    await db.run('INSERT INTO lottery_history (draw_id, winner, amount_won, carried, tickets) VALUES (?,?,?,?,?)',
      [drawId, winner.username, amountWon, carried, tickets.length])

    // Notifs live
    if (global.io) {
      global.io.emit('lottery_won', {
        winner:   winner.username,
        amount:   amountWon,
        tickets:  tickets.length,
        new_pot:  carried,
        draw_id:  drawId,
      })
      global.io.to(`user_${winner.user_id}`).emit('balance_update', {})
    }

    res.json({ winner: winner.username, amountWon, carried, tickets: tickets.length, drawId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/lottery/history — historique des tirages ────────────────────────
router.get('/history', async (req, res) => {
  try {
    const db   = getDB()
    const rows = await db.all('SELECT * FROM lottery_history ORDER BY drawn_at DESC LIMIT 10')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Cron : même logique que jackpot, tirages les jours impairs à 20h ──────────
function checkLotteryDraw() {
  const now    = new Date()
  const frHour = (now.getUTCHours() + 1) % 24
  const frDay  = now.getUTCDay()
  const isDrawTime = frHour === 20 && now.getUTCMinutes() === 0 && frDay % 2 === 1
  if (!isDrawTime) return
  const db = getDB()
  db.get('SELECT amount FROM lottery_pot WHERE id = 1').then(row => {
    if (row && row.amount > 0) {
      console.log('🎟️ Lottery draw automatique...')
      const http = require('http')
      const options = { hostname: 'localhost', port: process.env.PORT || 3001, path: '/api/lottery/draw', method: 'POST', headers: { 'Content-Type': 'application/json' } }
      http.request(options).end()
    }
  })
}
setInterval(checkLotteryDraw, 60 * 1000)

module.exports = router
