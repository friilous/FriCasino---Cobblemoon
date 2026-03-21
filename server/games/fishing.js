const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')

// ── Table des résultats ───────────────────────────────────────────────────────
const RESULTS = [
  {
    id:         'trash',
    label:      'Vieille Chaussure',
    rarity:     'Déchet',
    rarityColor:'#6b7280',
    dex:        568,   // Trubbish
    weight:     35.2,
    multiplier: 0,
    isTrash:    true,
  },
  {
    id:         'common',
    label:      'Magicarpe',
    rarity:     'Commun',
    rarityColor:'#6890f0',
    dex:        129,
    weight:     30,
    multiplier: 1.8,
  },
  {
    id:         'uncommon',
    label:      'Poissoroy',
    rarity:     'Peu commun',
    rarityColor:'#78c850',
    dex:        119,
    weight:     18,
    multiplier: 3,
  },
  {
    id:         'rare',
    label:      'Clamiral',
    rarity:     'Rare',
    rarityColor:'#f85888',
    dex:        91,
    weight:     10,
    multiplier: 6,
  },
  {
    id:         'epic',
    label:      'Léviator',
    rarity:     'Épique',
    rarityColor:'#a855f7',
    dex:        130,
    weight:     5,
    multiplier: 15,
  },
  {
    id:         'legendary',
    label:      'Kyogre',
    rarity:     'Légendaire',
    rarityColor:'#f0b429',
    dex:        382,
    weight:     1.5,
    multiplier: 30,
  },
  {
    id:         'shiny',
    label:      'Shiny !',
    rarity:     'Shiny ✨',
    rarityColor:'#ff80ff',
    dex:        null,  // aléatoire parmi les non-trash
    weight:     0.3,
    multiplier: 75,
    isShiny:    true,
  },
]

const SHINY_POOL = [129, 119, 91, 130, 382]  // Pokémon pouvant être shiny
const TOTAL_WEIGHT = RESULTS.reduce((s, r) => s + r.weight, 0)

function spin() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const res of RESULTS) {
    r -= res.weight
    if (r <= 0) {
      // Si shiny, choisir un Pokémon aléatoire de la pool
      if (res.isShiny) {
        const dex = SHINY_POOL[Math.floor(Math.random() * SHINY_POOL.length)]
        return { ...res, dex }
      }
      return { ...res }
    }
  }
  return RESULTS[0]
}

// ── Init tables ───────────────────────────────────────────────────────────────
async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS fishing_history (
    id         SERIAL  PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    username   TEXT    NOT NULL,
    bet        INTEGER NOT NULL,
    lines      INTEGER NOT NULL DEFAULT 1,
    results    TEXT    NOT NULL,
    total_payout INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)
}
initTables().catch(console.error)

// ── GET /api/fishing/info ─────────────────────────────────────────────────────
router.get('/info', (req, res) => {
  res.json({ results: RESULTS, total_weight: TOTAL_WEIGHT })
})

// ── POST /api/fishing/cast ────────────────────────────────────────────────────
// body: { bet, lines }  — lines = 1, 2 ou 3
router.post('/cast', authMiddleware, async (req, res) => {
  try {
    const bet   = parseInt(req.body.bet)
    const lines = Math.min(Math.max(parseInt(req.body.lines) || 1, 1), 3)

    if (!bet || bet < 10)  return res.status(400).json({ error: 'Mise minimum 10 jetons' })
    if (bet > 10000)       return res.status(400).json({ error: 'Mise maximum 10 000 jetons' })

    const ur   = await query('SELECT * FROM users WHERE id = $1', [req.user.id])
    const user = ur.rows[0]
    const totalBet = bet * lines

    if (user.balance < totalBet)
      return res.status(400).json({ error: 'Solde insuffisant' })

    // Lancer chaque ligne indépendamment
    const lineResults = Array.from({ length: lines }, () => spin())
    const totalPayout = lineResults.reduce((s, r) => s + Math.floor(bet * r.multiplier), 0)
    const newBalance  = user.balance - totalBet + totalPayout

    await query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, user.id])
    await query(
      `INSERT INTO fishing_history (user_id, username, bet, lines, results, total_payout)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.username, bet, lines, JSON.stringify(lineResults.map(r => ({ id: r.id, dex: r.dex, payout: Math.floor(bet * r.multiplier) }))), totalPayout]
    )

    // Contribution SuperJackpot (2-4%)
    try {
      const pct    = (2 + Math.floor(Math.random() * 3)) / 100
      const contrib = Math.max(1, Math.floor(totalBet * pct))
      await query(
        `UPDATE superjackpot SET amount = amount + $1, updated_at = to_char(now(),'YYYY-MM-DD HH24:MI:SS') WHERE id = 1`,
        [contrib]
      )
      const sj = await query('SELECT amount FROM superjackpot WHERE id = 1')
      if (global.io) global.io.emit('superjackpot_update', { amount: sj.rows[0]?.amount })
    } catch {}

    // Emit live feed si gros gain
    if (totalPayout >= totalBet * 5) {
      try {
        await query(
          `INSERT INTO live_feed (username, game, bet, payout, multiplier) VALUES ($1,'fishing',$2,$3,$4)`,
          [user.username, totalBet, totalPayout, totalPayout / totalBet]
        )
        if (global.io) global.io.emit('live_feed', {
          username: user.username, game: 'fishing',
          bet: totalBet, payout: totalPayout,
          multiplier: parseFloat((totalPayout / totalBet).toFixed(2)),
          timestamp: new Date().toISOString(),
        })
      } catch {}
    }

    if (global.io) global.io.to(`user_${user.id}`).emit('balance_update', { balance: newBalance })

    res.json({
      lines:        lineResults.map((r, i) => ({
        ...r,
        bet,
        payout: Math.floor(bet * r.multiplier),
        index:  i,
      })),
      totalBet,
      totalPayout,
      balance:      newBalance,
    })
  } catch (err) {
    console.error('Fishing error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/fishing/history ──────────────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const r = await query(
      `SELECT fh.*, u.username FROM fishing_history fh
       JOIN users u ON u.id = fh.user_id
       WHERE fh.user_id = $1
       ORDER BY fh.created_at DESC LIMIT 20`,
      [req.user.id]
    )
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
