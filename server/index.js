require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Initialiser la BDD avant les routes
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Rendre io accessible globalement (pour les routes)
global.io = io;

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());




app.delete('/api/admin/clear-history', (req, res) => {
  db.prepare('DELETE FROM game_history').run()
  db.prepare('DELETE FROM live_feed').run()
  res.json({ ok: true })
})





// ── Routes API ────────────────────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/admin',  require('./routes/admin'));
app.use('/api/games',  require('./routes/games'));
app.use('/api/wallet', require('./routes/wallet'));

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  // Un client peut rejoindre une room par son user id (pour les updates de balance)
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });

  // Les admins rejoignent la room admin
  socket.on('join_admin', () => {
    socket.join('admin');
  });

  socket.on('disconnect', () => {});
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🎰 Fri'Casino — Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📋 Panel Admin → http://localhost:5173/admin\n`);
});
