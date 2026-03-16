import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

// ── Dimensions ────────────────────────────────────────────────────────────────
const CW       = 560          // canvas width
const CH       = 540          // canvas height
const ROWS     = 8
const BUCKETS  = 9
const GAP      = 46           // espace entre picots
const PEG_R    = 6            // rayon picot
const BALL_R   = 9            // rayon bille
const BUCKET_H = 40
const FIRST_Y  = 70           // Y première rangée picots
const BUCKET_Y = FIRST_Y + (ROWS - 1) * GAP + GAP + 6

// ── Physique ──────────────────────────────────────────────────────────────────
const GRAVITY    = 0.35       // accélération par frame
const RESTITUTION = 0.38      // rebond sur picot
const FRICTION   = 0.993      // atténuation vitesse

// ── Multiplicateurs & couleurs ────────────────────────────────────────────────
const MULTIPLIERS = {
  low:    [5.1, 2.5, 1.3, 0.8, 0.5, 0.8, 1.3, 2.5, 5.1],
  medium: [10.1, 4,  1.5, 0.5, 0.3, 0.5, 1.5,  4, 10.1],
  high:   [30.6, 4.3, 1.2, 0.3, 0.2, 0.3, 1.2, 4.3, 30.6],
}

// Types Pokémon pour les buckets, du meilleur au pire (extrêmes=rare/bon)
const BUCKET_TYPES = ['Dragon','Psy','Électrik','Feu','Normal','Feu','Électrik','Psy','Dragon']
const BUCKET_COLORS = [
  '#7038f8','#f85888','#f8d030','#f08030','#a8a878',
  '#f08030','#f8d030','#f85888','#7038f8',
]

const RISK_LABELS = {
  low:    { label: 'Faible', color: '#00c853' },
  medium: { label: 'Moyen',  color: '#f0b429' },
  high:   { label: 'Élevé',  color: '#ff4444' },
}

const BALL_COLORS = ['#f0b429','#60a5fa','#f472b6','#34d399','#fb923c','#a78bfa']

// ── Géométrie ─────────────────────────────────────────────────────────────────
function getPegPos(row, col) {
  const count  = row + 2
  const totalW = (count - 1) * GAP
  const startX = CW / 2 - totalW / 2
  return { x: startX + col * GAP, y: FIRST_Y + row * GAP }
}

function getBucketX(i) {
  const totalW = (BUCKETS - 1) * GAP
  const startX = CW / 2 - totalW / 2
  return startX + i * GAP
}

// Murs gauche/droite basés sur la pyramide
const WALL_LEFT  = CW / 2 - (BUCKETS * GAP) / 2 - 4
const WALL_RIGHT = CW / 2 + (BUCKETS * GAP) / 2 + 4

// ── Rendu canvas ──────────────────────────────────────────────────────────────
function drawPeg(ctx, x, y, hitT) {
  const now   = Date.now()
  const delta = hitT ? now - hitT : Infinity

  // Halo de hit
  if (delta < 800) {
    const pct    = delta / 800
    const expand = (1 - Math.abs(pct * 2 - 1)) * 14
    ctx.beginPath()
    ctx.arc(x, y, PEG_R + expand, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,220,100,${0.25 * (1 - pct)})`
    ctx.fill()
  }

  // Ombre du picot
  ctx.beginPath()
  ctx.arc(x + 1, y + 1.5, PEG_R, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fill()

  // Corps picot (style Poké Ball plate)
  const gr = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, PEG_R)
  gr.addColorStop(0, delta < 300 ? '#ffe066' : '#9090cc')
  gr.addColorStop(0.5, delta < 300 ? '#f0b429' : '#5050aa')
  gr.addColorStop(1, '#1e1e38')
  ctx.beginPath()
  ctx.arc(x, y, PEG_R, 0, Math.PI * 2)
  ctx.fillStyle = gr
  ctx.fill()
  ctx.strokeStyle = delta < 300 ? '#f0b42980' : '#3a3a6a'
  ctx.lineWidth = 1
  ctx.stroke()

  // Reflet
  ctx.beginPath()
  ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fill()
}

function drawBall(ctx, x, y, color, angle) {
  // Ombre
  ctx.beginPath()
  ctx.arc(x + 1.5, y + 2, BALL_R, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fill()

  // Glow
  ctx.shadowColor = color
  ctx.shadowBlur = 14

  // Corps
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  // Demi-haut rouge
  ctx.beginPath()
  ctx.arc(0, 0, BALL_R, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  // Demi-bas blanc
  ctx.beginPath()
  ctx.arc(0, 0, BALL_R, 0, Math.PI)
  ctx.closePath()
  ctx.fillStyle = '#eee'
  ctx.fill()

  // Bande centrale noire
  ctx.fillStyle = '#111'
  ctx.fillRect(-BALL_R, -1.5, BALL_R * 2, 3)

  // Cercle central
  ctx.beginPath()
  ctx.arc(0, 0, BALL_R * 0.32, 0, Math.PI * 2)
  ctx.fillStyle = '#111'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, BALL_R * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#eee'
  ctx.fill()

  // Contour
  ctx.beginPath()
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2)
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 1.2
  ctx.stroke()

  ctx.restore()
  ctx.shadowBlur = 0

  // Reflet
  ctx.beginPath()
  ctx.arc(x - 3, y - 3, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fill()
}

function drawBucket(ctx, i, mults, active) {
  const bx    = getBucketX(i)
  const by    = BUCKET_Y
  const bw    = GAP - 3
  const color = BUCKET_COLORS[i]
  const mult  = mults[i]
  const type  = BUCKET_TYPES[i]

  if (active) { ctx.shadowColor = color; ctx.shadowBlur = 28 }

  // Corps arrondi
  const rx = bx - bw / 2, rr = 7
  ctx.beginPath()
  ctx.moveTo(rx + rr, by)
  ctx.lineTo(rx + bw - rr, by)
  ctx.arcTo(rx+bw, by, rx+bw, by+rr, rr)
  ctx.lineTo(rx+bw, by+BUCKET_H-rr)
  ctx.arcTo(rx+bw, by+BUCKET_H, rx+bw-rr, by+BUCKET_H, rr)
  ctx.lineTo(rx+rr, by+BUCKET_H)
  ctx.arcTo(rx, by+BUCKET_H, rx, by+BUCKET_H-rr, rr)
  ctx.lineTo(rx, by+rr)
  ctx.arcTo(rx, by, rx+rr, by, rr)
  ctx.closePath()

  ctx.fillStyle = active ? color : color + '30'
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = active ? 2.5 : 1.2
  ctx.stroke()
  ctx.shadowBlur = 0

  // Multiplicateur
  ctx.fillStyle = active ? '#000' : '#fff'
  ctx.font = `bold ${mult >= 10 ? 8 : 10}px 'Courier New',monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${mult}×`, bx, by + BUCKET_H * 0.38)

  // Type Pokémon
  ctx.font = `600 7px monospace`
  ctx.fillStyle = active ? '#00000080' : color + 'cc'
  ctx.fillText(type, bx, by + BUCKET_H * 0.72)
}

// ── Moteur physique custom ────────────────────────────────────────────────────
// Une bille = { x, y, vx, vy, angle, angleV, color, targetBucket, done, hitBucket }
function updateBall(ball, pegHits, dt) {
  if (ball.done) return

  const steps = 3  // sous-pas pour précision des collisions
  const ddt   = dt / steps

  for (let s = 0; s < steps; s++) {
    // Gravité
    ball.vy += GRAVITY * ddt

    // Friction
    ball.vx *= Math.pow(FRICTION, ddt)
    ball.vy *= Math.pow(FRICTION, ddt)

    // Clamp vitesse
    const spd = Math.hypot(ball.vx, ball.vy)
    if (spd > 18) { ball.vx = ball.vx / spd * 18; ball.vy = ball.vy / spd * 18 }

    // Déplacement
    ball.x += ball.vx * ddt
    ball.y += ball.vy * ddt

    // Rotation (proportionnelle à vx)
    ball.angle  += ball.vx * 0.04 * ddt
    ball.angleV  = ball.vx * 0.04

    // ── Collision murs latéraux ──
    if (ball.x - BALL_R < WALL_LEFT) {
      ball.x  = WALL_LEFT + BALL_R
      ball.vx = Math.abs(ball.vx) * RESTITUTION
    }
    if (ball.x + BALL_R > WALL_RIGHT) {
      ball.x  = WALL_RIGHT - BALL_R
      ball.vx = -Math.abs(ball.vx) * RESTITUTION
    }

    // ── Collision picots ──
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= row + 1; col++) {
        const { x: px, y: py } = getPegPos(row, col)
        const dx   = ball.x - px
        const dy   = ball.y - py
        const dist = Math.hypot(dx, dy)
        const minD = PEG_R + BALL_R

        if (dist < minD && dist > 0.01) {
          // Séparer
          const nx    = dx / dist
          const ny    = dy / dist
          const overlap = minD - dist
          ball.x += nx * overlap
          ball.y += ny * overlap

          // Réflexion vitesse
          const dot = ball.vx * nx + ball.vy * ny
          if (dot < 0) {
            ball.vx -= (1 + RESTITUTION) * dot * nx
            ball.vy -= (1 + RESTITUTION) * dot * ny
            // Petit coup aléatoire pour éviter les trajectoires trop parfaites
            ball.vx += (Math.random() - 0.5) * 0.8
          }

          // Enregistrer hit picot
          const key = `${row}-${col}`
          if (!pegHits[key] || Date.now() - pegHits[key] > 200) {
            pegHits[key] = Date.now()
          }
        }
      }
    }

    // ── Arrivée dans un bucket ──
    if (ball.y + BALL_R >= BUCKET_Y && !ball.hitBucket) {
      // Trouver le bucket le plus proche
      let closest = 0, minDist = Infinity
      for (let i = 0; i < BUCKETS; i++) {
        const d = Math.abs(getBucketX(i) - ball.x)
        if (d < minDist) { minDist = d; closest = i }
      }
      ball.hitBucket = closest
      ball.done = true
      ball.y = BUCKET_Y + BALL_R
      ball.vy = 0
      ball.vx = 0
    }
  }
}

// ── Hook moteur ───────────────────────────────────────────────────────────────
function usePlinkoEngine(canvasRef, risk, onBallLanded) {
  const ballsRef   = useRef([])
  const pegHitsRef = useRef({})
  const flashRef   = useRef(null)
  const riskRef    = useRef(risk)
  const lastRef    = useRef(null)
  const rafRef     = useRef(null)

  useEffect(() => { riskRef.current = risk }, [risk])

  useEffect(() => {
    const loop = (now) => {
      const dt = lastRef.current ? Math.min((now - lastRef.current) / 16.67, 3) : 1
      lastRef.current = now

      // Mettre à jour toutes les billes
      for (const ball of ballsRef.current) {
        if (!ball.done) {
          updateBall(ball, pegHitsRef.current, dt)
          if (ball.done && ball.hitBucket !== undefined) {
            // Flash sur le bucket VISUEL (où la bille est réellement tombée)
            flashRef.current = { bucket: ball.hitBucket, t: Date.now() }
            // Le résultat financier sera toujours celui du serveur (targetBucket)
            onBallLanded(ball.id, ball.hitBucket)
            // Retirer après 600ms
            setTimeout(() => {
              ballsRef.current = ballsRef.current.filter(b => b.id !== ball.id)
            }, 600)
          }
        }
      }

      // Rendu
      const canvas = canvasRef.current
      if (canvas) {
        const ctx   = canvas.getContext('2d')
        const mults = MULTIPLIERS[riskRef.current]
        const flash = flashRef.current

        // Fond
        ctx.fillStyle = '#080814'
        ctx.fillRect(0, 0, CW, CH)

        // Fond dégradé subtil
        const bgGr = ctx.createLinearGradient(0, 0, 0, CH)
        bgGr.addColorStop(0, '#0a0a1e')
        bgGr.addColorStop(1, '#06060f')
        ctx.fillStyle = bgGr
        ctx.fillRect(0, 0, CW, CH)

        // Guide de chute
        ctx.setLineDash([4, 6])
        ctx.strokeStyle = 'rgba(240,180,41,0.2)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(CW/2, 4)
        ctx.lineTo(CW/2, FIRST_Y - 20)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(240,180,41,0.45)'
        ctx.beginPath()
        ctx.moveTo(CW/2, 5); ctx.lineTo(CW/2-5, 15); ctx.lineTo(CW/2+5, 15)
        ctx.closePath(); ctx.fill()

        // Picots
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col <= row + 1; col++) {
            const { x, y } = getPegPos(row, col)
            drawPeg(ctx, x, y, pegHitsRef.current[`${row}-${col}`])
          }
        }

        // Buckets
        for (let i = 0; i < BUCKETS; i++) {
          const isActive = flash && flash.bucket === i && (Date.now() - flash.t) < 700
          drawBucket(ctx, i, mults, isActive)
        }

        // Billes
        for (const ball of ballsRef.current) {
          drawBall(ctx, ball.x, ball.y, ball.color, ball.angle)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const dropBall = useCallback((id, targetBucket, color) => {
    // Départ légèrement aléatoire autour du centre
    const startX = CW / 2 + (Math.random() - 0.5) * 4
    ballsRef.current = [...ballsRef.current, {
      id,
      x: startX, y: 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 2,
      angle: 0, angleV: 0,
      color,
      targetBucket,
      done: false,
      hitBucket: undefined,
    }]
  }, [])

  return { dropBall }
}

// ── Page principale ───────────────────────────────────────────────────────────
let ballIdCounter = 0

export default function Plinko() {
  const { user, updateBalance } = useAuth()
  const canvasRef  = useRef(null)
  const pendingRef = useRef({})

  const [bet, setBet]           = useState(100)
  const [risk, setRisk]         = useState('medium')
  const [dropping, setDropping] = useState(false)
  const [error, setError]       = useState('')
  const [lastResult, setLastResult]   = useState(null)
  const [stats, setStats]       = useState({ total: 0, wins: 0, pnl: 0 })
  const [history, setHistory]   = useState([])

  const handleBallLanded = useCallback((ballId, _visualBucket) => {
    // Le résultat financier vient TOUJOURS du serveur — la physique visuelle est indépendante
    const pending = pendingRef.current[ballId]
    if (!pending) return
    delete pendingRef.current[ballId]

    const { payout, mult, pnl, isWin, color } = pending
    setLastResult({ payout, mult, pnl, isWin, color })
    setStats(prev => ({
      total: prev.total + 1,
      wins:  prev.wins + (isWin ? 1 : 0),
      pnl:   prev.pnl + pnl,
    }))
    setHistory(prev => [{ id: ballId, mult, pnl, color }, ...prev].slice(0, 14))
    setDropping(false)
  }, [])

  const { dropBall } = usePlinkoEngine(canvasRef, risk, handleBallLanded)

  async function handleDrop() {
    if (dropping || !user || bet < 10 || bet > user.balance) return
    setDropping(true)
    setError('')

    try {
      const { data } = await axios.post('/api/games/plinko', { bet, risk })
      updateBalance(data.balance)

      const id    = ++ballIdCounter
      const color = BALL_COLORS[id % BALL_COLORS.length]
      const pnl   = data.payout - bet
      const isWin = data.payout >= bet

      pendingRef.current[id] = { payout: data.payout, mult: data.multiplier, pnl, isWin, color }
      dropBall(id, data.bucket, color)

    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
      setDropping(false)
    }
  }

  const riskInfo = RISK_LABELS[risk]

  return (
    <div className="min-h-screen bg-casino-bg py-10 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-3 mb-8">
          <Link to="/casino" className="text-gray-500 hover:text-white text-sm transition-colors">← Lobby</Link>
          <span className="text-gray-700">/</span>
          <span className="text-casino-gold font-semibold">⚪ Plinko</span>
          <span className="badge-gold ml-auto">RTP 95%</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Plateau ── */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-casino text-2xl font-bold text-gradient">Plinko</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Risque : <span className="font-semibold ml-1" style={{ color: riskInfo.color }}>{riskInfo.label}</span>
                    <span className="mx-2 text-gray-700">·</span>
                    <span className="text-gray-600">La bille est une Poké Ball !</span>
                  </p>
                </div>
                {lastResult && (
                  <div style={{
                    border: `1px solid ${lastResult.color}50`,
                    background: lastResult.isWin ? '#22c55e10' : '#ffffff08',
                    borderRadius: 12, padding: '8px 16px', textAlign: 'center',
                    minWidth: 80,
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: lastResult.isWin ? '#4ade80' : '#6b7280' }}>
                      {lastResult.pnl >= 0 ? '+' : ''}{lastResult.pnl.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: '#555' }}>×{lastResult.mult}</div>
                  </div>
                )}
              </div>

              {/* Canvas */}
              <div style={{ background: '#080814', borderRadius: 14, border: '1px solid #1a1a30', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  width={CW}
                  height={CH}
                  style={{ width: '100%', display: 'block' }}
                />
              </div>

              {/* Historique */}
              {history.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-3">
                  {history.map(h => (
                    <div key={h.id} style={{
                      background: h.pnl >= 0 ? '#22c55e15' : '#ffffff08',
                      border: `1px solid ${h.color}40`,
                      borderRadius: 20, padding: '3px 10px',
                      fontSize: 11, fontWeight: 700,
                      color: h.pnl >= 0 ? '#4ade80' : '#6b7280',
                    }}>
                      {h.pnl >= 0 ? '+' : ''}{h.pnl.toLocaleString()}
                      <span style={{ opacity: 0.5, fontSize: 9, marginLeft: 4 }}>×{h.mult}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mt-3">
                  ⚠️ {error}
                </div>
              )}

              {/* Sélection risque */}
              <div className="mt-5">
                <label className="text-sm text-gray-400 font-medium block mb-2">Niveau de risque</label>
                <div className="flex gap-2">
                  {Object.entries(RISK_LABELS).map(([id, info]) => (
                    <button key={id} onClick={() => setRisk(id)} disabled={dropping}
                      style={{
                        borderColor: risk === id ? info.color : '#1e1e35',
                        background:  risk === id ? info.color + '18' : 'transparent',
                        boxShadow:   risk === id ? `0 0 12px ${info.color}30` : 'none',
                        color:       risk === id ? info.color : '#6b7280',
                      }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <BetInput bet={bet} setBet={setBet} disabled={dropping} />
              </div>

              <button
                onClick={handleDrop}
                disabled={dropping || bet < 10 || bet > (user?.balance ?? 0)}
                className="btn-gold w-full py-4 text-lg mt-4"
              >
                {dropping
                  ? <span className="flex items-center justify-center gap-2">
                      <span style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid #f0b42940', borderTopColor: '#f0b429',
                        display: 'inline-block', animation: 'spin 0.7s linear infinite',
                      }}/>
                      La bille tombe...
                    </span>
                  : '⚪ Lâcher la Poké Ball'}
              </button>
            </div>
          </div>

          {/* ── Panneau droit ── */}
          <div className="space-y-4">
            {stats.total > 0 && (
              <div className="card">
                <h3 className="font-casino font-bold text-casino-gold mb-3 text-sm uppercase tracking-wide">Session</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lancers</span>
                    <span className="text-white font-bold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Victoires</span>
                    <span className="text-white font-bold">
                      {stats.wins}
                      <span className="text-gray-600 font-normal text-xs ml-1">({Math.round(stats.wins/stats.total*100)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">P&L</span>
                    <span className={`font-bold ${stats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="font-casino font-bold text-casino-gold mb-1 text-sm uppercase tracking-wide">Multiplicateurs</h3>
              <p className="text-xs text-gray-600 mb-3">Buckets = types Pokémon · Centre = fréquent</p>

              {/* Légende couleurs buckets */}
              <div className="flex gap-1 mb-3">
                {BUCKET_COLORS.map((c, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: c }} />
                ))}
              </div>

              {Object.entries(RISK_LABELS).map(([r, info]) => (
                <div key={r} className={`mb-3 rounded-xl p-2 transition-all ${r===risk ? 'bg-white/5 border border-white/10' : 'opacity-25'}`}>
                  <div className="text-xs font-semibold mb-2" style={{ color: r===risk ? info.color : '#9ca3af' }}>{info.label}</div>
                  <div className="flex gap-1 flex-wrap">
                    {MULTIPLIERS[r].map((mult, i) => (
                      <div key={i} style={{
                        background: BUCKET_COLORS[i] + '25',
                        border: `1px solid ${BUCKET_COLORS[i]}60`,
                        color: '#fff', fontSize: 9, fontWeight: 700,
                        padding: '2px 5px', borderRadius: 5, fontFamily: 'monospace',
                      }}>
                        {mult}×
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <LiveFeed compact />
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}