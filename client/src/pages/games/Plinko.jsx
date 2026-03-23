import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

// ─── PALETTE (inchangée) ────────────────────────────────────────────────────
const C = {
  bg:     '#06060f',
  surf:   '#0c0c1e',
  border: '#1e1e3a',
  gold:   '#f0b429',
  green:  '#22c55e',
  red:    '#ef4444',
  txt:    '#e2e2f0',
  muted:  '#44446a',
  dim:    '#12121f',
}

// ─── CONSTANTES CANVAS ──────────────────────────────────────────────────────
const CW       = 460
const CH       = 420
const ROWS     = 8          // nombre de rangées de pins
const BUCKETS  = ROWS + 1   // = 9
const GAP      = 40         // écart entre pins
const PEG_R    = 5
const BALL_R   = 7
const BUCKET_H = 34
// Première rangée de pins (1 pin au centre)
const FIRST_Y  = 56
// Y de la zone buckets
const BUCKET_Y = FIRST_Y + (ROWS - 1) * GAP + GAP + 4

// ─── COULEURS / DONNÉES ─────────────────────────────────────────────────────
const MULTS = {
  low:    [5.0, 4.5, 1.0, 0.5, 0.5, 0.5, 1.0, 4.5, 5.0],
  medium: [9.0, 4.0, 1.0, 0.5, 0.5, 0.5, 1.0, 4.0, 9.0],
  high:   [37.5, 4.5, 1.5, 0.0, 0.0, 0.0, 1.5, 4.5, 37.5],
}
const BCOLS = ['#7038f8','#f85888','#f8d030','#f08030','#a8a878','#f08030','#f8d030','#f85888','#7038f8']
const RISK  = {
  low:    { label: 'Faible',  color: '#00c853' },
  medium: { label: 'Moyen',   color: '#f0b429' },
  high:   { label: 'Élevé',   color: '#ff4444' },
}
const BALL_COLORS = ['#f0b429','#60a5fa','#f472b6','#34d399','#fb923c','#a78bfa']

// ─── GÉOMÉTRIE ───────────────────────────────────────────────────────────────
// rangée r (0-indexed) a (r+2) pins
function pegPos(row, col) {
  const n  = row + 2
  const tw = (n - 1) * GAP
  const sx = CW / 2 - tw / 2
  return { x: sx + col * GAP, y: FIRST_Y + row * GAP }
}

// Centre X du bucket i (9 buckets alignés sur la dernière rangée de pins)
function bucketCX(i) {
  const tw = (BUCKETS - 1) * GAP
  const sx = CW / 2 - tw / 2
  return sx + i * GAP
}

// Bords gauche/droit des murs (alignés sur les buckets extrêmes ± demi-bucket)
const WALL_L = bucketCX(0)          - GAP / 2 - 2
const WALL_R = bucketCX(BUCKETS - 1) + GAP / 2 + 2

// ─── RENDU : PEG ─────────────────────────────────────────────────────────────
function drawPeg(ctx, x, y, hitTime) {
  const now  = Date.now()
  const age  = hitTime ? now - hitTime : Infinity
  // flash glow au moment du contact
  if (age < 600) {
    const p  = age / 600
    const ex = (1 - Math.abs(p * 2 - 1)) * 8
    ctx.beginPath()
    ctx.arc(x, y, PEG_R + ex, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,220,100,${0.3 * (1 - p)})`
    ctx.fill()
  }
  // ombre portée
  ctx.beginPath()
  ctx.arc(x + 1, y + 1, PEG_R, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fill()
  // dégradé radial
  const gr = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, PEG_R)
  const hot = age < 250
  gr.addColorStop(0,   hot ? '#ffe066' : '#8888bb')
  gr.addColorStop(0.5, hot ? '#f0b429' : '#4a4a99')
  gr.addColorStop(1,   '#1a1a35')
  ctx.beginPath()
  ctx.arc(x, y, PEG_R, 0, Math.PI * 2)
  ctx.fillStyle = gr
  ctx.fill()
  ctx.strokeStyle = hot ? '#f0b42980' : '#33336a'
  ctx.lineWidth   = 1
  ctx.stroke()
}

// ─── RENDU : BILLE ───────────────────────────────────────────────────────────
function drawBall(ctx, x, y, col, angle, trail) {
  // traîne lumineuse
  trail.forEach((t, i) => {
    const a = (i / trail.length) * 0.25
    const r = BALL_R * 0.45 * (i / trail.length)
    ctx.beginPath()
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(240,192,64,${a})`
    ctx.fill()
  })
  // ombre
  ctx.beginPath()
  ctx.arc(x + 1.5, y + 2, BALL_R, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fill()
  // glow
  ctx.shadowColor = col
  ctx.shadowBlur  = 10
  // bille (style Poké Ball original conservé)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath(); ctx.arc(0, 0, BALL_R, Math.PI, 0); ctx.closePath()
  ctx.fillStyle = col; ctx.fill()
  ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI); ctx.closePath()
  ctx.fillStyle = '#eee'; ctx.fill()
  ctx.fillStyle = '#111'; ctx.fillRect(-BALL_R, -1.5, BALL_R * 2, 3)
  ctx.beginPath(); ctx.arc(0, 0, BALL_R * 0.3,  0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill()
  ctx.beginPath(); ctx.arc(0, 0, BALL_R * 0.18, 0, Math.PI * 2); ctx.fillStyle = '#eee'; ctx.fill()
  ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke()
  ctx.restore()
  ctx.shadowBlur = 0
}

// ─── RENDU : BUCKET ──────────────────────────────────────────────────────────
function drawBucket(ctx, i, mults, active) {
  const bx   = bucketCX(i)
  const by   = BUCKET_Y
  const bw   = GAP - 3
  const col  = BCOLS[i]
  const mult = mults[i]
  const rx   = bx - bw / 2
  const rr   = 5
  if (active) { ctx.shadowColor = col; ctx.shadowBlur = 20 }
  // arrondi
  ctx.beginPath()
  ctx.moveTo(rx + rr, by)
  ctx.lineTo(rx + bw - rr, by)
  ctx.arcTo(rx + bw, by,        rx + bw, by + rr,          rr)
  ctx.lineTo(rx + bw, by + BUCKET_H - rr)
  ctx.arcTo(rx + bw, by + BUCKET_H, rx + bw - rr, by + BUCKET_H, rr)
  ctx.lineTo(rx + rr, by + BUCKET_H)
  ctx.arcTo(rx,       by + BUCKET_H, rx, by + BUCKET_H - rr,      rr)
  ctx.lineTo(rx, by + rr)
  ctx.arcTo(rx, by, rx + rr, by, rr)
  ctx.closePath()
  ctx.fillStyle   = active ? col : col + '25'
  ctx.fill()
  ctx.strokeStyle = col
  ctx.lineWidth   = active ? 2 : 1
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle    = active ? '#000' : '#fff'
  ctx.font         = `bold ${mult >= 10 ? 7 : 9}px monospace`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${mult}×`, bx, by + BUCKET_H * 0.4)
}

// ─── PHYSIQUE ────────────────────────────────────────────────────────────────
// Constantes calquées sur l'original, mais physique correcte (pas de dt*sub-steps)
const GRAVITY     = 1500   // px/s²   (original utilisait des unités frame, on passe en px/s²)
const RESTITUTION = 0.38
const FRICTION_V  = 0.992  // friction par frame (appliquée correctement par dt)

function updateBall(ball, hits, dt) {
  if (ball.done) return

  const SUB = 3
  const sdt = dt / SUB

  for (let s = 0; s < SUB; s++) {
    // gravité
    ball.vy += GRAVITY * sdt
    // friction air
    ball.vx *= Math.pow(FRICTION_V, sdt * 60)
    ball.vy *= Math.pow(FRICTION_V, sdt * 60)
    // cap vitesse
    const sp = Math.hypot(ball.vx, ball.vy)
    if (sp > 900) { ball.vx = ball.vx / sp * 900; ball.vy = ball.vy / sp * 900 }

    ball.x    += ball.vx * sdt
    ball.y    += ball.vy * sdt
    ball.angle += ball.vx * 0.003 * sdt * 60

    // murs
    if (ball.x - BALL_R < WALL_L) { ball.x = WALL_L + BALL_R; ball.vx =  Math.abs(ball.vx) * RESTITUTION }
    if (ball.x + BALL_R > WALL_R) { ball.x = WALL_R - BALL_R; ball.vx = -Math.abs(ball.vx) * RESTITUTION }

    // collision pegs
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r + 1; c++) {
        const { x: px, y: py } = pegPos(r, c)
        const dx   = ball.x - px
        const dy   = ball.y - py
        const dist = Math.hypot(dx, dy)
        const minD = PEG_R + BALL_R
        if (dist < minD && dist > 0.01) {
          const nx  = dx / dist
          const ny  = dy / dist
          // dépénétration
          ball.x += nx * (minD - dist)
          ball.y += ny * (minD - dist)
          // réflexion avec restitution
          const dot = ball.vx * nx + ball.vy * ny
          if (dot < 0) {
            ball.vx -= (1 + RESTITUTION) * dot * nx
            ball.vy -= (1 + RESTITUTION) * dot * ny
            // légère poussée latérale aléatoire (authentique)
            ball.vx += (Math.random() - 0.5) * 40
            // s'assurer que la bille repart vers le bas
            if (ball.vy < 50) ball.vy = 50
          }
          // enregistrer le hit pour le flash visuel
          const k = `${r}-${c}`
          if (!hits[k] || Date.now() - hits[k] > 150) hits[k] = Date.now()
          break // une collision par sub-step
        }
      }
    }

    // ── RÉSOLUTION : bille atteint la zone buckets ───────────────────────────
    if (ball.y + BALL_R >= BUCKET_Y && !ball.done) {
      // Bucket déterminé par la POSITION RÉELLE de la bille (pas de triche)
      let hitIdx = -1
      for (let i = 0; i < BUCKETS; i++) {
        const cx = bucketCX(i)
        if (ball.x >= cx - GAP / 2 && ball.x < cx + GAP / 2) {
          hitIdx = i
          break
        }
      }
      // sécurité bords
      if (hitIdx === -1) hitIdx = ball.x < CW / 2 ? 0 : BUCKETS - 1

      ball.hitBucket = hitIdx
      ball.done      = true
      ball.y         = BUCKET_Y + BALL_R
      ball.vx        = 0
      ball.vy        = 0
    }
  }
}

// ─── HOOK useEngine ──────────────────────────────────────────────────────────
function useEngine(cvs, risk, onLand) {
  const balls   = useRef([])
  const hits    = useRef({})
  const flash   = useRef(null)
  const rRef    = useRef(risk)
  const lastTs  = useRef(null)
  const rafId   = useRef(null)

  useEffect(() => { rRef.current = risk }, [risk])

  useEffect(() => {
    const loop = (now) => {
      const dt = lastTs.current
        ? Math.min((now - lastTs.current) / 1000, 0.05)  // secondes, cap 50ms
        : 1 / 60
      lastTs.current = now

      // update toutes les balles
      for (const ball of balls.current) {
        if (!ball.done) {
          updateBall(ball, hits.current, dt)
          if (ball.done && ball.hitBucket !== undefined) {
            flash.current = { bkt: ball.hitBucket, t: Date.now() }
            // notifie le composant parent avec l'id et le bucket réel
            onLand(ball.id, ball.hitBucket)
            setTimeout(() => {
              balls.current = balls.current.filter(b => b.id !== ball.id)
            }, 700)
          }
        }
      }

      // ── RENDU ──────────────────────────────────────────────────────────────
      const canvas = cvs.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        const ml  = MULTS[rRef.current]
        const fl  = flash.current

        // fond
        ctx.fillStyle = '#05050e'
        ctx.fillRect(0, 0, CW, CH)

        // ligne pointillée centrale
        ctx.setLineDash([3, 5])
        ctx.strokeStyle = 'rgba(240,180,41,0.18)'
        ctx.lineWidth   = 1.2
        ctx.beginPath(); ctx.moveTo(CW / 2, 3); ctx.lineTo(CW / 2, FIRST_Y - 14); ctx.stroke()
        ctx.setLineDash([])

        // flèche indicatrice
        ctx.fillStyle = 'rgba(240,180,41,0.5)'
        ctx.beginPath()
        ctx.moveTo(CW / 2, 4)
        ctx.lineTo(CW / 2 - 5, 12)
        ctx.lineTo(CW / 2 + 5, 12)
        ctx.closePath()
        ctx.fill()

        // pegs
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c <= r + 1; c++) {
            const { x, y } = pegPos(r, c)
            drawPeg(ctx, x, y, hits.current[`${r}-${c}`])
          }
        }

        // buckets
        for (let i = 0; i < BUCKETS; i++) {
          drawBucket(ctx, i, ml, fl && fl.bkt === i && (Date.now() - fl.t) < 700)
        }

        // balles
        for (const b of balls.current) {
          drawBall(ctx, b.x, b.y, b.color, b.angle, b.trail)
        }
      }

      rafId.current = requestAnimationFrame(loop)
    }

    rafId.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const drop = useCallback((id, col) => {
    const sx = CW / 2 + (Math.random() - 0.5) * 4
    balls.current = [
      ...balls.current,
      {
        id,
        x:         sx,
        y:         12,
        vx:        (Math.random() - 0.5) * 30,
        vy:        0,
        angle:     0,
        color:     col,
        trail:     [],
        done:      false,
        hitBucket: undefined,
      },
    ]
  }, [])

  return { drop }
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
let uid = 0

export default function Plinko() {
  const { user, updateBalance } = useAuth()
  const cvs  = useRef(null)
  const pend = useRef({})   // résultats API en attente d'atterrissage

  const [bet,      setBet]      = useState(100)
  const [risk,     setRisk]     = useState('medium')
  const [dropping, setDropping] = useState(false)
  const [err,      setErr]      = useState('')
  const [last,     setLast]     = useState(null)
  const [history,  setHistory]  = useState([])
  const [stats,    setStats]    = useState({ n: 0, w: 0, pnl: 0 })

  // Appelé par le moteur physique quand la bille atterrit réellement dans un bucket.
  // C'est ICI qu'on appelle l'API avec le bucket physique — pas avant.
  const onLand = useCallback(async (id, physBucket) => {
    const p = pend.current[id]
    if (!p) return
    delete pend.current[id]

    try {
      const { data } = await axios.post('/api/games/plinko', {
        bet:    p.bet,
        risk:   p.risk,
        bucket: physBucket,   // bucket réel déterminé par la physique
      })
      updateBalance(data.balance)
      const pnl = data.payout - p.bet
      const win = data.payout >= p.bet
      const result = { payout: data.payout, mult: data.multiplier, pnl, win, color: p.color }
      setLast(result)
      setHistory(h => [{ id, ...result }, ...h].slice(0, 10))
      setStats(s => ({ n: s.n + 1, w: s.w + (win ? 1 : 0), pnl: s.pnl + pnl }))
    } catch (e) {
      setErr(e.response?.data?.error || 'Erreur réseau')
    }

    setDropping(false)
  }, [updateBalance])

  const { drop } = useEngine(cvs, risk, onLand)

  // Lance la bille immédiatement — l'API sera appelée à l'atterrissage
  function play() {
    if (dropping || !user || bet < 10 || bet > user.balance) return
    setDropping(true)
    setErr('')
    const id  = ++uid
    const col = BALL_COLORS[id % BALL_COLORS.length]
    // Stocker les paramètres du lancer pour onLand
    pend.current[id] = { bet, risk, color: col }
    drop(id, col)
  }

  const ri = RISK[risk]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/casino" style={{ fontSize: 11, color: C.muted, textDecoration: 'none' }}>← Lobby</Link>
        <span style={{ color: C.dim }}>/</span>
        <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>⚪ Plinko</span>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'start', flex: 1 }}>

        {/* ── GAUCHE : contrôles ─────────────────────────────────────────── */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>

            {/* Risque */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Risque</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(RISK).map(([id, info]) => (
                  <button
                    key={id}
                    onClick={() => setRisk(id)}
                    disabled={dropping}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer',
                      border: `2px solid ${risk === id ? info.color : C.border}`,
                      background: risk === id ? info.color + '20' : 'transparent',
                      color: risk === id ? info.color : C.muted,
                      transition: 'all .15s',
                    }}
                  >{info.label}</button>
                ))}
              </div>
            </div>

            <BetInput bet={bet} setBet={setBet} disabled={dropping} />

            {err && (
              <div style={{ marginTop: 8, fontSize: 11, color: C.red, background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 8, padding: '7px 10px' }}>
                ⚠ {err}
              </div>
            )}

            <button
              onClick={play}
              disabled={dropping || bet < 10 || bet > (user?.balance ?? 0)}
              style={{
                width: '100%', marginTop: 12, padding: '14px',
                background: dropping ? C.dim : C.gold,
                color: dropping ? C.muted : '#06060f',
                fontWeight: 800, fontSize: 16, borderRadius: 10, border: 'none',
                cursor: dropping ? 'not-allowed' : 'pointer',
                opacity: bet > (user?.balance ?? 0) ? 0.5 : 1,
                boxShadow: dropping ? 'none' : `0 0 20px ${C.gold}44`,
                transition: 'all .15s',
              }}
            >
              {dropping ? 'La bille tombe…' : '⚪ Lâcher la bille'}
            </button>
          </div>

          {/* Dernier résultat */}
          {last && (
            <div style={{
              background: last.win ? `${C.green}0e` : `${C.red}08`,
              border: `1px solid ${last.win ? C.green + '28' : C.red + '18'}`,
              borderRadius: 12, padding: 14, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>×{last.mult}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: last.win ? C.green : C.red }}>
                {last.pnl >= 0 ? `+${last.pnl.toLocaleString()}` : `${last.pnl.toLocaleString()}`}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>jetons</div>
            </div>
          )}

          {/* Stats session */}
          {stats.n > 0 && (
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Session</div>
              {[
                ['Lancers', stats.n,                                                    C.txt],
                ['P&L',     `${stats.pnl >= 0 ? '+' : ''}${stats.pnl.toLocaleString()}`, stats.pnl >= 0 ? C.green : C.red],
              ].map(([l, v, col]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ fontWeight: 700, color: col }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Historique chips */}
          {history.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {history.map(h => (
                <div
                  key={h.id}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 20,
                    background: h.pnl >= 0 ? `${C.green}12` : `${C.red}08`,
                    border: `1px solid ${h.color}30`,
                    color: h.pnl >= 0 ? C.green : C.muted,
                  }}
                >
                  {h.pnl >= 0 ? '+' : ''}{h.pnl.toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CENTRE : canvas ────────────────────────────────────────────── */}
        <div style={{ flex: 1, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.gold, letterSpacing: 4 }}>PLINKO</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
              Risque :&nbsp;
              <span style={{ color: ri.color, fontWeight: 700 }}>{ri.label}</span>
              {'  ·  '}La bille est une Poké Ball
            </div>
          </div>
          <div style={{ background: '#05050e', borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <canvas ref={cvs} width={CW} height={CH} style={{ display: 'block' }} />
          </div>
        </div>

        {/* ── DROITE : multiplicateurs ───────────────────────────────────── */}
        <div style={{ width: 220, flexShrink: 0, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Multiplicateurs</div>
          {Object.entries(RISK).map(([r, info]) => (
            <div key={r} style={{ marginBottom: 10, opacity: r === risk ? 1 : 0.35, transition: 'opacity .2s' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: info.color, marginBottom: 5 }}>{info.label}</div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {MULTS[r].map((m, i) => (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, fontFamily: 'monospace', background: BCOLS[i] + '25', border: `1px solid ${BCOLS[i]}45`, color: '#fff' }}>
                    {m}×
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.dim}`, fontSize: 10, color: C.muted, lineHeight: 1.9 }}>
            <div>📊 Centre = fréquent · Bords = rare</div>
            <div>🏆 Risque Élevé : jackpot ×37.5</div>
          </div>
        </div>

      </div>
      <LiveFeed />
    </div>
  )
}
