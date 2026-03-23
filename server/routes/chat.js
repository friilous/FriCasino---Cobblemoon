const express = require('express')
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// GET /api/chat/history — 50 derniers messages
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, username, rank_icon, rank_color, message,
             created_at as timestamp
      FROM casino_chat
      ORDER BY created_at DESC
      LIMIT 50
    `)
    res.json(result.rows.reverse())
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/chat/:id — admin supprime un message
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Non autorisé' })
    await query(`DELETE FROM casino_chat WHERE id = $1`, [parseInt(req.params.id)])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
