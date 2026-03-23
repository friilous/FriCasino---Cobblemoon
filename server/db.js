const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function query(sql, params = []) {
  const client = await pool.connect()
  try {
    return await client.query(sql, params)
  } finally {
    client.release()
  }
}

async function initDB() {
  // ── Tables existantes (inchangées) ────────────────────────────────────────
  await query(`CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    is_temp_pw  INTEGER NOT NULL DEFAULT 1,
    balance     INTEGER NOT NULL DEFAULT 0,
    is_admin    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)

  await query(`CREATE TABLE IF NOT EXISTS transactions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    type        TEXT    NOT NULL,
    amount      INTEGER NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)

  await query(`CREATE TABLE IF NOT EXISTS withdrawals (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    amount       INTEGER NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'pending',
    admin_note   TEXT,
    created_at   TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    resolved_at  TEXT
  )`)

  await query(`CREATE TABLE IF NOT EXISTS game_history (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    game       TEXT    NOT NULL,
    bet        INTEGER NOT NULL,
    payout     INTEGER NOT NULL,
    meta       TEXT,
    created_at TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)

  await query(`CREATE TABLE IF NOT EXISTS live_feed (
    id         SERIAL PRIMARY KEY,
    username   TEXT    NOT NULL,
    game       TEXT    NOT NULL,
    bet        INTEGER NOT NULL,
    payout     INTEGER NOT NULL,
    multiplier REAL    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)

  await query(`CREATE TABLE IF NOT EXISTS game_settings (
    game    TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1
  )`)

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

  await query(`CREATE TABLE IF NOT EXISTS wheel_spins (
    id        SERIAL  PRIMARY KEY,
    user_id   INTEGER NOT NULL UNIQUE,
    last_spin TEXT    NOT NULL,
    total_won INTEGER NOT NULL DEFAULT 0,
    spins     INTEGER NOT NULL DEFAULT 0,
    streak    INTEGER NOT NULL DEFAULT 0,
    last_streak_bonus TEXT
  )`)

  await query(`CREATE TABLE IF NOT EXISTS nextleg_users (
    id          SERIAL PRIMARY KEY,
    uid         TEXT    NOT NULL UNIQUE,
    player      TEXT    NOT NULL,
    alias       TEXT    NOT NULL DEFAULT '',
    version     TEXT    NOT NULL DEFAULT '',
    first_seen  TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    last_seen   TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    ping_count  INTEGER NOT NULL DEFAULT 1,
    note        TEXT    NOT NULL DEFAULT ''
  )`)

  // ── NOUVELLES tables (refonte) ────────────────────────────────────────────

  // Chat du casino
  await query(`CREATE TABLE IF NOT EXISTS casino_chat (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    username   TEXT    NOT NULL,
    rank_icon  TEXT    NOT NULL DEFAULT '🔴',
    rank_color TEXT    NOT NULL DEFAULT '#9CA3AF',
    message    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )`)

  // Badges débloqués
  await query(`CREATE TABLE IF NOT EXISTS user_badges (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    badge_id    TEXT    NOT NULL,
    unlocked_at TEXT    NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    UNIQUE(user_id, badge_id)
  )`)

  // ── Migrations — ajout de colonnes si elles n'existent pas ───────────────
  // total_wagered pour les rangs
  try {
    await query(`ALTER TABLE users ADD COLUMN total_wagered INTEGER NOT NULL DEFAULT 0`)
    console.log('✅ Colonne total_wagered ajoutée')
  } catch (e) {
    if (!e.message.includes('already exists')) console.error('total_wagered:', e.message)
  }

  // rank_id
  try {
    await query(`ALTER TABLE users ADD COLUMN rank_id INTEGER NOT NULL DEFAULT 1`)
    console.log('✅ Colonne rank_id ajoutée')
  } catch (e) {
    if (!e.message.includes('already exists')) console.error('rank_id:', e.message)
  }

  // ── Seed game_settings (sans Crash) ──────────────────────────────────────
  const GAMES = ['slots', 'roulette', 'blackjack', 'mines', 'plinko']
  for (const game of GAMES) {
    await query(`
      INSERT INTO game_settings (game, enabled) VALUES ($1, 1)
      ON CONFLICT (game) DO NOTHING
    `, [game])
  }

  // ── Seed superjackpot ─────────────────────────────────────────────────────
  const sjRow = await query('SELECT id FROM superjackpot WHERE id = 1')
  if (sjRow.rows.length === 0) {
    await query('INSERT INTO superjackpot (id, amount) VALUES (1, 5000)')
  }

  // ── Seed admin ────────────────────────────────────────────────────────────
  const check = await query(`SELECT id FROM users WHERE username = $1`, ['frilous'])
  if (check.rows.length === 0) {
    const hash = bcrypt.hashSync('Admin123!', 10)
    await query(
      `INSERT INTO users (username, password, is_temp_pw, is_admin, total_wagered, rank_id) VALUES ($1, $2, 1, 1, 0, 1)`,
      ['frilous', hash]
    )
    console.log('✅ Compte admin créé — username: frilous | password: Admin123!')
  }

  console.log('✅ Base PostgreSQL prête')
}

module.exports = { query, initDB, pool }
