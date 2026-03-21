const express = require('express')
const router  = express.Router()
const { query } = require('../db')

const SUPERJACKPOT_MIN      = 5000   // seed minimum garanti
const SUPERJACKPOT_WINNER   = 0.80   // 80% au gagnant
const ELIGIBILITY_THRESHOLD = 10000  // jetons misés dans les 24h pour être éligible

// Contribution aléatoire 1% à 3%, toujours un entier (pas de virgule)
function randomContrib(bet) {
  const pct = 0.01 + Math.random() * 0.02
  return Math.floor(bet * pct)
}

// ── Init tables ───────────────────────────────────────────────────────────────
async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS superjackpot (
    id         INTEGER PRIMARY KEY DEFAULT 1,
    amount     INTEGER NOT NULL DEFAULT 5000,
    updated_at TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)

  await query(`CREATE TABLE IF NOT EXISTS superjackpot_history (
    id         SERIAL  PRIMARY KEY,
    winner     TEXT    NOT NULL,
    amount_won INTEGER NOT NULL,
    carried    INTEGER NOT NULL,
    total_pot  INTEGER NOT NULL,
    eligible   INTEGER NOT NULL DEFAULT 0,
    drawn_at   TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)

  const row = await query('SELECT id FROM superjackpot WHERE id = 1')
  if (row.rows.length === 0) {
    await query('INSERT INTO superjackpot (id, amount) VALUES (1, $1)', [SUPERJACKPOT_MIN])
  }
}
initTables().catch(console.error)

// ── GET /api/superjackpot ─────────────────────────────────────────────────────
// Retourne montant, nb éligibles, infos pour la bannière
router.get('/', async (req, res) => {
  try {
    const r   = await query('SELECT amount, updated_at FROM superjackpot WHERE id = 1')
    const row = r.rows[0]

    // Nombre de joueurs éligibles (ont misé >= 5000 jetons dans les 24h)
    const er = await query(`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM game_history
      WHERE created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
      GROUP BY user_id
      HAVING SUM(bet) >= $1
    `, [ELIGIBILITY_THRESHOLD])

    // HAVING GROUP BY retourne une ligne par user éligible — on compte les lignes
    const eligibleCount = er.rows.length

    res.json({
      amount:          row?.amount ?? SUPERJACKPOT_MIN,
      updated_at:      row?.updated_at,
      eligible_count:  eligibleCount,
      threshold:       ELIGIBILITY_THRESHOLD,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/superjackpot/mystatus ────────────────────────────────────────────
// Vérifie si l'utilisateur connecté est éligible + combien il a misé aujourd'hui
router.get('/mystatus', async (req, res) => {
  // On lit le token manuellement pour ne pas bloquer les non-connectés
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.json({ eligible: false, bet_today: 0, threshold: ELIGIBILITY_THRESHOLD })

    const jwt = require('jsonwebtoken')
    const token = authHeader.split(' ')[1]
    let userId
    try { userId = jwt.verify(token, process.env.JWT_SECRET).id } catch { return res.json({ eligible: false, bet_today: 0, threshold: ELIGIBILITY_THRESHOLD }) }

    const r = await query(`
      SELECT COALESCE(SUM(bet), 0)::int AS total
      FROM game_history
      WHERE user_id = $1
        AND created_at > to_char(
  date_trunc('day', now()) + interval '20 hours'
  - CASE WHEN extract(hour from now()) >= 20 THEN interval '0' ELSE interval '1 day' END,
  'YYYY-MM-DD HH24:MI:SS'
)
    `, [userId])

    const betToday = r.rows[0]?.total ?? 0
    res.json({
      eligible:   betToday >= ELIGIBILITY_THRESHOLD,
      bet_today:  betToday,
      threshold:  ELIGIBILITY_THRESHOLD,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/superjackpot/history ─────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const r = await query('SELECT * FROM superjackpot_history ORDER BY drawn_at DESC LIMIT 10')
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /api/superjackpot/draw ───────────────────────────────────────────────
// Tirage manuel (appelé aussi par le cron)
router.post('/draw', async (req, res) => {
  try {
    const r   = await query('SELECT amount FROM superjackpot WHERE id = 1')
    const pot = r.rows[0]?.amount ?? 0

    // Trouver les joueurs éligibles (ont misé >= seuil dans les 24h)
    const er = await query(`
      SELECT u.id, u.username, SUM(gh.bet)::int AS total_bet
      FROM game_history gh
      JOIN users u ON u.id = gh.user_id
      WHERE gh.created_at > to_char(now() - interval '24 hours', 'YYYY-MM-DD HH24:MI:SS')
      GROUP BY u.id, u.username
      HAVING SUM(gh.bet) >= $1
    `, [ELIGIBILITY_THRESHOLD])

    const eligible = er.rows
    if (eligible.length === 0) {
      // Pas de gagnant ce soir — on reporte tout + seed
      if (global.io) global.io.emit('superjackpot_no_winner', { pot, message: 'Aucun joueur éligible ce soir — la cagnotte est reportée !' })
      return res.json({ winner: null, message: 'Aucun joueur éligible', pot })
    }

    // Tirage aléatoire pur
    const winner    = eligible[Math.floor(Math.random() * eligible.length)]
    const amountWon = Math.floor(pot * SUPERJACKPOT_WINNER)
    const carried   = Math.max(pot - amountWon, SUPERJACKPOT_MIN)

    await query('UPDATE users SET balance = balance + $1 WHERE id = $2',       [amountWon, winner.id])
    await query('UPDATE superjackpot SET amount = $1, updated_at = to_char(now(),\'YYYY-MM-DD HH24:MI:SS\') WHERE id = 1', [carried])
    await query(
      'INSERT INTO superjackpot_history (winner, amount_won, carried, total_pot, eligible) VALUES ($1,$2,$3,$4,$5)',
      [winner.username, amountWon, carried, pot, eligible.length]
    )

    if (global.io) {
      global.io.emit('superjackpot_won', {
        winner:   winner.username,
        amount:   amountWon,
        new_pot:  carried,
        eligible: eligible.length,
      })
      global.io.to(`user_${winner.id}`).emit('balance_update', {})
    }

    res.json({ winner: winner.username, amountWon, carried, pot, eligible: eligible.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Cron : tirage tous les jours à 20h heure française ───────────────────────
function checkDraw() {
  const now    = new Date()
  const frHour = (now.getUTCHours() + 2) % 24  // UTC+1 approx (pas de gestion DST)
  if (frHour === 20 && now.getUTCMinutes() === 0) {
    query('SELECT amount FROM superjackpot WHERE id = 1').then(r => {
      // On tire toujours, même si la cagnotte est au minimum
      const http = require('http')
      http.request({
        hostname: 'localhost',
        port:     process.env.PORT || 3001,
        path:     '/api/superjackpot/draw',
        method:   'POST',
        headers:  { 'Content-Type': 'application/json' },
      }).end()
    }).catch(() => {})
  }
}
setInterval(checkDraw, 60 * 1000)

module.exports = router
