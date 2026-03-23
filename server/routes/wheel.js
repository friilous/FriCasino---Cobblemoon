const express = require('express')
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')
const { getRankFromWagered } = require('../utils/ranks')

const router = express.Router()

const PRIZES = [
  { amount: 100,   weight: 30 },
  { amount: 250,   weight: 25 },
  { amount: 500,   weight: 18 },
  { amount: 1000,  weight: 12 },
  { amount: 2500,  weight: 8  },
  { amount: 5000,  weight: 4  },
  { amount: 10000, weight: 2  },
  { amount: 50000, weight: 1  },
]
const TOTAL_WEIGHT = PRIZES.reduce((s, p) => s + p.weight, 0)

function pickPrize() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const p of PRIZES) { r -= p.weight; if (r <= 0) return p }
  return PRIZES[0]
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM wheel_spins WHERE user_id = $1`, [req.user.id])
    const row    = result.rows[0]
    const today  = todayStr()
    const canSpin = !row || row.last_spin.slice(0, 10) !== today
    const streak  = row?.streak ?? 0
    res.json({ can_spin: canSpin, last_spin: row?.last_spin, total_won: row?.total_won ?? 0, streak })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const today      = todayStr()
    const spinResult = await query(`SELECT * FROM wheel_spins WHERE user_id = $1`, [req.user.id])
    const row        = spinResult.rows[0]

    if (row && row.last_spin.slice(0, 10) === today) {
      return res.status(400).json({ error: 'Tu as déjà ouvert ton coffre aujourd\'hui. Reviens demain !' })
    }

    // Calcul streak
    let streak = 1
    if (row) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().slice(0, 10)
      streak = row.last_spin.slice(0, 10) === yStr ? (row.streak || 0) + 1 : 1
    }

    // Bonus rang
    const userResult = await query(`SELECT total_wagered, balance FROM users WHERE id = $1`, [req.user.id])
    const userData   = userResult.rows[0]
    const rank       = getRankFromWagered(userData?.total_wagered ?? 0)
    const prize      = pickPrize()

    // Bonus streak 7 jours
    let baseAmount = prize.amount
    if (streak >= 7) baseAmount = Math.floor(baseAmount * 1.5)

    // Bonus rang
    const finalAmount = Math.floor(baseAmount * (rank.bonusWheel ?? 1))
    const nowStr      = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // Upsert spin
    if (row) {
      await query(`
        UPDATE wheel_spins
        SET last_spin = $1, total_won = total_won + $2, spins = spins + 1, streak = $3
        WHERE user_id = $4
      `, [nowStr, finalAmount, streak, req.user.id])
    } else {
      await query(`
        INSERT INTO wheel_spins (user_id, last_spin, total_won, spins, streak)
        VALUES ($1, $2, $3, 1, 1)
      `, [req.user.id, nowStr, finalAmount])
    }

    // Crédit joueur
    await query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [finalAmount, req.user.id])
    await query(`INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, 'credit', $2, $3)`,
      [req.user.id, finalAmount, `Coffre du Jour · ${streak} jour(s) d'affilée`])

    const balResult = await query(`SELECT balance FROM users WHERE id = $1`, [req.user.id])
    const newBalance = balResult.rows[0]?.balance

    if (global.io) global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: newBalance })

    res.json({ won: finalAmount, base: baseAmount, bonus_rank: rank.bonusWheel, streak, balance: newBalance })
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
})

module.exports = router
