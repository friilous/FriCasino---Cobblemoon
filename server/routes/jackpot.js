const express = require('express')
const router  = express.Router()
const { getDB } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const JACKPOT_CONTRIB = 0.05
const JACKPOT_MIN     = 5000
const JACKPOT_WINNER  = 0.80

async function initTables() {
  const db = getDB()
  await db.run(`CREATE TABLE IF NOT EXISTS jackpot (
    id INTEGER PRIMARY KEY, amount INTEGER NOT NULL DEFAULT 5000,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  await db.run(`CREATE TABLE IF NOT EXISTS jackpot_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, winner TEXT NOT NULL,
    amount_won INTEGER NOT NULL, carried INTEGER NOT NULL,
    total_pot INTEGER NOT NULL, drawn_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  const row = await db.get('SELECT id FROM jackpot WHERE id = 1')
  if (!row) await db.run('INSERT INTO jackpot (id, amount) VALUES (1, 5000)')
}
initTables().catch(console.error)

router.get('/', async (req, res) => {
  try {
    const db  = getDB()
    const row = await db.get('SELECT amount, updated_at FROM jackpot WHERE id = 1')
    res.json({ amount: row?.amount ?? 5000, updated_at: row?.updated_at })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/contribute', async (req, res) => {
  const { bet } = req.body
  if (!bet || bet <= 0) return res.json({ ok: true })
  try {
    const db     = getDB()
    const contrib = Math.floor(bet * JACKPOT_CONTRIB)
    await db.run('UPDATE jackpot SET amount = amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [contrib])
    const row = await db.get('SELECT amount FROM jackpot WHERE id = 1')
    if (global.io) global.io.emit('jackpot_update', { amount: row.amount })
    res.json({ amount: row.amount })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/draw', async (req, res) => {
  try {
    const db  = getDB()
    const row = await db.get('SELECT amount FROM jackpot WHERE id = 1')
    const pot = row?.amount ?? 0
    if (pot < JACKPOT_MIN) return res.status(400).json({ error: `Jackpot insuffisant (${pot})` })

    const winner = await db.get(`
      SELECT u.username FROM bets b
      JOIN users u ON u.id = b.user_id
      WHERE b.created_at > datetime('now', '-48 hours')
      ORDER BY RANDOM() LIMIT 1
    `)
    if (!winner) return res.status(400).json({ error: 'Aucun joueur actif' })

    const amountWon = Math.floor(pot * JACKPOT_WINNER)
    const carried   = Math.max(pot - amountWon, JACKPOT_MIN)
    await db.run('UPDATE users SET balance = balance + ? WHERE username = ?', [amountWon, winner.username])
    await db.run('UPDATE jackpot SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [carried])
    await db.run('INSERT INTO jackpot_history (winner, amount_won, carried, total_pot) VALUES (?,?,?,?)',
      [winner.username, amountWon, carried, pot])

    if (global.io) global.io.emit('jackpot_won', { winner: winner.username, amount: amountWon, new_pot: carried })
    res.json({ winner: winner.username, amountWon, carried, pot })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/history', async (req, res) => {
  try {
    const db   = getDB()
    const rows = await db.all('SELECT * FROM jackpot_history ORDER BY drawn_at DESC LIMIT 10')
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

function checkDraw() {
  const now    = new Date()
  const frHour = (now.getUTCHours() + 1) % 24
  const frDay  = now.getUTCDay()
  if (frHour === 20 && now.getUTCMinutes() === 0 && frDay % 2 === 1) {
    const db = getDB()
    db.get('SELECT amount FROM jackpot WHERE id = 1').then(row => {
      if (row && row.amount >= JACKPOT_MIN) {
        const http = require('http')
        http.request({ hostname:'localhost', port:process.env.PORT||3001, path:'/api/jackpot/draw', method:'POST' }).end()
      }
    })
  }
}
setInterval(checkDraw, 60 * 1000)

module.exports = router
