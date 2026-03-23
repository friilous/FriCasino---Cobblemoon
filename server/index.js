require('dotenv').config()
const express = require('express')
const http    = require('http')
const { Server } = require('socket.io')
const cors    = require('cors')
const { initDB, query } = require('./db')
const { getRankFromWagered } = require('./utils/ranks')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

global.io = io

app.use(cors())
app.use(express.json())

// ── Reset données (admin) ─────────────────────────────────────────────────────
app.post('/api/admin/reset-data', async (req, res) => {
  const { secret } = req.body
  if (secret !== 'frilous-reset-2025') return res.status(403).json({ error: 'Non autorisé' })
  try {
    await query(`TRUNCATE game_history RESTART IDENTITY CASCADE`)
    await query(`TRUNCATE live_feed RESTART IDENTITY CASCADE`)
    await query(`TRUNCATE superjackpot_history RESTART IDENTITY CASCADE`)
    await query(`TRUNCATE wheel_spins RESTART IDENTITY CASCADE`)
    await query(`TRUNCATE casino_chat RESTART IDENTITY CASCADE`)
    await query(`UPDATE superjackpot SET amount = 5000`)
    await query(`UPDATE users SET total_wagered = 0, rank_id = 1`)
    res.json({ ok: true, message: 'Base nettoyée !' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'))
app.use('/api/admin',        require('./routes/admin'))
app.use('/api/games',        require('./routes/games'))
app.use('/api/wallet',       require('./routes/wallet'))
app.use('/api/superjackpot', require('./routes/superjackpot'))
app.use('/api/wheel',        require('./routes/wheel'))
app.use('/api/chat',         require('./routes/chat'))

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_user', (userId) => socket.join(`user_${userId}`))
  socket.on('join_admin', () => socket.join('admin'))

  // Chat — le joueur envoie un message
  socket.on('chat_send', async ({ text, userId, username, rankIcon, rankColor }) => {
    if (!text || !userId) return
    try {
      const msg = {
        userId, username, rankIcon, rankColor,
        text: text.slice(0, 200),
        timestamp: new Date().toISOString(),
      }
      // Persister en BDD
      await query(
        `INSERT INTO casino_chat (user_id, username, rank_icon, rank_color, message) VALUES ($1, $2, $3, $4, $5)`,
        [userId, username, rankIcon || '🔴', rankColor || '#9CA3AF', text.slice(0, 200)]
      )
      // Broadcast à tous
      io.emit('chat_message', msg)
    } catch (err) {
      console.error('Chat error:', err.message)
    }
  })

  socket.on('disconnect', () => {})
})

// ── Helper global : mettre à jour le rang après une mise ──────────────────────
global.updateRankIfNeeded = async function(userId) {
  try {
    const result = await query(`SELECT total_wagered, rank_id FROM users WHERE id = $1`, [userId])
    const user = result.rows[0]
    if (!user) return

    const newRank = getRankFromWagered(user.total_wagered)
    if (newRank.id !== user.rank_id) {
      await query(`UPDATE users SET rank_id = $1 WHERE id = $2`, [newRank.id, userId])
      io.to(`user_${userId}`).emit('rank_up', {
        newRank: { id: newRank.id, name: newRank.name, icon: newRank.icon, color: newRank.color },
      })
    }
  } catch (err) {
    console.error('Rank update error:', err.message)
  }
}

const PORT = process.env.PORT || 3001

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🎰 CobbleMoon Casino — Serveur démarré sur http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('❌ Erreur initialisation DB:', err)
    process.exit(1)
  })
