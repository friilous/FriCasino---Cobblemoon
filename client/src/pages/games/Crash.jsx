import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const POKEMON = [
  { dex: 25,  name: 'Pikachu'    },
  { dex: 6,   name: 'Dracaufeu'  },
  { dex: 149, name: 'Dracolosse' },
  { dex: 131, name: 'Lokhlass'   },
  { dex: 143, name: 'Ronflex'    },
  { dex: 94,  name: 'Ectoplasma' },
  { dex: 130, name: 'Leviator'   },
  { dex: 59,  name: 'Arcanin'    },
]

const SPRITE = dex =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

// ── Canvas graph ──────────────────────────────────────────────────────────────
const CW = 600, CH = 280

function drawGraph(ctx, points, mult, phase, crashPoint, pokemon) {
  ctx.clearRect(0, 0, CW, CH)

  // Fond
  ctx.fillStyle = '#07071a'
  ctx.fillRect(0, 0, CW, CH)

  // Grille
  ctx.strokeStyle = '#1a1a35'
  ctx.lineWidth = 1
  for (let y = 0; y <= CH; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke()
  }
  for (let x = 0; x <= CW; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke()
  }

  if (points.length < 2) return

  // Couleur selon phase
  const color = phase === 'crashed' ? '#f04040'
    : phase === 'cashed' ? '#40f080'
    : '#f0c040'

  // Zone sous la courbe
  ctx.beginPath()
  ctx.moveTo(points[0].x, CH)
  for (const p of points) ctx.lineTo(p.x, p.y)
  ctx.lineTo(points[points.length - 1].x, CH)
  ctx.closePath()
  ctx.fillStyle = color + '15'
  ctx.fill()

  // Courbe
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx  = (prev.x + curr.x) / 2
    ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y)
  }
  ctx.strokeStyle = color
  ctx.lineWidth   = 3
  ctx.shadowColor = color
  ctx.shadowBlur  = 12
  ctx.stroke()
  ctx.shadowBlur  = 0

  // Sprite Pokémon au bout de la courbe
  if (pokemon?.img && points.length > 0) {
    const last = points[points.length - 1]
    const size = 40
    ctx.save()
    if (phase === 'crashed') {
      ctx.globalAlpha = 0.4
      ctx.filter = 'grayscale(1)'
    }
    ctx.drawImage(pokemon.img, last.x - size / 2, last.y - size - 4, size, size)
    ctx.restore()
  }

  // Multiplicateur en haut à gauche
  ctx.font         = 'bold 42px monospace'
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle    = color
  ctx.shadowColor  = color
  ctx.shadowBlur   = 20
  ctx.fillText(
    phase === 'crashed' ? `💥 ${crashPoint?.toFixed(2)}×` : `${mult.toFixed(2)}×`,
    20, 16
  )
  ctx.shadowBlur = 0

  // Label
  ctx.font      = '12px monospace'
  ctx.fillStyle = phase === 'crashed' ? '#f04040' : phase === 'cashed' ? '#40f080' : '#666688'
  ctx.fillText(
    phase === 'crashed' ? 'CRASH !' : phase === 'cashed' ? 'ENCAISSÉ ✓' : 'En cours...',
    20, 66
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function Crash() {
  const { user, updateBalance } = useAuth()

  const [bet,       setBet]       = useState(100)
  const [autoCash,  setAutoCash]  = useState('')
  const [phase,     setPhase]     = useState('idle')   // idle | waiting | running | crashed | cashed
  const [mult,      setMult]      = useState(1.00)
  const [crashPoint,setCrashPoint]= useState(null)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState('')
  const [history,   setHistory]   = useState([])
  const [pokemon,   setPokemon]   = useState(null)

  const canvasRef   = useRef(null)
  const pointsRef   = useRef([])
  const rafRef      = useRef(null)
  const multRef     = useRef(1.00)
  const phaseRef    = useRef('idle')
  const startTimeRef= useRef(null)
  const resultRef   = useRef(null)

  // Charger un Pokémon aléatoire + son sprite
  function loadPokemon() {
    const p   = POKEMON[Math.floor(Math.random() * POKEMON.length)]
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = SPRITE(p.dex)
    img.onload = () => setPokemon({ ...p, img })
  }

  useEffect(() => { loadPokemon() }, [])

  // Convertir multiplicateur → coordonnée Y sur le canvas
  function multToY(m) {
    const maxMult = Math.max(resultRef.current?.crashPoint || 2, multRef.current, 2)
    const ratio   = Math.log(m) / Math.log(maxMult + 0.5)
    return CH - 20 - ratio * (CH - 40)
  }

  // Convertir temps → coordonnée X
  function timeToX(ms) {
    const duration = Math.max(3000, (resultRef.current?.crashPoint || 2) * 1200)
    return 20 + Math.min((ms / duration) * (CW - 40), CW - 20)
  }

  // Boucle d'animation
  const animate = useCallback(() => {
    if (phaseRef.current !== 'running') return

    const elapsed = Date.now() - startTimeRef.current
    const res     = resultRef.current
    if (!res) return

    // Progression du multiplicateur (courbe exponentielle)
    const newMult = Math.min(1 + elapsed / 1500, res.crashPoint)
    multRef.current = newMult
    setMult(newMult)

    // Ajouter un point à la courbe
    pointsRef.current.push({ x: timeToX(elapsed), y: multToY(newMult) })

    // Dessiner
    const canvas = canvasRef.current
    if (canvas) {
      drawGraph(canvas.getContext('2d'), pointsRef.current, newMult, 'running', null, pokemon)
    }

    // Auto-cashout
    const auto = parseFloat(autoCash)
    if (auto >= 1.01 && newMult >= auto) {
      handleCashout()
      return
    }

    // Crash atteint
    if (newMult >= res.crashPoint) {
      phaseRef.current = 'crashed'
      setPhase('crashed')
      setMult(res.crashPoint)
      setCrashPoint(res.crashPoint)
      const canvas = canvasRef.current
      if (canvas) {
        drawGraph(canvas.getContext('2d'), pointsRef.current, res.crashPoint, 'crashed', res.crashPoint, pokemon)
      }
      // Résultat final
      setResult({ ...res, payout: 0, isWin: false })
      updateBalance(res.balance - res.payout)
      setHistory(prev => [{ mult: res.crashPoint, win: false, bet }, ...prev].slice(0, 12))
      loadPokemon()
      return
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [pokemon, autoCash, bet])

  function handleCashout() {
    if (phaseRef.current !== 'running') return
    cancelAnimationFrame(rafRef.current)

    const res     = resultRef.current
    const cashedAt = multRef.current
    phaseRef.current = 'cashed'
    setPhase('cashed')

    const payout = Math.floor(bet * cashedAt)
    updateBalance(res.balance - bet + payout)
    setResult({ ...res, payout, isWin: true, cashedAt })
    setHistory(prev => [{ mult: cashedAt, win: true, bet }, ...prev].slice(0, 12))

    const canvas = canvasRef.current
    if (canvas) {
      drawGraph(canvas.getContext('2d'), pointsRef.current, cashedAt, 'cashed', null, pokemon)
    }
    loadPokemon()
  }

  async function handlePlay() {
    if (phase === 'running') { handleCashout(); return }
    if (!user || bet < 10 || bet > user.balance) return

    setError('')
    setPhase('waiting')
    phaseRef.current = 'waiting'
    pointsRef.current = []
    multRef.current   = 1.00
    setMult(1.00)
    setResult(null)
    setCrashPoint(null)

    try {
      const { data } = await axios.post('/api/games/crash', {
        bet,
        cashoutAt: parseFloat(autoCash) >= 1.01 ? parseFloat(autoCash) : null,
      })

      resultRef.current    = data
      startTimeRef.current = Date.now()
      phaseRef.current     = 'running'
      setPhase('running')
      rafRef.current = requestAnimationFrame(animate)

    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
      setPhase('idle')
      phaseRef.current = 'idle'
    }
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Dessiner le canvas initial
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) drawGraph(canvas.getContext('2d'), [], 1.00, 'idle', null, null)
  }, [])

  const isRunning = phase === 'running'
  const isWaiting = phase === 'waiting'
  const btnColor  = isRunning ? '#40f080' : '#f0c040'
  const btnLabel  = isRunning ? '💰 Encaisser !' : isWaiting ? 'En attente...' : '🚀 Lancer'

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>
          ← Lobby
        </Link>
        <span style={{ color: '#2a2a4a' }}>/</span>
        <span style={{ fontSize: 11, color: '#f0c040', fontWeight: 700 }}>📈 Crash</span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 8,
          background: 'rgba(240,192,64,0.1)', color: '#f0c040',
          border: '1px solid rgba(240,192,64,0.2)',
        }}>
          RTP 94%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* ── Zone principale ── */}
        <div>
          {/* Canvas */}
          <div style={{
            background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12,
            overflow: 'hidden', marginBottom: 12, position: 'relative',
          }}>
            <canvas ref={canvasRef} width={CW} height={CH} style={{ width: '100%', display: 'block' }} />

            {/* Pokémon info */}
            {pokemon && (
              <div style={{
                position: 'absolute', bottom: 10, right: 12,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <img src={SPRITE(pokemon.dex)} alt={pokemon.name}
                  style={{ width: 28, height: 28, imageRendering: 'pixelated', opacity: 0.5 }} />
                <span style={{ fontSize: 9, color: '#2e2e50' }}>{pokemon.name}</span>
              </div>
            )}
          </div>

          {/* Résultat */}
          {result && phase !== 'running' && (
            <div style={{
              background: result.isWin ? 'rgba(64,240,128,0.06)' : 'rgba(240,64,64,0.06)',
              border: `1px solid ${result.isWin ? 'rgba(64,240,128,0.2)' : 'rgba(240,64,64,0.2)'}`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: result.isWin ? '#40f080' : '#f06060' }}>
                  {result.isWin
                    ? `✅ Encaissé à ×${result.cashedAt?.toFixed(2)}`
                    : `💥 Crash à ×${result.crashPoint?.toFixed(2)}`}
                </div>
                <div style={{ fontSize: 10, color: '#44446a', marginTop: 2 }}>
                  {result.isWin ? 'Bien joué !' : 'Pas de chance...'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 20, fontWeight: 800,
                  color: result.isWin ? '#40f080' : '#f06060',
                }}>
                  {result.isWin ? `+${result.payout.toLocaleString()}` : `-${bet.toLocaleString()}`}
                </div>
                <div style={{ fontSize: 10, color: '#44446a' }}>jetons</div>
              </div>
            </div>
          )}

          {/* Historique des crashs */}
          {history.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap',
            }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: h.win ? 'rgba(64,240,128,0.1)' : 'rgba(240,64,64,0.1)',
                  color: h.win ? '#40f080' : '#f06060',
                  border: `1px solid ${h.win ? 'rgba(64,240,128,0.2)' : 'rgba(240,64,64,0.2)'}`,
                }}>
                  ×{h.mult.toFixed(2)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Panneau de contrôle ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: '#0a0a20', border: '1px solid #1e1e40',
            borderRadius: 12, padding: 16,
          }}>
            <BetInput bet={bet} setBet={setBet} disabled={isRunning || isWaiting} />

            {/* Auto cashout */}
            <div style={{ marginTop: 16 }}>
              <label style={{
                fontSize: 11, color: '#5a5a8a', textTransform: 'uppercase',
                letterSpacing: 1, display: 'block', marginBottom: 8,
              }}>
                Auto-encaissement à ×
              </label>
              <input
                type="number"
                value={autoCash}
                onChange={e => setAutoCash(e.target.value)}
                placeholder="Ex: 2.00"
                min="1.01"
                step="0.01"
                disabled={isRunning || isWaiting}
                style={{
                  width: '100%', background: '#07071a',
                  border: '1px solid #2a2a4a', borderRadius: 8,
                  padding: '9px 14px', color: '#d8d8f0',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  opacity: isRunning || isWaiting ? 0.5 : 1,
                }}
                onFocus={e => e.target.style.borderColor = '#f0c040'}
                onBlur={e => e.target.style.borderColor = '#2a2a4a'}
              />
              <div style={{ fontSize: 9, color: '#2e2e50', marginTop: 4 }}>
                Laisse vide pour encaisser manuellement
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: 12, padding: '8px 12px',
                background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.2)',
                borderRadius: 6, fontSize: 11, color: '#f06060',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePlay}
              disabled={isWaiting || (!isRunning && (bet < 10 || bet > (user?.balance || 0)))}
              style={{
                width: '100%', marginTop: 16,
                background: isWaiting ? '#2a2a4a' : btnColor,
                color: isWaiting ? '#5a5a8a' : '#07071a',
                fontWeight: 800, fontSize: 15, padding: '14px',
                borderRadius: 10, border: 'none',
                cursor: isWaiting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: isWaiting ? 'none' : `0 0 20px ${btnColor}44`,
              }}
            >
              {btnLabel}
            </button>

            {/* Info multiplicateur en cours */}
            {isRunning && (
              <div style={{
                marginTop: 10, textAlign: 'center',
                fontSize: 11, color: '#5a5a8a',
              }}>
                Gain si encaissement maintenant :{' '}
                <span style={{ color: '#40f080', fontWeight: 700 }}>
                  {Math.floor(bet * mult).toLocaleString()} jetons
                </span>
              </div>
            )}
          </div>

          {/* Comment jouer */}
          <div style={{
            background: '#0a0a20', border: '1px solid #1e1e40',
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ fontSize: 10, color: '#44446a', lineHeight: 1.8 }}>
              <div style={{ color: '#f0c040', fontWeight: 700, marginBottom: 6, fontSize: 11 }}>
                📖 Comment jouer
              </div>
              <div>🚀 Lance la partie et regarde le multiplicateur monter</div>
              <div>💰 Encaisse avant le crash pour gagner</div>
              <div>💥 Si tu attends trop... tout est perdu</div>
              <div>🤖 Configure l'auto-encaissement pour jouer safe</div>
            </div>
          </div>

          <LiveFeed compact />
        </div>
      </div>
    </div>
  )
}
