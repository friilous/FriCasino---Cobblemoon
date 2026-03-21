const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const TICKET_PRICE = 5000
const WINNER_SHARE = 0.80
const CARRY_MIN    = 5000

async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS lottery_pot (
    id         INTEGER PRIMARY KEY DEFAULT 1,
    amount     INTEGER NOT NULL DEFAULT 0,
    draw_count INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)
  await query(`CREATE TABLE IF NOT EXISTS lottery_tickets (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER NOT NULL,
    username  TEXT NOT NULL,
    draw_id   INTEGER NOT NULL,
    bought_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)
  await query(`CREATE TABLE IF NOT EXISTS lottery_history (
    id         SERIAL PRIMARY KEY,
    draw_id    INTEGER NOT NULL,
    winner     TEXT NOT NULL,
    amount_won INTEGER NOT NULL,
    carried    INTEGER NOT NULL,
    tickets    INTEGER NOT NULL,
    drawn_at   TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)
  const r = await query('SELECT id FROM lottery_pot WHERE id = 1')
  if (r.rows.length === 0) {
    await query('INSERT INTO lottery_pot (id, amount, draw_count) VALUES (1, 0, 1)')
  }
}
initTables().catch(console.error)

// GET /api/lottery
router.get('/', async (req, res) => {
  try {
    const r      = await query('SELECT * FROM lottery_pot WHERE id = 1')
    const pot    = r.rows[0]
    const drawId = pot?.draw_count ?? 1
    const tr     = await query(
      'SELECT username, COUNT(*) as count FROM lottery_tickets WHERE draw_id = $1 GROUP BY username', [drawId]
    )
    const totalTickets = tr.rows.reduce((s, t) => s + parseInt(t.count), 0)
    res.json({ pot: pot?.amount ?? 0, draw_id: drawId, ticket_price: TICKET_PRICE, total_tickets: totalTickets, players: tr.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/lottery/mytickets
router.get('/mytickets', authMiddleware, async (req, res) => {
  try {
    const r      = await query('SELECT draw_count FROM lottery_pot WHERE id = 1')
    const drawId = r.rows[0]?.draw_count ?? 1
    const cr     = await query(
      'SELECT COUNT(*) as n FROM lottery_tickets WHERE user_id = $1 AND draw_id = $2', [req.user.id, drawId]
    )
    res.json({ tickets: parseInt(cr.rows[0]?.n) ?? 0, draw_id: drawId })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/lottery/buy  { amount }
router.post('/buy', authMiddleware, async (req, res) => {
  const qty   = Math.max(1, parseInt(req.body.amount) || 1)
  const total = qty * TICKET_PRICE
  try {
    const ur = await query('SELECT id, username, balance FROM users WHERE id = $1', [req.user.id])
    const user = ur.rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (user.balance < total) return res.status(400).json({ error: 'Fonds insuffisants' })

    const pr     = await query('SELECT * FROM lottery_pot WHERE id = 1')
    const pot    = pr.rows[0]
    const drawId = pot?.draw_count ?? 1

    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [total, user.id])
    await query('UPDATE lottery_pot SET amount = amount + $1, updated_at = to_char(now(),\'YYYY-MM-DD HH24:MI:SS\') WHERE id = 1', [total])
    for (let i = 0; i < qty; i++) {
      await query('INSERT INTO lottery_tickets (user_id, username, draw_id) VALUES ($1, $2, $3)',
        [user.id, user.username, drawId])
    }

    const newBalance = user.balance - total
    const newPot     = (pot?.amount ?? 0) + total
    if (global.io) {
      global.io.emit('lottery_update', { pot: newPot })
      global.io.to(`user_${user.id}`).emit('balance_update', { balance: newBalance })
    }
    res.json({ balance: newBalance, pot: newPot, tickets_bought: qty })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/lottery/draw
router.post('/draw', async (req, res) => {
  try {
    const pr     = await query('SELECT * FROM lottery_pot WHERE id = 1')
    const pot    = pr.rows[0]
    const drawId = pot?.draw_count ?? 1
    const amount = pot?.amount ?? 0

    const tr = await query('SELECT user_id, username FROM lottery_tickets WHERE draw_id = $1', [drawId])
    const tickets = tr.rows
    if (tickets.length === 0) return res.status(400).json({ error: 'Aucun ticket' })

    const winner    = tickets[Math.floor(Math.random() * tickets.length)]
    const amountWon = Math.floor(amount * WINNER_SHARE)
    const carried   = Math.max(amount - amountWon, CARRY_MIN)

    await query('UPDATE users SET balance = balance + $1 WHERE username = $2', [amountWon, winner.username])
    await query('UPDATE lottery_pot SET amount = $1, draw_count = draw_count + 1, updated_at = to_char(now(),\'YYYY-MM-DD HH24:MI:SS\') WHERE id = 1', [carried])
    await query('INSERT INTO lottery_history (draw_id, winner, amount_won, carried, tickets) VALUES ($1,$2,$3,$4,$5)',
      [drawId, winner.username, amountWon, carried, tickets.length])

    if (global.io) {
      global.io.emit('lottery_won', { winner: winner.username, amount: amountWon, tickets: tickets.length, new_pot: carried, draw_id: drawId })
      global.io.to(`user_${winner.user_id}`).emit('balance_update', {})
    }
    res.json({ winner: winner.username, amountWon, carried, tickets: tickets.length, drawId })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/lottery/history
router.get('/history', async (req, res) => {
  try {
    const r = await query('SELECT * FROM lottery_history ORDER BY drawn_at DESC LIMIT 10')
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Cron tirage
function checkDraw() {
  const now    = new Date()
  const frHour = (now.getUTCHours() + 1) % 24
  const frDay  = now.getUTCDay()
  if (frHour === 20 && now.getUTCMinutes() === 0 && frDay % 2 === 1) {
    query('SELECT amount FROM lottery_pot WHERE id = 1').then(r => {
      if (r.rows[0]?.amount > 0) {
        const http = require('http')
        http.request({ hostname:'localhost', port:process.env.PORT||3001, path:'/api/lottery/draw', method:'POST' }).end()
      }
    }).catch(() => {})
  }
}
setInterval(checkDraw, 60 * 1000)

module.exports = router
