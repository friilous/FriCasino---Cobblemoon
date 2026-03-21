// ── routes/wheel.js ───────────────────────────────────────────────────────────
// Roue du jour : 1 spin gratuit toutes les 24h
// Segments calibrés : petits gains fréquents, gros gain rare

const express = require('express')
const router  = express.Router()
const { getDB } = require('../db')

const { authMiddleware: verifyToken } = require('../middleware/auth')
}

// Segments de la roue — probabilités = weight / totalWeight
const SEGMENTS = [
  { label: '50 jetons',    value: 50,    weight: 30, color: '#6890f0', type: 'tokens' },
  { label: '100 jetons',   value: 100,   weight: 25, color: '#78c850', type: 'tokens' },
  { label: '200 jetons',   value: 200,   weight: 18, color: '#f0b429', type: 'tokens' },
  { label: '500 jetons',   value: 500,   weight: 12, color: '#f85888', type: 'tokens' },
  { label: '1 000 jetons', value: 1000,  weight: 8,  color: '#a855f7', type: 'tokens' },
  { label: '2 000 jetons', value: 2000,  weight: 4,  color: '#f0b429', type: 'tokens' },
  { label: '5 000 jetons', value: 5000,  weight: 2,  color: '#f0c040', type: 'tokens' },
  { label: '10 000 jetons',value: 10000, weight: 1,  color: '#ff4444', type: 'tokens' },
]

const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0)

function spin() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const seg of SEGMENTS) {
    r -= seg.weight
    if (r <= 0) return seg
  }
  return SEGMENTS[0]
}

// ── Init table ────────────────────────────────────────────────────────────────
async function initWheelTable() {
  const db = getDB()
  await db.run(`CREATE TABLE IF NOT EXISTS wheel_spins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE,
    last_spin  DATETIME NOT NULL,
    total_won  INTEGER NOT NULL DEFAULT 0,
    spins      INTEGER NOT NULL DEFAULT 0
  )`)
}
initWheelTable().catch(console.error)

// ── GET /api/wheel — état du joueur (peut-il jouer ?) ─────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const db  = getDB()
    const row = await db.get('SELECT * FROM wheel_spins WHERE user_id = ?', [req.user.id])
    const now = new Date()

    if (!row) {
      return res.json({ can_spin: true, next_spin: null, segments: SEGMENTS })
    }

    const lastSpin = new Date(row.last_spin)
    const diff     = now - lastSpin          // ms
    const cooldown = 24 * 60 * 60 * 1000    // 24h
    const canSpin  = diff >= cooldown
    const nextSpin = canSpin ? null : new Date(lastSpin.getTime() + cooldown)

    res.json({
      can_spin:  canSpin,
      next_spin: nextSpin,
      total_won: row.total_won,
      spins:     row.spins,
      segments:  SEGMENTS,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/wheel/spin — faire tourner la roue ──────────────────────────────
router.post('/spin', verifyToken, async (req, res) => {
  try {
    const db  = getDB()
    const now = new Date()
    const row = await db.get('SELECT * FROM wheel_spins WHERE user_id = ?', [req.user.id])

    // Vérifier le cooldown
    if (row) {
      const lastSpin = new Date(row.last_spin)
      const diff     = now - lastSpin
      if (diff < 24 * 60 * 60 * 1000) {
        const nextSpin = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000)
        return res.status(429).json({
          error:     'Déjà utilisé aujourd\'hui',
          next_spin: nextSpin,
        })
      }
    }

    // Tirer le segment
    const result = spin()

    // Créditer le joueur
    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [result.value, req.user.id])

    // Enregistrer le spin
    if (row) {
      await db.run('UPDATE wheel_spins SET last_spin = ?, total_won = total_won + ?, spins = spins + 1 WHERE user_id = ?',
        [now.toISOString(), result.value, req.user.id])
    } else {
      await db.run('INSERT INTO wheel_spins (user_id, last_spin, total_won, spins) VALUES (?,?,?,1)',
        [req.user.id, now.toISOString(), result.value])
    }

    const user     = await db.get('SELECT username, balance FROM users WHERE id = ?', [req.user.id])
    const nextSpin = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Notif balance live
    if (global.io) {
      global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: user.balance })
      // Annoncer si gros gain (>= 2000)
      if (result.value >= 2000) {
        global.io.emit('big_wheel_win', { username: user.username, amount: result.value })
      }
    }

    res.json({
      segment:   result,
      balance:   user.balance,
      next_spin: nextSpin,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/wheel/segments — liste publique des segments ─────────────────────
router.get('/segments', (req, res) => res.json(SEGMENTS))

module.exports = router
