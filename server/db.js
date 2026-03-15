const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

  // Seed admin
  const check = await query(`SELECT id FROM users WHERE username = $1`, ['frilous'])
  if (check.rows.length === 0) {
    const hash = bcrypt.hashSync('Admin123!', 10)
    await query(`INSERT INTO users (username, password, is_temp_pw, is_admin) VALUES ($1, $2, 1, 1)`, ['frilous', hash])
    console.log('✅ Compte admin créé — username: frilous | password: Admin123!')
  }
  console.log('✅ Base PostgreSQL prête')
}

module.exports = { query, initDB, pool }
