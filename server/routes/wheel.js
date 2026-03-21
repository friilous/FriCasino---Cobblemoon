const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')

// ── Segments alignés avec RoueDuJour.jsx ──────────────────────────────────────
// La case mystère (mystery:true) tire sa valeur réelle dans MYSTERY_PRIZES
const SEGMENTS = [
  { label:'500 jetons',    value:500,   weight:30, color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'1 000 jetons',  value:1000,  weight:22, color:'#78c850', rarity:'Commun',     icon:'💚' },
  { label:'2 000 jetons',  value:2000,  weight:14, color:'#f0b429', rarity:'Peu commun', icon:'💛' },
  { label:'3 000 jetons',  value:3000,  weight:9,  color:'#f85888', rarity:'Rare',       icon:'❤️' },
  { label:'5 000 jetons',  value:5000,  weight:5,  color:'#a855f7', rarity:'Épique',     icon:'💜' },
  { label:'10 000 jetons', value:10000, weight:2,  color:'#ff4444', rarity:'Légendaire', icon:'🔴' },
  { label:'❓ Mystère',    value:-1,    weight:1,  color:'#ffd700', rarity:'Mystère ✨',  icon:'❓', mystery:true },
]

// Tirage interne de la case mystère
// 20k = fréquent dans le mystère (~90%), 30k = rare (~9%), 50k = ultra rare (~1%)
const MYSTERY_PRIZES = [
  { value:20000, weight:90, rarity:'Rare',        label:'20 000 jetons' },
  { value:30000, weight:9,  rarity:'Très rare',   label:'30 000 jetons' },
  { value:50000, weight:1,  rarity:'Ultra rare 🌟',label:'50 000 jetons' },
]
const MYSTERY_TOTAL = MYSTERY_PRIZES.reduce((s, p) => s + p.weight, 0)

function spinMystery() {
  let r = Math.random() * MYSTERY_TOTAL
  for (const p of MYSTERY_PRIZES) { r -= p.weight; if (r <= 0) return p }
  return MYSTERY_PRIZES[0]
}

const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0)

function spin() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const seg of SEGMENTS) { r -= seg.weight; if (r <= 0) return seg }
  return SEGMENTS[0]
}

// ── Init table ────────────────────────────────────────────────────────────────
async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS wheel_spins (
    id        SERIAL  PRIMARY KEY,
    user_id   INTEGER NOT NULL UNIQUE,
    last_spin TEXT    NOT NULL,
    total_won INTEGER NOT NULL DEFAULT 0,
    spins     INTEGER NOT NULL DEFAULT 0
  )`)
}
initTables().catch(console.error)

// ── GET /api/wheel ────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const r   = await query('SELECT * FROM wheel_spins WHERE user_id = $1', [req.user.id])
    const row = r.rows[0]
    if (!row) return res.json({ can_spin:true, next_spin:null, segments:SEGMENTS, total_won:0, spins:0 })

    const lastSpin = new Date(row.last_spin)
    const diff     = Date.now() - lastSpin
    const canSpin  = diff >= 24 * 60 * 60 * 1000
    const nextSpin = canSpin ? null : new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000)
    res.json({ can_spin:canSpin, next_spin:nextSpin, total_won:row.total_won, spins:row.spins, segments:SEGMENTS })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /api/wheel/spin ──────────────────────────────────────────────────────
router.post('/spin', authMiddleware, async (req, res) => {
  try {
    const now = new Date()
    const r   = await query('SELECT * FROM wheel_spins WHERE user_id = $1', [req.user.id])
    const row = r.rows[0]

    // Vérif cooldown 24h
    if (row) {
      const diff = now - new Date(row.last_spin)
      if (diff < 24 * 60 * 60 * 1000) {
        const nextSpin = new Date(new Date(row.last_spin).getTime() + 24 * 60 * 60 * 1000)
        return res.status(429).json({ error:"Déjà utilisé aujourd'hui", next_spin:nextSpin })
      }
    }

    const segment = spin()

    // Si case mystère : tirer la vraie valeur côté serveur
    let mysteryPrize = null
    let actualValue  = segment.value

    if (segment.mystery) {
      mysteryPrize = spinMystery()
      actualValue  = mysteryPrize.value
    }

    // Créditer le joueur
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [actualValue, req.user.id])

    // Mettre à jour / insérer le record de spin
    if (row) {
      await query(
        'UPDATE wheel_spins SET last_spin=$1, total_won=total_won+$2, spins=spins+1 WHERE user_id=$3',
        [now.toISOString(), actualValue, req.user.id]
      )
    } else {
      await query(
        'INSERT INTO wheel_spins (user_id, last_spin, total_won, spins) VALUES ($1,$2,$3,1)',
        [req.user.id, now.toISOString(), actualValue]
      )
    }

    const ur   = await query('SELECT username, balance FROM users WHERE id = $1', [req.user.id])
    const user = ur.rows[0]
    const nextSpin = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Sockets
    if (global.io) {
      global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: user.balance })
      if (actualValue >= 5000) {
        global.io.emit('big_wheel_win', { username: user.username, amount: actualValue })
      }
    }

    res.json({
      segment,                          // segment visuel affiché dans la caisse
      mystery_value: mysteryPrize?.value ?? null,   // valeur réelle si mystère
      mystery_rarity: mysteryPrize?.rarity ?? null,
      balance:   user.balance,
      next_spin: nextSpin,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/wheel/segments ───────────────────────────────────────────────────
router.get('/segments', (req, res) => res.json(SEGMENTS))

module.exports = router
