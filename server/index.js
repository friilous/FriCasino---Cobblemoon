require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { initDB } = require('./db')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

global.io = io

app.use(cors())
app.use(express.json())

app.use('/api/auth',    require('./routes/auth'))
app.use('/api/admin',   require('./routes/admin'))
app.use('/api/games',   require('./routes/games'))
app.use('/api/wallet',  require('./routes/wallet'))
app.use('/api/jackpot', require('./routes/jackpot'))
app.use('/api/lottery', require('./routes/lottery'))
app.use('/api/wheel',   require('./routes/wheel'))

io.on('connection', (socket) => {
  socket.on('join_user',  (userId) => socket.join(`user_${userId}`))
  socket.on('join_admin', ()       => socket.join('admin'))
  socket.on('disconnect', () => {})
})

const PORT = process.env.PORT || 3001

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🎰 Fri'Casino — Serveur démarré sur http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('❌ Erreur initialisation DB:', err)
    process.exit(1)
  })
