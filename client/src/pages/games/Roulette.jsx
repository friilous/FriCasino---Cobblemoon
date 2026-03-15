import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

// ── Config (miroir de roulette.js) ────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'common', label: 'Commun', count: 6, payout: 2.5,
    color: '#78c850', emoji: '⭐',
    desc: 'Normal · Eau · Plante · Sol · Vol',
    pokemons: [
      { dex: 132, name: 'Ditto'      },
      { dex: 9,   name: 'Tortank'    },
      { dex: 3,   name: 'Florizarre' },
      { dex: 50,  name: 'Taupiqueur' },
      { dex: 16,  name: 'Roucool'    },
    ],
  },
  {
    id: 'rare', label: 'Rare', count: 5, payout: 3,
    color: '#6890f0', emoji: '💙',
    desc: 'Feu · Électrik · Glace · Roche · Insecte',
    pokemons: [
      { dex: 6,   name: 'Dracaufeu'   },
      { dex: 25,  name: 'Pikachu'     },
      { dex: 131, name: 'Lokhlass'    },
      { dex: 74,  name: 'Racaillou'   },
      { dex: 127, name: 'Scarabeugue' },
    ],
  },
  {
    id: 'epic', label: 'Épique', count: 3, payout: 5,
    color: '#f85888', emoji: '💜',
    desc: 'Combat · Poison · Psy',
    pokemons: [
      { dex: 107, name: 'Tygnon'   },
      { dex: 110, name: 'Smogogo'  },
      { dex: 65,  name: 'Alakazam' },
    ],
  },
  {
    id: 'legendary', label: 'Légendaire', count: 1, payout: 15,
    color: '#f0b429', emoji: '✨',
    desc: 'Mew uniquement',
    pokemons: [{ dex: 151, name: 'Mew' }],
  },
]

const MAGIKARP = {
  id: 'magikarp', label: 'Magicarpe', count: 1, payout: 0,
  color: '#f87171', emoji: '🐟',
}

const ALL_SEGS = [...CATEGORIES, MAGIKARP]
const TOTAL    = ALL_SEGS.reduce((s, c) => s + c.count, 0) // 16

// Construire la roue côté client (même algo que serveur)
function buildWheel() {
  const byCat = ALL_SEGS.map(c => Array.from({ length: c.count }, () => c))
  const result = []
  let round = 0
  while (result.length < TOTAL) {
    for (const arr of byCat) {
      if (round < arr.length) result.push(arr[round])
    }
    round++
  }
  return result.slice(0, TOTAL)
}

const WHEEL = buildWheel()
const SLICE  = (2 * Math.PI) / TOTAL

const SPRITE = dex =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

// ── Canvas ────────────────────────────────────────────────────────────────────
const CW = 360, CH = 360
const CX = CW / 2, CY = CH / 2
const R_OUT = 158, R_IN = 48

function drawWheel(ctx, rotation, winCatId, spinning, selectedCatId, magImg) {
  ctx.clearRect(0, 0, CW, CH)

  // Fond
  ctx.fillStyle = '#06060f'
  ctx.fillRect(0, 0, CW, CH)

  // Anneau extérieur
  ctx.beginPath()
  ctx.arc(CX, CY, R_OUT + 12, 0, Math.PI * 2)
  ctx.strokeStyle = '#f0b429'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 4])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.beginPath()
  ctx.arc(CX, CY, R_OUT + 7, 0, Math.PI * 2)
  ctx.strokeStyle = '#f0b42940'
  ctx.lineWidth = 1
  ctx.stroke()

  // Billes décoratives
  for (let i = 0; i < 16; i++) {
    const a  = (Math.PI * 2 / 16) * i - Math.PI / 2
    const bx = CX + (R_OUT + 9) * Math.cos(a)
    const by = CY + (R_OUT + 9) * Math.sin(a)
    ctx.beginPath()
    ctx.arc(bx, by, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#f0b429bb'
    ctx.fill()
  }

  // Segments
  ctx.save()
  ctx.translate(CX, CY)
  ctx.rotate(rotation)

  for (let i = 0; i < TOTAL; i++) {
    const seg  = WHEEL[i]
    const a0   = SLICE * i - Math.PI / 2
    const a1   = a0 + SLICE

    const isWin      = !spinning && winCatId && seg.id === winCatId
    const isMagikarp = seg.id === 'magikarp'
    const isSelected = !spinning && !winCatId && selectedCatId && seg.id === selectedCatId

    // Fond segment
    ctx.beginPath()
    ctx.moveTo(R_IN * Math.cos(a0), R_IN * Math.sin(a0))
    ctx.arc(0, 0, R_OUT, a0, a1)
    ctx.arc(0, 0, R_IN, a1, a0, true)
    ctx.closePath()

    if (isWin) {
      ctx.shadowColor = seg.color
      ctx.shadowBlur  = 24
      ctx.fillStyle   = seg.color
    } else if (isSelected) {
      ctx.shadowColor = seg.color
      ctx.shadowBlur  = 12
      ctx.fillStyle   = seg.color + 'cc'
    } else if (isMagikarp && !spinning) {
      ctx.shadowBlur  = 0
      // Segment sombre et inquiétant — rouge très foncé tirant vers le noir
      ctx.fillStyle   = selectedCatId ? '#1a000820' : '#2a000a60'
    } else if (spinning) {
      ctx.shadowBlur  = 0
      ctx.fillStyle   = isMagikarp ? '#2a000a50' : seg.color + '55'
    } else {
      ctx.shadowBlur  = 0
      ctx.fillStyle   = selectedCatId && !isSelected
        ? seg.color + '18'
        : seg.color + '88'
    }
    ctx.fill()
    ctx.strokeStyle = '#06060f'
    ctx.lineWidth   = 1.5
    ctx.stroke()
    ctx.shadowBlur  = 0

    // Emoji / sprite
    const midA  = a0 + SLICE / 2
    const textR = R_OUT * 0.68 + R_IN * 0.32
    const tx    = textR * Math.cos(midA)
    const ty    = textR * Math.sin(midA)

    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(midA + Math.PI / 2)
    ctx.globalAlpha = (selectedCatId && !isSelected && !isMagikarp) ? 0.18
      : isMagikarp && selectedCatId ? 0.35
      : 1

    if (isMagikarp && magImg) {
      // Sprite qui occupe tout le segment
      ctx.imageSmoothingEnabled = false
      const segWidth = (R_OUT - R_IN) * 0.85  // largeur radiale du segment
      ctx.drawImage(magImg, -segWidth/2, -segWidth/2, segWidth, segWidth)
    } else {
      ctx.font         = `${isWin || isSelected ? 28 : 22}px serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(seg.emoji, 0, 0)
    }
    ctx.globalAlpha  = 1
    ctx.restore()
  }

  ctx.restore()

  // Hub central
  const hubGr = ctx.createRadialGradient(CX - 8, CY - 8, 2, CX, CY, R_IN)
  hubGr.addColorStop(0, '#2a2a4a')
  hubGr.addColorStop(1, '#080818')
  ctx.beginPath()
  ctx.arc(CX, CY, R_IN, 0, Math.PI * 2)
  ctx.fillStyle   = hubGr
  ctx.fill()
  ctx.strokeStyle = '#f0b429'
  ctx.lineWidth   = 3
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(CX, CY, R_IN - 8, 0, Math.PI * 2)
  ctx.strokeStyle = '#f0b42930'
  ctx.lineWidth   = 1
  ctx.stroke()

  const winCat = winCatId ? ALL_SEGS.find(c => c.id === winCatId) : null
  ctx.font         = '22px serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    spinning ? '🌀' : winCat ? winCat.emoji : '🎡',
    CX, CY
  )
}

// ── Composant roue ────────────────────────────────────────────────────────────
function RouletteWheel({ selectedCatId, winCatId, winningIndex, spinning }) {
  const canvasRef   = useRef(null)
  const rotRef      = useRef(0)
  const rafRef      = useRef(null)
  const phaseRef    = useRef('idle')
  const magImgRef   = useRef(null)  // sprite Magicarpe pré-chargé

  // Charger le sprite Magicarpe une seule fois
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png'
    img.onload = () => {
      magImgRef.current = img
      // Forcer un redraw pour afficher le sprite immédiatement
      const canvas = canvasRef.current
      if (canvas && phaseRef.current === 'idle') {
        drawWheel(canvas.getContext('2d'), rotRef.current, null, false, null, img)
      }
    }
  }, [])

  // Render initial
  useEffect(() => {
    const c = canvasRef.current
    if (c) drawWheel(c.getContext('2d'), 0, null, false, null, magImgRef.current)
  }, [])

  // Mettre à jour surbrillance quand sélection change (hors spin)
  useEffect(() => {
    if (!spinning && !winCatId) {
      const c = canvasRef.current
      if (c) drawWheel(c.getContext('2d'), rotRef.current, null, false, selectedCatId, magImgRef.current)
    }
  }, [selectedCatId, spinning, winCatId])

  // Spinning
  useEffect(() => {
    if (!spinning) return
    phaseRef.current = 'spinning'
    const t0 = performance.now()

    const loop = (now) => {
      if (phaseRef.current !== 'spinning') return
      const speed = Math.min(0.30, 0.05 + (now - t0) / 2500 * 0.25)
      rotRef.current += speed
      const c = canvasRef.current
      if (c) drawWheel(c.getContext('2d'), rotRef.current, null, true, null, magImgRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      phaseRef.current = 'idle'
    }
  }, [spinning])

  // Arrêt sur le bon segment
  useEffect(() => {
    if (!winCatId || spinning) return
    cancelAnimationFrame(rafRef.current)
    phaseRef.current = 'stopping'

    // Utiliser l'index exact du serveur
    const idx      = winningIndex !== undefined ? winningIndex % TOTAL : WHEEL.findIndex(s => s.id === winCatId)
    const segAngle = SLICE * idx + SLICE / 2
    // rotation finale = -(segAngle) de façon à ce que la flèche (en haut) pointe dessus
    const currentNorm  = ((rotRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const targetNorm   = ((-(segAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    let delta = targetNorm - currentNorm
    if (delta < 0) delta += Math.PI * 2
    const target   = rotRef.current + delta + Math.PI * 2 * 3
    const startRot = rotRef.current
    const t0       = performance.now()
    const dur      = 2200
    const easeOut  = t => 1 - Math.pow(1 - t, 4)

    const stop = (now) => {
      const p = Math.min((now - t0) / dur, 1)
      rotRef.current = startRot + (target - startRot) * easeOut(p)
      const c = canvasRef.current
      if (c) drawWheel(c.getContext('2d'), rotRef.current, p >= 1 ? winCatId : null, false, null, magImgRef.current)
      if (p < 1) rafRef.current = requestAnimationFrame(stop)
      else { rotRef.current = target; phaseRef.current = 'done' }
    }
    rafRef.current = requestAnimationFrame(stop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [winCatId, spinning])

  return (
    <div style={{ position: 'relative', width: CW, margin: '0 auto' }}>
      {/* Flèche — pointe vers le bas (vers la roue) */}
      <div style={{
        position:  'absolute',
        top:       CY - R_OUT - 20,
        left:      '50%',
        transform: 'translateX(-50%)',
        zIndex:    10,
        filter:    'drop-shadow(0 0 8px #f0b429)',
      }}>
        <svg width="22" height="28" viewBox="0 0 22 28">
          <polygon points="11,26 1,2 21,2" fill="#f0b429" stroke="#fff3" strokeWidth="1.5"/>
        </svg>
      </div>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{ width: '100%', display: 'block' }}
      />
    </div>
  )
}

// ── Carte catégorie ───────────────────────────────────────────────────────────
function CategoryCard({ cat, selected, onSelect, disabled }) {
  const isSelected = selected === cat.id
  const isMagikarp = cat.id === 'magikarp'

  return (
    <div style={{
      background:   isSelected ? cat.color + '20' : isMagikarp ? '#f8717108' : '#0d0d1e',
      border:       `2px solid ${isSelected ? cat.color : isMagikarp ? '#f8717130' : '#1e1e35'}`,
      boxShadow:    isSelected ? `0 0 16px ${cat.color}35` : 'none',
      borderRadius: 14,
      padding:      '10px 12px',
      transition:   'all 0.18s',
      cursor:       isMagikarp ? 'default' : disabled ? 'not-allowed' : 'pointer',
      opacity:      isMagikarp ? 0.7 : 1,
    }}
      onClick={() => !disabled && !isMagikarp && onSelect(cat.id)}
    >
      {/* Titre + payout */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{cat.emoji}</span>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 800,
              color: isSelected ? cat.color : isMagikarp ? '#f87171' : '#ddd',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {cat.label}
              {isMagikarp && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: '#f87171', background: '#f8717120',
                  padding: '1px 6px', borderRadius: 6,
                }}>
                  NON PARIABLE
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
              {isMagikarp ? 'Fait perdre la mise · Segment piège' : cat.desc}
            </div>
          </div>
        </div>
        {!isMagikarp && (
          <div style={{
            background:  isSelected ? cat.color : cat.color + '25',
            color:       isSelected ? '#000' : cat.color,
            fontWeight:  900, fontSize: 15,
            padding:     '3px 12px', borderRadius: 20,
            fontFamily:  'monospace',
            transition:  'all 0.18s',
            flexShrink:  0, marginLeft: 8,
          }}>
            ×{cat.payout}
          </div>
        )}
        {isMagikarp && (
          <div style={{
            color: '#f8717160', fontWeight: 900, fontSize: 14,
            fontFamily: 'monospace', flexShrink: 0, marginLeft: 8,
          }}>
            ×0 💀
          </div>
        )}
      </div>

      {/* Sprites */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {isMagikarp ? (
          <img src={SPRITE(129)} alt="Magicarpe"
            style={{ width: 36, height: 36, imageRendering: 'pixelated', filter: 'drop-shadow(0 0 5px #f87171)' }}
          />
        ) : (
          cat.pokemons.map(p => (
            <img key={p.dex} src={SPRITE(p.dex)} alt={p.name} title={p.name}
              style={{
                width: 32, height: 32, imageRendering: 'pixelated', objectFit: 'contain',
                filter: isSelected ? `drop-shadow(0 0 4px ${cat.color}) brightness(1.1)` : 'brightness(0.65)',
                transition: 'filter 0.18s',
              }}
            />
          ))
        )}

        {/* Indicateur segments */}
        {!isMagikarp && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
            {Array.from({ length: cat.count }, (_, i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isSelected ? cat.color : cat.color + '50',
                transition: 'background 0.18s',
              }}/>
            ))}
            <span style={{ fontSize: 9, color: '#444', marginLeft: 3, fontFamily: 'monospace' }}>
              {cat.count}/{TOTAL}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Roulette() {
  const { user, updateBalance } = useAuth()

  const [bet, setBet]               = useState(100)
  const [selected, setSelected]     = useState(null)
  const [spinning, setSpinning]     = useState(false)
  const [winCatId, setWinCatId]     = useState(null)
  const [winningIndex, setWinningIndex] = useState(undefined)
  const [result, setResult]         = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [error, setError]           = useState('')
  const [history, setHistory]       = useState([])

  const selectedCat = CATEGORIES.find(c => c.id === selected)

  function handleSelect(id) {
    setSelected(id)
    if (showResult) {
      setWinCatId(null)
      setWinningIndex(undefined)
      setShowResult(false)
      setResult(null)
    }
  }

  async function handleSpin() {
    if (spinning || !user || !selected || bet < 10 || bet > user.balance) return
    setSpinning(true)
    setResult(null)
    setShowResult(false)
    setWinCatId(null)
    setWinningIndex(undefined)
    setError('')

    try {
      const { data } = await axios.post('/api/games/roulette', {
        bet,
        betType:  'category',
        betValue: selected,
      })
      data.payout = data.isWin ? Math.floor(bet * data.multiplier) : 0

      // 1. Laisser tourner 1.8s
      setTimeout(() => {
        setSpinning(false)
        setWinningIndex(data.winningIndex)
        setWinCatId(data.winning.id)

        // 2. Afficher le résultat après l'animation d'arrêt (2.2s + buffer)
        setTimeout(() => {
          updateBalance(data.balance)
          setResult(data)
          setShowResult(true)
          const pnl = data.payout - bet
          setHistory(prev => [
            { id: Date.now(), cat: data.winning, pnl, isWin: data.isWin },
            ...prev,
          ].slice(0, 8))
        }, 2500)
      }, 1800)

    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
      setSpinning(false)
    }
  }

  const isWin  = result?.isWin
  const winCat = winCatId ? ALL_SEGS.find(c => c.id === winCatId) : null
  const isMagikarped = showResult && winCatId === 'magikarp'

  return (
    <div className="min-h-screen bg-casino-bg py-10 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-3 mb-8">
          <Link to="/casino" className="text-gray-500 hover:text-white text-sm transition-colors">← Lobby</Link>
          <span className="text-gray-700">/</span>
          <span className="text-casino-gold font-semibold">🎡 Roulette Pokémon</span>
          <span className="badge-gold ml-auto">RTP 93.8%</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Roue ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className={`card border-2 transition-all duration-700
              ${isMagikarped ? 'border-red-500/50 shadow-[0_0_20px_#ef444420]'
              : showResult && isWin ? 'border-casino-gold/60 shadow-[0_0_30px_#f0b42920]'
              : 'border-casino-border'}`}
            >
              <div className="text-center mb-2">
                <h2 className="font-casino text-2xl font-bold text-gradient">Roulette Pokémon</h2>
                <p className="text-xs text-gray-500 mt-1">
                  16 segments · RTP 93.8% · <span style={{ color: '#f87171' }}>🐟 Magicarpe = mise perdue</span>
                </p>
              </div>

              <RouletteWheel
                selectedCatId={selected}
                winCatId={winCatId}
                winningIndex={winningIndex}
                spinning={spinning}
              />

              {/* Pari actif */}
              {selectedCat && !spinning && !winCatId && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, marginTop: 10, padding: '8px 14px',
                  background: selectedCat.color + '12',
                  border: `1px solid ${selectedCat.color}30`,
                  borderRadius: 12,
                }}>
                  <span style={{ fontSize: 16 }}>{selectedCat.emoji}</span>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    Tu mises sur <span style={{ color: selectedCat.color, fontWeight: 700 }}>{selectedCat.label}</span>
                    {' '}— {selectedCat.count} segments illuminés sur {TOTAL}
                  </div>
                  <div style={{ color: selectedCat.color, fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                    ×{selectedCat.payout}
                  </div>
                </div>
              )}

              {/* Résultat */}
              {showResult && result && (
                <div className={`p-4 rounded-2xl mt-3 text-center transition-all duration-500
                  ${isMagikarped ? 'bg-red-500/8 border border-red-500/25'
                  : isWin ? 'bg-green-500/8 border border-green-400/25'
                  : 'bg-white/3 border border-white/6'}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                    {winCat && (
                      <img
                        src={SPRITE(winCat.id === 'magikarp' ? 129 : (CATEGORIES.find(c=>c.id===winCat.id)?.pokemons[0]?.dex ?? 151))}
                        alt={winCat.label}
                        style={{
                          width: 48, height: 48, imageRendering: 'pixelated',
                          filter: isMagikarped
                            ? 'brightness(0.5) sepia(1) hue-rotate(0deg)'
                            : `drop-shadow(0 0 10px ${winCat.color})`,
                        }}
                      />
                    )}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: isMagikarped ? '#f87171' : winCat?.color }}>
                        {winCat?.emoji} {winCat?.label}
                        {isMagikarped && ' — Pas de chance...'}
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>Segment tombé</div>
                    </div>
                  </div>

                  {isMagikarped ? (
                    <>
                      <div className="text-red-400 text-lg font-black">🐟 Magicarpe vous nargue !</div>
                      <div className="text-red-400/60 text-sm mt-1">−{bet.toLocaleString()} jetons</div>
                    </>
                  ) : isWin ? (
                    <>
                      <div className="text-2xl font-black text-green-400">
                        +{result.payout.toLocaleString()} jetons
                      </div>
                      <div className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-white/8 text-gray-300">
                        ×{result.multiplier}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-500 text-base">Pas de chance...</div>
                      <div className="text-red-400/60 text-sm mt-1">−{bet.toLocaleString()} jetons</div>
                    </>
                  )}
                </div>
              )}

              {/* Indicateur en cours */}
              {(spinning || (winCatId && !showResult)) && (
                <div className="flex items-center justify-center gap-2 mt-3 py-1">
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#f0b429',
                      animation: `dotBounce 0.7s ease-in-out ${i*0.15}s infinite alternate`,
                    }}/>
                  ))}
                  <span className="text-gray-400 text-sm ml-1">
                    {spinning ? 'La roue tourne...' : 'Arrêt en cours...'}
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mt-3">
                  ⚠️ {error}
                </div>
              )}

              <div className="mt-4">
                <BetInput bet={bet} setBet={setBet} disabled={spinning || (!!winCatId && !showResult)} />
              </div>

              <button
                onClick={handleSpin}
                disabled={spinning || !selected || bet < 10 || bet > (user?.balance ?? 0) || (!!winCatId && !showResult)}
                className="btn-gold w-full py-4 text-lg mt-4"
                style={{ opacity: !selected ? 0.5 : 1 }}
              >
                {spinning || (winCatId && !showResult)
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="inline-block animate-spin">🌀</span>
                      En cours...
                    </span>
                  : !selected
                  ? '← Choisis une catégorie'
                  : `🎡 Miser sur ${selectedCat?.emoji} ${selectedCat?.label} !`}
              </button>
            </div>

            {/* Historique */}
            {history.length > 0 && (
              <div className="card">
                <h3 className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Derniers résultats</h3>
                <div className="flex gap-2 flex-wrap">
                  {history.map(h => {
                    const cat = ALL_SEGS.find(c => c.id === h.cat.id)
                    return (
                      <div key={h.id} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: h.cat.id === 'magikarp' ? '#f8717112' : h.isWin ? '#22c55e12' : '#ffffff08',
                        border: `1px solid ${h.cat.id === 'magikarp' ? '#f8717130' : h.isWin ? '#22c55e30' : '#ffffff10'}`,
                        borderRadius: 20, padding: '4px 10px',
                      }}>
                        <span style={{ fontSize: 12 }}>{cat?.emoji}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: h.cat.id === 'magikarp' ? '#f87171' : h.isWin ? '#4ade80' : '#6b7280',
                        }}>
                          {h.pnl >= 0 ? '+' : ''}{h.pnl.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sélection ── */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-casino font-bold text-casino-gold mb-1 text-sm uppercase tracking-wide">
                Choisis ta catégorie
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Plus c'est rare, plus le multiplicateur est grand
              </p>

              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    selected={selected}
                    onSelect={handleSelect}
                    disabled={spinning || (!!winCatId && !showResult)}
                  />
                ))}
                {/* Magicarpe — affiché mais non cliquable */}
                <CategoryCard
                  cat={MAGIKARP}
                  selected={selected}
                  onSelect={() => {}}
                  disabled={true}
                />
              </div>
            </div>

            <LiveFeed compact />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}