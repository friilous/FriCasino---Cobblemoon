// ── routes/jackpot.js ─────────────────────────────────────────────────────────
// Jackpot progressif : 2% de chaque mise → cagnotte
// Tirage automatique toutes les 48h à 20h (heure FR)
// Gagnant reçoit 80%, 20% reporté sur le prochain jackpot
// Minimum jackpot = 5 000 jetons avant de pouvoir tomber

const express = require('express')
const router  = express.Router()
const { getDB } = require('../db')

const { authMiddleware: verifyToken } = require('../middleware/auth')
}

const JACKPOT_CONTRIB  = 0.05   // 5% de chaque mise
const JACKPOT_MIN      = 5000   // minimum pour déclencher
const JACKPOT_WINNER   = 0.80   // 80% au gagnant
const JACKPOT_CARRY    = 0.20   // 20% reporté

// ── Initialiser les tables ────────────────────────────────────────────────────
async function initJackpotTables() {
  const db = getDB()
  await db.run(`CREATE TABLE IF NOT EXISTS jackpot (
    id        INTEGER PRIMARY KEY,
    amount    INTEGER NOT NULL DEFAULT 5000,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  await db.run(`CREATE TABLE IF NOT EXISTS jackpot_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    winner      TEXT NOT NULL,
    amount_won  INTEGER NOT NULL,
    carried     INTEGER NOT NULL,
    total_pot   INTEGER NOT NULL,
    drawn_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  // Seed initial si vide
  const row = await db.get('SELECT id FROM jackpot WHERE id = 1')
  if (!row) await db.run('INSERT INTO jackpot (id, amount) VALUES (1, 5000)')
}
initJackpotTables().catch(console.error)

// ── GET /api/jackpot — montant actuel ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db  = getDB()
    const row = await db.get('SELECT amount, updated_at FROM jackpot WHERE id = 1')
    res.json({ amount: row?.amount ?? 5000, updated_at: row?.updated_at })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/jackpot/contribute — appelé par games route à chaque mise ───────
// body: { bet: number }
router.post('/contribute', async (req, res) => {
  const { bet } = req.body
  if (!bet || bet <= 0) return res.json({ ok: true })
  try {
    const db     = getDB()
    const contrib = Math.floor(bet * JACKPOT_CONTRIB)
    await db.run('UPDATE jackpot SET amount = amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [contrib])
    const row = await db.get('SELECT amount FROM jackpot WHERE id = 1')
    // Émettre mise à jour live via socket
    if (global.io && contrib > 0) {
      global.io.emit('jackpot_update', { amount: row.amount })
    }
    res.json({ amount: row.amount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/jackpot/draw — tirage (appelé par le cron ou admin) ─────────────
router.post('/draw', async (req, res) => {
  try {
    const db  = getDB()
    const row = await db.get('SELECT amount FROM jackpot WHERE id = 1')
    const pot = row?.amount ?? 0

    if (pot < JACKPOT_MIN) {
      return res.status(400).json({ error: `Jackpot insuffisant (${pot} < ${JACKPOT_MIN})` })
    }

    // Choisir un gagnant parmi les joueurs actifs des 48h
    const winner = await db.get(`
      SELECT u.username FROM bets b
      JOIN users u ON u.id = b.user_id
      WHERE b.created_at > datetime('now', '-48 hours')
      ORDER BY RANDOM()
      LIMIT 1
    `)

    if (!winner) return res.status(400).json({ error: 'Aucun joueur actif récemment' })

    const amountWon = Math.floor(pot * JACKPOT_WINNER)
    const carried   = pot - amountWon

    // Créditer le gagnant
    await db.run('UPDATE users SET balance = balance + ? WHERE username = ?', [amountWon, winner.username])
    // Reset jackpot avec le montant reporté
    await db.run('UPDATE jackpot SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [Math.max(carried, JACKPOT_MIN)])
    // Historique
    await db.run('INSERT INTO jackpot_history (winner, amount_won, carried, total_pot) VALUES (?,?,?,?)',
      [winner.username, amountWon, carried, pot])

    // Notifier le gagnant + annonce globale
    if (global.io) {
      global.io.emit('jackpot_won', {
        winner:    winner.username,
        amount:    amountWon,
        new_pot:   Math.max(carried, JACKPOT_MIN),
      })
    }

    res.json({ winner: winner.username, amountWon, carried, pot })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/jackpot/history ──────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const db   = getDB()
    const rows = await db.all('SELECT * FROM jackpot_history ORDER BY drawn_at DESC LIMIT 10')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Cron interne : vérifier s'il faut tirer (appelé toutes les minutes) ────────
// Tirage tous les 2 jours à 20h heure FR (UTC+1/+2)
function checkJackpotDraw() {
  const now  = new Date()
  // Heure FR = UTC+1 en hiver, UTC+2 en été
  const frHour = (now.getUTCHours() + 1) % 24
  const frDay  = now.getUTCDay() // 0=dim, 1=lun...
  // Tirage les jours pairs (lun, mer, ven) à 20h00
  const isDrawTime = frHour === 20 && now.getUTCMinutes() === 0 && frDay % 2 === 1
  if (!isDrawTime) return

  const db = getDB()
  db.get('SELECT amount FROM jackpot WHERE id = 1').then(row => {
    if (row && row.amount >= JACKPOT_MIN) {
      console.log('🎰 Jackpot draw automatique...')
      // Simuler un appel interne
      const http = require('http')
      const options = { hostname: 'localhost', port: process.env.PORT || 3001, path: '/api/jackpot/draw', method: 'POST', headers: { 'Content-Type': 'application/json' } }
      const req = http.request(options)
      req.end()
    }
  })
}
setInterval(checkJackpotDraw, 60 * 1000) // vérifier chaque minute

module.exports = router
