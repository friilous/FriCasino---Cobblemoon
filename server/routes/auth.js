const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ error: 'Pseudo et mot de passe requis' })

    const result = await query(
      `SELECT * FROM users WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    )
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects' })

    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' })

    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin === 1, is_temp_pw: user.is_temp_pw === 1 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id:         user.id,
        username:   user.username,
        is_admin:   user.is_admin === 1,
        is_temp_pw: user.is_temp_pw === 1,
        balance:    user.balance,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' })

    const hash = bcrypt.hashSync(newPassword, 10)
    await query(`UPDATE users SET password = $1, is_temp_pw = 0 WHERE id = $2`, [hash, req.user.id])

    const result = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = result.rows[0]
    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin === 1, is_temp_pw: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, message: 'Mot de passe mis à jour' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, is_admin, is_temp_pw, balance, created_at FROM users WHERE id = $1`,
      [req.user.id]
    )
    const user = result.rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json({ ...user, is_admin: user.is_admin === 1, is_temp_pw: user.is_temp_pw === 1 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
