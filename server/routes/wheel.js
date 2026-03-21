const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const SEGMENTS = [
  { label:'500',    value:500,   weight:32, color:'#6890f0', rarity:'Commun'    },
  { label:'750',    value:750,   weight:24, color:'#78c850', rarity:'Commun'    },
  { label:'1 000',  value:1000,  weight:16, color:'#f0b429', rarity:'Peu commun'},
  { label:'1 500',  value:1500,  weight:10, color:'#f85888', rarity:'Peu commun'},
  { label:'2 000',  value:2000,  weight:8,  color:'#a855f7', rarity:'Rare'      },
  { label:'3 000',  value:3000,  weight:5,  color:'#f0b429', rarity:'Rare'      },
  { label:'5 000',  value:5000,  weight:3,  color:'#f0c040', rarity:'Épique'    },
  { label:'10 000', value:10000, weight:1,  color:'#ff6b35', rarity:'Légendaire'},
  { label:'20 000', value:20000, weight:.5, color:'#ff4444', rarity:'Mythique'  },
  { label:'50 000', value:50000, weight:.1, color:'#ff0080', rarity:'???'       },
]
const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0)

function spin() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const seg of SEGMENTS) { r -= seg.weight; if (r <= 0) return seg }
  return SEGMENTS[0]
}

async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS wheel_spins (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER NOT NULL UNIQUE,
    last_spin TEXT NOT NULL,
    total_won INTEGER NOT NULL DEFAULT 0,
    spins     INTEGER NOT NULL DEFAULT 0
  )`)
}
initTables().catch(console.error)

// GET /api/wheel
router.get('/', authMiddleware, async (req, res) => {
  try {
    const r   = await query('SELECT * FROM wheel_spins WHERE user_id = $1', [req.user.id])
    const row = r.rows[0]
    if (!row) return res.json({ can_spin: true, next_spin: null, segments: SEGMENTS, total_won: 0, spins: 0 })

    const lastSpin = new Date(row.last_spin)
    const diff     = Date.now() - lastSpin
    const canSpin  = diff >= 24 * 60 * 60 * 1000
    const nextSpin = canSpin ? null : new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000)
    res.json({ can_spin: canSpin, next_spin: nextSpin, total_won: row.total_won, spins: row.spins, segments: SEGMENTS })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/wheel/spin
router.post('/spin', authMiddleware, async (req, res) => {
  try {
    const now = new Date()
    const r   = await query('SELECT * FROM wheel_spins WHERE user_id = $1', [req.user.id])
    const row = r.rows[0]

    if (row) {
      const diff = now - new Date(row.last_spin)
      if (diff < 24 * 60 * 60 * 1000) {
        const nextSpin = new Date(new Date(row.last_spin).getTime() + 24 * 60 * 60 * 1000)
        return res.status(429).json({ error: "Déjà utilisé aujourd'hui", next_spin: nextSpin })
      }
    }

    const result = spin()
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [result.value, req.user.id])

    if (row) {
      await query('UPDATE wheel_spins SET last_spin = $1, total_won = total_won + $2, spins = spins + 1 WHERE user_id = $3',
        [now.toISOString(), result.value, req.user.id])
    } else {
      await query('INSERT INTO wheel_spins (user_id, last_spin, total_won, spins) VALUES ($1,$2,$3,1)',
        [req.user.id, now.toISOString(), result.value])
    }

    const ur   = await query('SELECT username, balance FROM users WHERE id = $1', [req.user.id])
    const user = ur.rows[0]
    const nextSpin = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    if (global.io) {
      global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: user.balance })
      if (result.value >= 5000) global.io.emit('big_wheel_win', { username: user.username, amount: result.value })
    }
    res.json({ segment: result, balance: user.balance, next_spin: nextSpin })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/wheel/segments
router.get('/segments', (req, res) => res.json(SEGMENTS))

module.exports = router
