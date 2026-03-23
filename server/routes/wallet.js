const express = require('express')
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')
const { getRankFromWagered } = require('../utils/ranks')

const router = express.Router()

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const result = await query(`SELECT balance FROM users WHERE id = $1`, [req.user.id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json({ balance: result.rows[0].balance })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const [transactions, withdrawals, games] = await Promise.all([
      query(`SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]),
      query(`SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [req.user.id]),
      query(`SELECT id, CONCAT('#',UPPER(SUBSTRING(game,1,3)),'-',LPAD(id::text,6,'0')) as bet_id, game, bet, payout, payout-bet as profit, meta, created_at FROM game_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [req.user.id]),
    ])
    res.json({ transactions: transactions.rows, withdrawals: withdrawals.rows, games: games.rows })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body
    const parsedAmount = parseInt(amount)
    if (!parsedAmount || parsedAmount <= 0) return res.status(400).json({ error: 'Montant invalide' })

    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = userResult.rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const rank = getRankFromWagered(user.total_wagered || 0)
    if (parsedAmount > rank.maxWithdraw) {
      return res.status(400).json({ error: `Retrait maximum pour ton rang ${rank.name} : ${rank.maxWithdraw.toLocaleString('fr-FR')} jetons` })
    }
    if (user.balance < parsedAmount) return res.status(400).json({ error: 'Solde insuffisant' })
    if (parsedAmount < 100) return res.status(400).json({ error: 'Retrait minimum : 100 jetons' })

    const pending = await query(`SELECT id FROM withdrawals WHERE user_id = $1 AND status = 'pending'`, [req.user.id])
    if (pending.rows.length > 0) return res.status(400).json({ error: 'Tu as déjà une demande de retrait en attente' })

    await query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [parsedAmount, req.user.id])
    const result = await query(`INSERT INTO withdrawals (user_id, amount) VALUES ($1, $2) RETURNING id`, [req.user.id, parsedAmount])
    const newId = result.rows[0].id

    if (global.io) {
      global.io.to('admin').emit('new_withdrawal', { id: newId, username: req.user.username, amount: parsedAmount })
      global.io.to(`user_${req.user.id}`).emit('balance_update', { balance: user.balance - parsedAmount })
    }

    res.status(201).json({ message: "Demande de retrait envoyée ! Frilous va traiter ça dès que possible.", id: newId })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

module.exports = router
