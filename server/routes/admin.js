const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Génère un mot de passe provisoire stylé Pokémon
function generateTempPassword() {
  const prefixes = ['Bulbi', 'Salame', 'Cara', 'Pika', 'Magie', 'Florizarre', 'Reptincel', 'Aquali', 'Noctali', 'Voltali'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

// ── Users ─────────────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', adminMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, is_admin, is_temp_pw, balance, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users.map(u => ({ ...u, is_admin: u.is_admin === 1, is_temp_pw: u.is_temp_pw === 1 })));
});

// POST /api/admin/users — Créer un joueur
router.post('/users', adminMiddleware, (req, res) => {
  const { username, initial_balance = 0 } = req.body;
  if (!username) return res.status(400).json({ error: 'Pseudo requis' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (exists) return res.status(409).json({ error: 'Ce pseudo existe déjà' });

  const tempPw = generateTempPassword();
  const hash = bcrypt.hashSync(tempPw, 10);

  const info = db.prepare(`
    INSERT INTO users (username, password, is_temp_pw, balance) VALUES (?, ?, 1, ?)
  `).run(username.trim().toLowerCase(), hash, Math.max(0, parseInt(initial_balance) || 0));

  if (initial_balance > 0) {
    db.prepare(`INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'credit', ?, ?)`).run(
      info.lastInsertRowid, initial_balance, 'Dépôt initial à la création du compte'
    );
  }

  res.status(201).json({
    id: info.lastInsertRowid,
    username: username.trim().toLowerCase(),
    temp_password: tempPw,
    balance: parseInt(initial_balance) || 0,
    message: `Compte créé ! Envoie ce mot de passe provisoire au joueur : ${tempPw}`,
  });
});

// PUT /api/admin/users/:id/balance — Créditer ou débiter
router.put('/users/:id/balance', adminMiddleware, (req, res) => {
  const { amount, type, description } = req.body; // type: 'credit' | 'debit'
  const userId = parseInt(req.params.id);
  const parsedAmount = parseInt(amount);

  if (!parsedAmount || parsedAmount <= 0) return res.status(400).json({ error: 'Montant invalide' });
  if (!['credit', 'debit'].includes(type)) return res.status(400).json({ error: 'Type invalide (credit ou debit)' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  if (type === 'debit' && user.balance < parsedAmount) {
    return res.status(400).json({ error: 'Solde insuffisant pour ce débit' });
  }

  const newBalance = type === 'credit' ? user.balance + parsedAmount : user.balance - parsedAmount;
  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, userId);
  db.prepare(`INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)`).run(
    userId, type, parsedAmount, description || (type === 'credit' ? 'Crédit admin' : 'Débit admin')
  );

  res.json({ balance: newBalance, message: `Solde mis à jour` });
});

// PUT /api/admin/users/:id/reset-password
router.put('/users/:id/reset-password', adminMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const tempPw = generateTempPassword();
  const hash = bcrypt.hashSync(tempPw, 10);
  db.prepare('UPDATE users SET password = ?, is_temp_pw = 1 WHERE id = ?').run(hash, user.id);

  res.json({ temp_password: tempPw, message: `Envoie ce nouveau mot de passe provisoire : ${tempPw}` });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.is_admin) return res.status(403).json({ error: 'Impossible de supprimer un admin' });
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ message: 'Compte supprimé' });
});

// ── Withdrawals ───────────────────────────────────────────────────────────────

// GET /api/admin/withdrawals
router.get('/withdrawals', adminMiddleware, (req, res) => {
  const withdrawals = db.prepare(`
    SELECT w.*, u.username FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    ORDER BY w.created_at DESC
  `).all();
  res.json(withdrawals);
});

// PUT /api/admin/withdrawals/:id — approuver ou rejeter
router.put('/withdrawals/:id', adminMiddleware, (req, res) => {
  const { action, admin_note } = req.body; // action: 'approve' | 'reject'
  const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(parseInt(req.params.id));
  if (!withdrawal) return res.status(404).json({ error: 'Demande introuvable' });
  if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Demande déjà traitée' });

  if (action === 'approve') {
    db.prepare(`UPDATE withdrawals SET status = 'approved', resolved_at = datetime('now'), admin_note = ? WHERE id = ?`).run(admin_note || null, withdrawal.id);
    db.prepare(`INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'debit', ?, ?)`).run(
      withdrawal.user_id, withdrawal.amount, `Retrait approuvé #${withdrawal.id}`
    );
    res.json({ message: 'Retrait approuvé — pense à verser les Pokédollars en jeu !' });
  } else if (action === 'reject') {
    // Re-crédit le solde
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(withdrawal.user_id);
    db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(user.balance + withdrawal.amount, withdrawal.user_id);
    db.prepare(`UPDATE withdrawals SET status = 'rejected', resolved_at = datetime('now'), admin_note = ? WHERE id = ?`).run(admin_note || null, withdrawal.id);
    db.prepare(`INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'credit', ?, ?)`).run(
      withdrawal.user_id, withdrawal.amount, `Retrait refusé — jetons remboursés #${withdrawal.id}`
    );
    res.json({ message: 'Retrait refusé, jetons remboursés au joueur' });
  } else {
    res.status(400).json({ error: 'Action invalide (approve ou reject)' });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', adminMiddleware, (req, res) => {
  const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get().count;
  const totalBalance = db.prepare('SELECT SUM(balance) as total FROM users WHERE is_admin = 0').get().total || 0;
  const pendingWithdrawals = db.prepare("SELECT COUNT(*) as count, SUM(amount) as total FROM withdrawals WHERE status = 'pending'").get();
  const gamesPlayed = db.prepare('SELECT COUNT(*) as count FROM game_history').get().count;
  const totalBet = db.prepare('SELECT SUM(bet) as total FROM game_history').get().total || 0;
  const totalPayout = db.prepare('SELECT SUM(payout) as total FROM game_history').get().total || 0;
  const recentGames = db.prepare(`
    SELECT gh.*, u.username FROM game_history gh
    JOIN users u ON gh.user_id = u.id
    ORDER BY gh.created_at DESC LIMIT 20
  `).all();

  res.json({
    totalPlayers,
    totalBalance,
    pendingWithdrawals: { count: pendingWithdrawals.count, total: pendingWithdrawals.total || 0 },
    gamesPlayed,
    houseEdge: totalBet > 0 ? (((totalBet - totalPayout) / totalBet) * 100).toFixed(2) : 0,
    recentGames,
  });
});

module.exports = router;
