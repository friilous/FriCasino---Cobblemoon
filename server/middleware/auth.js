const jwt = require('jsonwebtoken');
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Token manquant' });
  const token = header.split(' ')[1];
  try { const payload = jwt.verify(token, process.env.JWT_SECRET); req.user = payload; next(); }
  catch { return res.status(401).json({ error: 'Token invalide ou expiré' }); }
}
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => { if (!req.user.is_admin) return res.status(403).json({ error: 'Accès réservé aux admins' }); next(); });
}
module.exports = { authMiddleware, adminMiddleware };
