const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const JACKPOT_CONTRIB = 0.05
const JACKPOT_MIN     = 5000
const JACKPOT_WINNER  = 0.80

async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS jackpot (
    id         INTEGER PRIMARY KEY DEFAULT 1,
    amount     INTEGER NOT NULL DEFAULT 5000,
    updated_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)
  await query(`CREATE TABLE IF NOT EXISTS jackpot_history (
    id         SERIAL PRIMARY KEY,
    winner     TEXT NOT NULL,
    amount_won INTEGER NOT NULL,
    carried    INTEGER NOT NULL,
    total_pot  INTEGER NOT NULL,
    drawn_at   TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)
  const row = await query('SELECT id FROM jackpot WHERE id = 1')
  if (row.rows.length === 0) {
    await query('INSERT INTO jackpot (id, amount) VALUES (1, 5000)')
  }
}
initTables().catch(console.error)

// GET /api/jackpot
router.get('/', async (req, res) => {
  try {
    const r = await query('SELECT amount, updated_at FROM jackpot WHERE id = 1')
    const row = r.rows[0]
    res.json({ amount: row?.amount ?? 5000, updated_at: row?.updated_at })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/jackpot/contribute  { bet }
router.post('/contribute', async (req, res) => {
  const { bet } = req.body
  if (!bet || bet <= 0) return res.json({ ok: true })
  try {
    const contrib = Math.floor(bet * JACKPOT_CONTRIB)
    await query('UPDATE jackpot SET amount = amount + $1, updated_at = to_char(now(),\'YYYY-MM-DD HH24:MI:SS\') WHERE id = 1', [contrib])
    const r = await query('SELECT amount FROM jackpot WHERE id = 1')
    const amount = r.rows[0]?.amount
    if (global.io) global.io.emit('jackpot_update', { amount })
    res.json({ amount })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/jackpot/draw
router.post('/draw', async (req, res) => {
  try {
    const r   = await query('SELECT amount FROM jackpot WHERE id = 1')
    const pot = r.rows[0]?.amount ?? 0
    if (pot < JACKPOT_MIN) return res.status(400).json({ error: `Jackpot insuffisant (${pot})` })

    const wr = await query(`
      SELECT u.username FROM game_history g
      JOIN users u ON u.id = g.user_id
      WHERE g.created_at > to_char(now() - interval '48 hours', 'YYYY-MM-DD HH24:MI:SS')
      ORDER BY RANDOM() LIMIT 1
    `)
    if (!wr.rows[0]) return res.status(400).json({ error: 'Aucun joueur actif' })

    const winner    = wr.rows[0].username
    const amountWon = Math.floor(pot * JACKPOT_WINNER)
    const carried   = Math.max(pot - amountWon, JACKPOT_MIN)

    await query('UPDATE users SET balance = balance + $1 WHERE username = $2', [amountWon, winner])
    await query('UPDATE jackpot SET amount = $1, updated_at = to_char(now(),\'YYYY-MM-DD HH24:MI:SS\') WHERE id = 1', [carried])
    await query('INSERT INTO jackpot_history (winner, amount_won, carried, total_pot) VALUES ($1,$2,$3,$4)',
      [winner, amountWon, carried, pot])

    if (global.io) global.io.emit('jackpot_won', { winner, amount: amountWon, new_pot: carried })
    res.json({ winner, amountWon, carried, pot })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/jackpot/history
router.get('/history', async (req, res) => {
  try {
    const r = await query('SELECT * FROM jackpot_history ORDER BY drawn_at DESC LIMIT 10')
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Cron auto-tirage toutes les 48h à 20h FR
function checkDraw() {
  const now    = new Date()
  const frHour = (now.getUTCHours() + 1) % 24
  const frDay  = now.getUTCDay()
  if (frHour === 20 && now.getUTCMinutes() === 0 && frDay % 2 === 1) {
    query('SELECT amount FROM jackpot WHERE id = 1').then(r => {
      if (r.rows[0]?.amount >= JACKPOT_MIN) {
        const http = require('http')
        http.request({ hostname:'localhost', port:process.env.PORT||3001, path:'/api/jackpot/draw', method:'POST' }).end()
      }
    }).catch(() => {})
  }
}
setInterval(checkDraw, 60 * 1000)

module.exports = router
