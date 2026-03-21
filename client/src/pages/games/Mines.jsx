import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const GRID = 25
const COLS = 5
const VOLTORBE_DEX = 100
const SPRITE = dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

// ── Jeton de casino dessiné sur canvas ───────────────────────────────────────
function drawToken(ctx, x, y, size) {
  const r = size / 2
  // Fond doré
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = '#f0c040'
  ctx.shadowColor = '#f0c040'
  ctx.shadowBlur = 10
  ctx.fill()
  ctx.shadowBlur = 0
  // Bordure
  ctx.strokeStyle = '#ffd060'
  ctx.lineWidth = 2
  ctx.stroke()
  // Cercle intérieur
  ctx.beginPath()
  ctx.arc(x, y, r * 0.65, 0, Math.PI * 2)
  ctx.strokeStyle = '#a07020'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Mini Poké Ball au centre
  ctx.beginPath()
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = '#a07020'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r * 0.15, 0, Math.PI * 2)
  ctx.fillStyle = '#f0c040'
  ctx.fill()
  // Ligne horizontale
  ctx.beginPath()
  ctx.moveTo(x - r * 0.35, y)
  ctx.lineTo(x + r * 0.35, y)
  ctx.strokeStyle = '#a07020'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

// ── Carte de la grille ────────────────────────────────────────────────────────
function Cell({ index, state, onClick, disabled }) {
  // state: 'hidden' | 'token' | 'mine' | 'mine_other'
  const canvasRef = useRef(null)

  useEffect(() => {
    if (state !== 'token') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 64, 64)
    drawToken(ctx, 32, 32, 44)
  }, [state])

  const base = {
    width: 64, height: 64, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.15s',
    position: 'relative',
    overflow: 'hidden',
  }

  if (state === 'hidden') {
    return (
      <div
        onClick={() => !disabled && onClick(index)}
        style={{
          ...base,
          background: '#12122a',
          border: '1px solid #2a2a4a',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = '#f0c04088' }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = '#2a2a4a' }}
      >
        <span style={{ fontSize: 20, opacity: 0.3 }}>?</span>
      </div>
    )
  }

  if (state === 'token') {
    return (
      <div style={{
        ...base,
        background: 'rgba(240,192,64,0.1)',
        border: '1px solid rgba(240,192,64,0.4)',
        animation: 'tokenReveal 0.3s ease',
      }}>
        <canvas ref={canvasRef} width={64} height={64} style={{ position: 'absolute', inset: 0 }} />
      </div>
    )
  }

  if (state === 'mine') {
    return (
      <div style={{
        ...base,
        background: 'rgba(240,64,64,0.2)',
        border: '2px solid rgba(240,64,64,0.6)',
        boxShadow: '0 0 16px rgba(240,64,64,0.4)',
        animation: 'explode 0.4s ease',
      }}>
        <img
          src={SPRITE(VOLTORBE_DEX)}
          alt="Voltorbe"
          style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
        />
      </div>
    )
  }

  if (state === 'mine_other') {
    return (
      <div style={{
        ...base,
        background: 'rgba(240,64,64,0.06)',
        border: '1px solid rgba(240,64,64,0.2)',
        opacity: 0.7,
      }}>
        <img
          src={SPRITE(VOLTORBE_DEX)}
          alt="Voltorbe"
          style={{ width: 58, height: 58, imageRendering: 'pixelated', filter: 'grayscale(0.5)' }}
        />
      </div>
    )
  }

  return null
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Mines() {
  const { user, updateBalance } = useAuth()

  const [bet,        setBet]        = useState(100)
  const [minesCount, setMinesCount] = useState(3)
  const [phase,      setPhase]      = useState('idle')   // idle | playing | exploded | cashed | won
  const [revealed,   setRevealed]   = useState([])       // indices des cases révélées
  const [mines,      setMines]      = useState([])       // positions des mines (révélées à la fin)
  const [multiplier, setMultiplier] = useState(1.00)
  const [payout,     setPayout]     = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [history,    setHistory]    = useState([])
  const [hitMine,    setHitMine]    = useState(null)     // index de la mine touchée

  // État de chaque case
  function getCellState(index) {
    if (phase === 'exploded' || phase === 'cashed' || phase === 'won') {
      if (index === hitMine)           return 'mine'
      if (mines.includes(index))       return 'mine_other'
      if (revealed.includes(index))    return 'token'
    }
    if (revealed.includes(index))      return 'token'
    return 'hidden'
  }

  async function handleStart() {
    if (bet < 10 || bet > (user?.balance || 0)) return
    setLoading(true); setError('')
    try {
      const { data } = await axios.post('/api/games/mines', {
        action: 'start', bet, minesCount,
      })
      updateBalance(data.balance)
      setPhase('playing')
      setRevealed([])
      setMines([])
      setMultiplier(1.00)
      setPayout(0)
      setHitMine(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function handleReveal(index) {
    if (phase !== 'playing' || revealed.includes(index) || loading) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/games/mines', {
        action: 'reveal', cellIndex: index,
      })

      if (data.status === 'exploded') {
        setHitMine(index)
        setMines(data.mines || [])
        setRevealed(prev => [...prev, index])
        setPhase('exploded')
        setMultiplier(0)
        setPayout(0)
        setHistory(prev => [{ status: 'exploded', bet, payout: 0, mines: minesCount }, ...prev].slice(0, 8))
      } else {
        setRevealed(prev => [...prev, index])
        setMultiplier(data.multiplier)
        setPayout(data.payout)
        if (data.status === 'won') {
          setMines(data.mines || [])
          setPhase('won')
          updateBalance(data.balance)
          setHistory(prev => [{ status: 'won', bet, payout: data.payout, mines: minesCount }, ...prev].slice(0, 8))
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function handleCashout() {
    if (phase !== 'playing' || revealed.length === 0 || loading) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/games/mines', { action: 'cashout' })
      setMines(data.mines || [])
      setPhase('cashed')
      setMultiplier(data.multiplier)
      setPayout(data.payout)
      updateBalance(data.balance)
      setHistory(prev => [{ status: 'cashed', bet, payout: data.payout, mines: minesCount }, ...prev].slice(0, 8))
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const isPlaying   = phase === 'playing'
  const isDone      = ['exploded','cashed','won'].includes(phase)
  const canCashout  = isPlaying && revealed.length > 0 && !loading

  const statusColor = phase === 'exploded' ? '#f06060'
    : phase === 'cashed' || phase === 'won' ? '#40f080'
    : '#f0c040'

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>← Lobby</Link>
        <span style={{ color: '#2a2a4a' }}>/</span>
        <span style={{ fontSize: 11, color: '#f0c040', fontWeight: 700 }}>💣 Mines</span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 8,
          background: 'rgba(240,192,64,0.1)', color: '#f0c040',
          border: '1px solid rgba(240,192,64,0.2)',
        }}>RTP 92%</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* ── Grille ── */}
        <div>
          {/* Multiplicateur en cours */}
          {isPlaying && revealed.length > 0 && (
            <div style={{
              background: 'rgba(240,192,64,0.06)',
              border: '1px solid rgba(240,192,64,0.2)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 11, color: '#5a5a8a' }}>
                {revealed.length} case{revealed.length > 1 ? 's' : ''} retournée{revealed.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 13, color: '#f0c040', fontWeight: 700 }}>
                  ×{multiplier}
                </div>
                <div style={{ fontSize: 13, color: '#40f080', fontWeight: 800 }}>
                  {payout.toLocaleString()} jetons
                </div>
              </div>
            </div>
          )}

          {/* Grille 5×5 */}
          <div style={{
            background: '#0a0a20',
            border: '1px solid #1e1e40',
            borderRadius: 14, padding: 20,
            marginBottom: 12,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 64px)',
              gap: 8,
              justifyContent: 'center',
            }}>
              {Array.from({ length: GRID }, (_, i) => (
                <Cell
                  key={i}
                  index={i}
                  state={getCellState(i)}
                  onClick={handleReveal}
                  disabled={!isPlaying || loading}
                />
              ))}
            </div>
          </div>

          {/* Résultat final */}
          {isDone && (
            <div style={{
              background: phase === 'exploded' ? 'rgba(240,64,64,0.06)' : 'rgba(64,240,128,0.06)',
              border: `1px solid ${phase === 'exploded' ? 'rgba(240,64,64,0.2)' : 'rgba(64,240,128,0.2)'}`,
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: statusColor }}>
                  {phase === 'exploded' ? '💥 Voltorbe ! Tout est perdu !'
                    : phase === 'won' ? '🏆 Toutes les cases safe !'
                    : `✅ Encaissé à ×${multiplier}`}
                </div>
                <div style={{ fontSize: 10, color: '#44446a', marginTop: 2 }}>
                  {revealed.length} case{revealed.length > 1 ? 's' : ''} retournée{revealed.length > 1 ? 's' : ''}
                  {' '}· {minesCount} Voltorbe{minesCount > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: statusColor }}>
                  {phase === 'exploded' ? `-${bet.toLocaleString()}` : `+${(payout - bet).toLocaleString()}`}
                </div>
                <div style={{ fontSize: 10, color: '#44446a' }}>jetons</div>
              </div>
            </div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: h.status === 'exploded' ? 'rgba(240,64,64,0.1)' : 'rgba(64,240,128,0.1)',
                  color: h.status === 'exploded' ? '#f06060' : '#40f080',
                  border: `1px solid ${h.status === 'exploded' ? 'rgba(240,64,64,0.2)' : 'rgba(64,240,128,0.2)'}`,
                }}>
                  {h.status === 'exploded' ? '💥' : `+${(h.payout - h.bet).toLocaleString()}`}
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

            {!isPlaying ? (
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading} />

                {/* Nombre de Voltorbe */}
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <label style={{ fontSize: 11, color: '#5a5a8a', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Voltorbe
                    </label>
                    <div style={{
                      fontSize: 14, fontWeight: 800, color: '#f06060',
                      background: 'rgba(240,64,64,0.1)', padding: '2px 10px', borderRadius: 8,
                      border: '1px solid rgba(240,64,64,0.2)',
                    }}>
                      {minesCount}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1} max={24} value={minesCount}
                    onChange={e => setMinesCount(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#f06060' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#2e2e50', marginTop: 2 }}>
                    <span>1 (facile)</span>
                    <span>24 (extrême)</span>
                  </div>
                </div>

                {/* Multiplicateur potentiel */}
                <div style={{
                  marginTop: 12, padding: '8px 12px',
                  background: '#07071a', border: '1px solid #1e1e40',
                  borderRadius: 8, fontSize: 10, color: '#5a5a8a',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>1ère case safe</span>
                  <span style={{ color: '#f0c040', fontWeight: 700 }}>
                    ×{(0.92 * (25 / (25 - minesCount))).toFixed(2)}
                  </span>
                </div>

                {error && (
                  <div style={{
                    marginTop: 10, padding: '8px 12px',
                    background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.2)',
                    borderRadius: 6, fontSize: 11, color: '#f06060',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={loading || bet < 10 || bet > (user?.balance || 0)}
                  style={{
                    width: '100%', marginTop: 14,
                    background: '#f0c040', color: '#07071a',
                    fontWeight: 800, fontSize: 15, padding: '14px',
                    borderRadius: 10, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || bet > (user?.balance || 0) ? 0.5 : 1,
                    boxShadow: '0 0 20px rgba(240,192,64,0.25)',
                  }}
                >
                  {loading ? 'Démarrage...' : isDone ? '🔄 Nouvelle partie' : '💣 Commencer'}
                </button>
              </>
            ) : (
              // En jeu
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: '#5a5a8a' }}>
                    Mise : <span style={{ color: '#f0c040', fontWeight: 700 }}>{bet.toLocaleString()}</span>
                    {' '}· <span style={{ color: '#f06060' }}>{minesCount} 💣</span>
                  </div>
                </div>

                <div style={{
                  textAlign: 'center', padding: '12px',
                  background: 'rgba(240,192,64,0.05)',
                  border: '1px solid rgba(240,192,64,0.15)',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 10, color: '#5a5a8a', marginBottom: 4 }}>
                    Multiplicateur actuel
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f0c040' }}>
                    ×{multiplier}
                  </div>
                  {revealed.length > 0 && (
                    <div style={{ fontSize: 12, color: '#40f080', marginTop: 2 }}>
                      {payout.toLocaleString()} jetons
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCashout}
                  disabled={!canCashout}
                  style={{
                    width: '100%', padding: '14px',
                    background: canCashout ? '#40f080' : '#2a2a4a',
                    color: canCashout ? '#07071a' : '#5a5a8a',
                    fontWeight: 800, fontSize: 14, borderRadius: 10, border: 'none',
                    cursor: canCashout ? 'pointer' : 'not-allowed',
                    boxShadow: canCashout ? '0 0 20px rgba(64,240,128,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {revealed.length === 0
                    ? 'Retourne une case d\'abord'
                    : `💰 Encaisser ${payout.toLocaleString()} jetons`}
                </button>

                <div style={{ fontSize: 10, color: '#2e2e50', textAlign: 'center' }}>
                  Clique sur les cases pour trouver les jetons<br/>
                  Évite les Voltorbe 💣
                </div>
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
              <div>🎯 Choisis le nombre de Voltorbe</div>
              <div>💣 Plus il y en a, plus les gains sont grands</div>
              <div>🪙 Retourne des cases pour trouver des jetons</div>
              <div>💰 Encaisse quand tu veux avant d'exploser</div>
              <div>💥 Un Voltorbe = tout est perdu !</div>
            </div>
          </div>

          <LiveFeed compact />
        </div>
      </div>

      <style>{`
        @keyframes tokenReveal {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes explode {
          0%   { transform: scale(1);    }
          30%  { transform: scale(1.3);  }
          100% { transform: scale(1);    }
        }
      `}</style>
    </div>
  )
}
