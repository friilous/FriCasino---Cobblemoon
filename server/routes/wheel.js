const express = require('express')
const router  = express.Router()
const { getDB } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const SEGMENTS = [
  { label:'50 jetons',    value:50,    weight:30, color:'#6890f0' },
  { label:'100 jetons',   value:100,   weight:25, color:'#78c850' },
  { label:'200 jetons',   value:200,   weight:18, color:'#f0b429' },
  { label:'500 jetons',   value:500,   weight:12, color:'#f85888' },
  { label:'1 000 jetons', value:1000,  weight:8,  color:'#a855f7' },
  { label:'2 000 jetons', value:2000,  weight:4,  color:'#f0b429' },
  { label:'5 000 jetons', value:5000,  weight:2,  color:'#f0c040' },
  { label:'10 000 jetons',value:10000, weight:1,  color:'#ff4444' },
]
const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0)

function spin() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const seg of SEGMENTS) { r -= seg.weight; if (r <= 0) return seg }
  return SEGMENTS[0]
}

async function initTables() {
  const db = getDB()
  await db.run(`CREATE TABLE IF NOT EXISTS wheel_spins (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
    last_spin DATETIME NOT NULL, total_won INTEGER NOT NULL DEFAULT 0,
    spins INTEGER NOT NULL DEFAULT 0
  )`)
}
initTables().catch(console.error)

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db  = getDB()
    const row = await db.get('SELECT * FROM wheel_spins WHERE user_id = ?', [req.user.id])
    if (!row) return res.json({ can_spin: true, next_spin: null, segments: SEGMENTS })

    const lastSpin = new Date(row.last_spin)
    const diff     = Date.now() - lastSpin
    const canSpin  = diff >= 24 * 60 * 60 * 1000
    const nextSpin = canSpin ? null : new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000)
    res.json({ can_spin: canSpin, next_spin: nextSpin, total_won: row.total_won, spins: row.spins, segments: SEGMENTS })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/spin', authMiddleware, async (req, res) => {
  try {
    const db  = getDB()
    const now = new Date()
    const row = await db.get('SELECT * FROM wheel_spins WHERE user_id = ?', [req.user.id])

    if (row) {
      const diff = now - new Date(row.last_spin)
      if (diff < 24 * 60 * 60 * 1000) {
        const nextSpin = new Date(new Date(row.last_spin).getTime() + 24 * 60 * 60 * 1000)
        return res.status(429).json({ error: 'Déjà utilisé aujourd\'hui', next_spin: nextSpin })
      }
    }

    const result = spin()
    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [result.value, req.user.id])

    if (row) {
      await db.run('UPDATE wheel_spins SET last_spin = ?, total_won = total_won + ?, spins = spins + 1 WHERE user_id = ?',
        [now.toISOString(), result.value, req.user.id])
    } else {
      await db.run('INSERT INTO wheel_spins (user_id, last_spin, total_won, spins) VALUES (?,?,?,1)',
        [req.user.id, now.toISOString(), result.value])
    }

    const user     = await db.get('SELECT username, balance FROM users WHERE id = ?', [req.user.id])
    const nextSpin = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    if (global.io) {
      global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: user.balance })
      if (result.value >= 2000) global.io.emit('big_wheel_win', { username: user.username, amount: result.value })
    }
    res.json({ segment: result, balance: user.balance, next_spin: nextSpin })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/segments', (req, res) => res.json(SEGMENTS))

module.exports = router
