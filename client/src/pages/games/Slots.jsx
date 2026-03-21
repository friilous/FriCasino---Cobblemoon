import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

// ── Symboles ──────────────────────────────────────────────────────────────────
const SYMBOLS = {
  mew:        { label: 'Mew',        color: '#f0b429', rarity: 'Wild',       isWild: true,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png' },
  masterball: { label: 'Master Ball', color: '#a855f7', rarity: 'Légendaire', isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png' },
  dragon:     { label: 'Dragon',      color: '#7c3aed', rarity: 'Ultra Rare', isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png' },
  dark:       { label: 'Ténèbres',    color: '#9ca3af', rarity: 'Rare',       isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/197.png' },
  psychic:    { label: 'Psy',         color: '#ec4899', rarity: 'Rare',       isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png' },
  electric:   { label: 'Électrik',    color: '#eab308', rarity: 'Peu commun', isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
  fire:       { label: 'Feu',         color: '#f97316', rarity: 'Peu commun', isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png' },
  water:      { label: 'Eau',         color: '#3b82f6', rarity: 'Commun',     isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png' },
  grass:      { label: 'Plante',      color: '#22c55e', rarity: 'Commun',     isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png' },
  magikarp:   { label: 'Magicarpe',   color: '#f87171', rarity: 'Commun',     isWild: false,
                sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png' },
}

const PAYOUTS_TABLE = [
  { id: 'mew',        p3: 'Wild', p2: 'Wild'  },
  { id: 'masterball', p3: '×190', p2: '×19'   },
  { id: 'dragon',     p3: '×76',  p2: '×7.5'  },
  { id: 'dark',       p3: '×38',  p2: '×4.8'  },
  { id: 'psychic',    p3: '×19',  p2: '×2.8'  },
  { id: 'electric',   p3: '×10',  p2: '×1.9'  },
  { id: 'fire',       p3: '×4.5', p2: '×1.4'  },
  { id: 'water',      p3: '×4.5', p2: '×1.4'  },
  { id: 'grass',      p3: '×4.5', p2: '×1.4'  },
  { id: 'magikarp',   p3: '×0.5', p2: '—'     },
]

const SYMBOL_IDS = Object.keys(SYMBOLS)
const SLOT_H = 96
const STRIP_LEN = 30  // longueur de la bande, les 3 derniers = résultats finaux

function symById(id) { return SYMBOLS[id] ?? SYMBOLS.magikarp }

const WEIGHTS = { mew:2, masterball:3, dragon:5, dark:8, psychic:10, electric:14, fire:18, water:18, grass:18, magikarp:24 }
const TOTAL_W = Object.values(WEIGHTS).reduce((a,b)=>a+b,0)
function randSymId() {
  let r = Math.random() * TOTAL_W
  for (const id of SYMBOL_IDS) { r -= WEIGHTS[id]; if (r <= 0) return id }
  return 'magikarp'
}
function makeStrip(finals) {
  const s = Array.from({ length: STRIP_LEN }, randSymId)
  s[STRIP_LEN - 3] = finals[0]
  s[STRIP_LEN - 2] = finals[1]
  s[STRIP_LEN - 1] = finals[2]
  return s
}

// ── Composant Reel ────────────────────────────────────────────────────────────
// strip est un STATE (React re-render avec les bons symboles quand ça change)
// translateY est appliqué directement sur le DOM via bandRef (zéro re-render pendant le scroll)
// → pas de snap possible car la structure DOM ne change jamais pendant l'animation
function Reel({ reelIndex, spinTrigger, stopDelay, onStopped, isWin, getPendingSyms }) {
  const endPx = -(STRIP_LEN - 3) * SLOT_H  // position finale = 3 derniers slots visibles

  const [strip, setStrip]     = useState(() => makeStrip([randSymId(), randSymId(), randSymId()]))
  const [settled, setSettled] = useState(true)
  const [flash, setFlash]     = useState(false)

  const bandRef = useRef(null)  // DOM ref → translateY direct, pas de re-render
  const rafRef  = useRef(null)
  const stopRef = useRef(null)

  const applyPos = (px) => {
    if (bandRef.current) bandRef.current.style.transform = `translateY(${px}px)`
  }

  useEffect(() => {
    if (!spinTrigger) return

    cancelAnimationFrame(rafRef.current)
    clearTimeout(stopRef.current)

    setSettled(false)
    setFlash(false)

    // Construire la nouvelle bande avec les vrais résultats aux 3 dernières positions
    const finals = getPendingSyms(reelIndex)
    const newStrip = makeStrip(finals)

    // 1. Mettre la position à 0 avant le re-render
    applyPos(0)

    // 2. Mettre à jour la bande (state → React re-render → bons symboles dans le DOM)
    setStrip(newStrip)

    const totalDuration = stopDelay + 550
    const t0 = performance.now()

    const animate = (now) => {
      const elapsed  = now - t0
      const progress = Math.min(elapsed / totalDuration, 1)
      // ease-out cubic : rapide au début, décélération forte à la fin
      const eased = 1 - Math.pow(1 - progress, 3)
      applyPos(eased * endPx)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        applyPos(endPx)
        stopRef.current = setTimeout(() => {
          setSettled(true)
          setFlash(true)
          setTimeout(() => setFlash(false), 600)
          onStopped?.()
        }, 20)
      }
    }

    // Attendre 2 frames : React render la nouvelle bande, PUIS on anime
    rafRef.current = requestAnimationFrame(() => {
      applyPos(0)  // confirmer position 0 après re-render
      rafRef.current = requestAnimationFrame(animate)
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(stopRef.current)
    }
  }, [spinTrigger])

  const midWins = settled && isWin
  // Indices dans la bande des 3 slots visibles à l'arrêt
  const IDX_TOP = STRIP_LEN - 3
  const IDX_MID = STRIP_LEN - 2
  const IDX_BOT = STRIP_LEN - 1

  return (
    <div style={{
      width: 108, height: SLOT_H * 3,
      background: '#0b0b1a', borderRadius: 14,
      border: `2px solid ${midWins ? '#f0b429' : flash ? '#ffffff40' : '#1a1a30'}`,
      boxShadow: midWins ? '0 0 20px #f0b42940' : 'none',
      overflow: 'hidden',
      transition: 'border-color 0.3s, box-shadow 0.4s',
      position: 'relative',
    }}>
      {/* Dégradé haut/bas */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, #0b0b1acc 0%, transparent 22%, transparent 78%, #0b0b1acc 100%)',
      }}/>
      {/* Ligne de mise */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: SLOT_H, height: SLOT_H, zIndex: 1,
        borderTop:    `1px solid ${midWins ? '#f0b42980' : '#f0b42928'}`,
        borderBottom: `1px solid ${midWins ? '#f0b42980' : '#f0b42928'}`,
        background: midWins ? '#f0b42912' : 'transparent',
        transition: 'all 0.4s', pointerEvents: 'none',
      }}/>

      {/* Bande — UNE seule div, jamais remplacée, translateY piloté par bandRef */}
      <div
        ref={bandRef}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: STRIP_LEN * SLOT_H,
          transform: `translateY(${endPx}px)`,  // position initiale = résultats visibles
          zIndex: 3, willChange: 'transform',
        }}
      >
        {strip.map((id, i) => {
          const sym    = symById(id)
          const isMid = i === IDX_MID
          const isVis = i === IDX_TOP || i === IDX_MID || i === IDX_BOT
          const winSlot = settled && isWin && isMid

          // Pendant le scroll : taille uniforme, opacité normale
          // Après arrêt : mid plus grand, bords atténués, effets de gain
          const size    = settled && isMid ? 72 : settled && isVis ? 50 : 58
          const opacity = settled && isVis && !isMid ? 0.4 : 1

          return (
            <div key={i} style={{
              height: SLOT_H,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <img
                src={sym.sprite} alt={sym.label} draggable={false}
                style={{
                  width: size, height: size,
                  imageRendering: 'pixelated', objectFit: 'contain',
                  opacity,
                  filter: winSlot
                    ? `drop-shadow(0 0 12px ${sym.color}) brightness(1.3)`
                    : settled && isMid
                    ? sym.isWild ? `drop-shadow(0 0 8px ${sym.color})` : 'brightness(1.05)'
                    : 'brightness(0.85)',
                  transition: settled ? 'filter 0.3s, opacity 0.2s, width 0.15s, height 0.15s' : 'none',
                  userSelect: 'none',
                }}
              />
              {settled && isMid && (
                <div style={{
                  position: 'absolute', bottom: 3,
                  fontSize: 7, fontWeight: 700,
                  color: winSlot ? sym.color : '#444',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  transition: 'color 0.3s',
                }}>
                  {sym.isWild ? '✦ WILD ✦' : sym.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Slots() {
  const { user, updateBalance } = useAuth()
  const [bet, setBet]           = useState(100)
  const [spinning, setSpinning] = useState(false)
  const [spinTrigger, setSpinTrigger] = useState(0)  // incrémenté APRÈS réception des données
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [stoppedCount, setStoppedCount] = useState(0)
  const [reelStopped, setReelStopped]   = useState([false, false, false])
  const [history, setHistory]   = useState([])
  const pendingResult = useRef(null)

  useEffect(() => {
    if (stoppedCount === 3 && pendingResult.current) {
      const r = pendingResult.current
      updateBalance(r.balance)
      setResult(r)
      setSpinning(false)
      if (r.isWin) {
        setHistory(prev => [
          { id: Date.now(), payout: r.payout, mult: r.multiplier },
          ...prev,
        ].slice(0, 5))
      }
    }
  }, [stoppedCount])

  const getPendingSyms = useCallback((reelIndex) => {
    const data = pendingResult.current
    if (!data?.reels?.[reelIndex]) return [randSymId(), randSymId(), randSymId()]
    return [data.reels[reelIndex][0].id, data.reels[reelIndex][1].id, data.reels[reelIndex][2].id]
  }, [])

  const handleSpin = useCallback(async () => {
    if (spinning || !user || bet < 10 || bet > user.balance) return
    // Marquer comme "en attente" pour désactiver le bouton, mais PAS encore spinning
    setSpinning(true)
    setResult(null)
    setError('')
    setStoppedCount(0)
    setReelStopped([false, false, false])
    pendingResult.current = null
    try {
      const { data } = await axios.post('/api/games/slots', { bet })
      if (!data.reels || !data.line) throw new Error('Réponse serveur invalide')
      // Stocker les données AVANT de déclencher l'animation
      pendingResult.current = data
      // Maintenant seulement on déclenche l'animation des rouleaux
      setSpinTrigger(t => t + 1)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erreur réseau')
      setSpinning(false)
    }
  }, [spinning, user, bet])

  function handleReelStopped(i) {
    setReelStopped(prev => { const n = [...prev]; n[i] = true; return n })
    setStoppedCount(c => c + 1)
  }

  const isWin     = result?.isWin === true
  const isJackpot = isWin && (result?.multiplier ?? 0) >= 100
  const winSym    = isWin && result?.winSymId ? symById(result.winSymId) : null

  const winDesc = () => {
    if (!result?.winType) return ''
    if (result.winType === '3x') return '3 identiques'
    if (result.hasWild) return 'Wild + paire'
    return '2 identiques'
  }

  return (
    <div className="min-h-screen bg-casino-bg py-10 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-3 mb-8">
          <Link to="/casino" className="text-gray-500 hover:text-white text-sm transition-colors">← Lobby</Link>
          <span className="text-gray-700">/</span>
          <span className="text-casino-gold font-semibold">🎰 Slot Machine</span>
          <span className="badge-gold ml-auto">RTP 88%</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Machine principale ── */}
          <div className="lg:col-span-2">
            <div className={`card border-2 transition-all duration-500
              ${isJackpot ? 'border-yellow-400 shadow-[0_0_60px_#f0b42940]'
                : isWin   ? 'border-casino-gold/50 shadow-[0_0_25px_#f0b42920]'
                :            'border-casino-border'}`}
            >
              <div className="text-center mb-4">
                <h2 className="font-casino text-2xl font-bold text-gradient">Slot Machine</h2>
                <p className="text-gray-500 text-xs mt-1">
                  2 identiques n'importe où · 3 identiques · Mew (✨) est Wild
                </p>
              </div>

              {isJackpot && (
                <div className="flex items-center justify-center gap-2 mb-3 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
                  <span>🏆</span>
                  <span className="text-yellow-400 font-black text-lg tracking-wide">JACKPOT !</span>
                  <span>🏆</span>
                </div>
              )}

              {/* Frame */}
              <div style={{
                background: 'linear-gradient(180deg, #090916 0%, #0d0d1e 100%)',
                borderRadius: 20, border: '1px solid #1a1a30',
                padding: '20px 16px 16px', marginBottom: 16, position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  borderRadius: '20px 20px 0 0',
                  background: isJackpot ? 'linear-gradient(90deg,transparent,#f0b429,transparent)'
                    : isWin  ? 'linear-gradient(90deg,transparent,#f0b42960,transparent)'
                    :           'linear-gradient(90deg,transparent,#2a2a4a,transparent)',
                  transition: 'background 0.5s',
                }}/>

                {['left','right'].map(side => (
                  <div key={side} style={{
                    position: 'absolute', [side]: 10, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}>
                    <div style={{ width: 2, height: 36, background: '#f0b42928', borderRadius: 1 }}/>
                    <div style={{ fontSize: 6, color: '#f0b42950', writingMode: 'vertical-rl', letterSpacing: 1 }}>MISE</div>
                    <div style={{ width: 2, height: 36, background: '#f0b42928', borderRadius: 1 }}/>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <Reel key={i} reelIndex={i} spinTrigger={spinTrigger}
                      stopDelay={900 + i * 650}
                      onStopped={() => handleReelStopped(i)}
                      isWin={isWin} getPendingSyms={getPendingSyms}
                    />
                  ))}
                </div>

                {spinning && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 108, height: 3, borderRadius: 2,
                        background: reelStopped[i] ? '#f0b429' : '#1a1a30',
                        boxShadow: reelStopped[i] ? '0 0 6px #f0b429' : 'none',
                        transition: 'background 0.3s, box-shadow 0.3s',
                      }}/>
                    ))}
                  </div>
                )}
              </div>

              {/* Résultat */}
              {result && !spinning && (
                <div className={`p-4 rounded-2xl mb-4 text-center transition-all duration-500
                  ${isJackpot ? 'bg-yellow-500/10 border-2 border-yellow-400/50'
                    : isWin   ? 'bg-green-500/8 border border-green-400/25'
                    :            'bg-white/3 border border-white/6'}`}
                >
                  {isWin ? (
                    <>
                      {winSym && (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:10 }}>
                          <img src={winSym.sprite} alt={winSym.label}
                            style={{ width:44, height:44, imageRendering:'pixelated', filter:`drop-shadow(0 0 10px ${winSym.color})` }}
                          />
                          <div className="text-left">
                            <div style={{ color: winSym.color, fontWeight: 800, fontSize: 15 }}>
                              {winSym.label}
                              {result.hasWild && <span style={{ color:'#f0b429', marginLeft:6, fontSize:12 }}>✨ Wild</span>}
                            </div>
                            <div style={{ color:'#666', fontSize:11 }}>{winDesc()} · {winSym.rarity}</div>
                          </div>
                        </div>
                      )}
                      <div className={`text-2xl font-black ${isJackpot ? 'text-yellow-400' : 'text-green-400'}`}>
                        +{result.payout.toLocaleString()} jetons
                      </div>
                      <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold bg-white/8 text-gray-300">
                        ×{result.multiplier}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-500 text-base">Pas de chance...</div>
                      <div className="text-red-400/50 text-sm mt-1">−{bet.toLocaleString()} jetons</div>
                    </>
                  )}
                </div>
              )}

              {history.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {history.map(h => (
                    <div key={h.id} className="text-xs border border-green-500/30 rounded-full px-3 py-1 font-bold bg-green-500/8 text-green-400">
                      +{h.payout.toLocaleString()}
                      <span className="text-gray-600 ml-1">×{h.mult}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
                  ⚠️ {error}
                </div>
              )}

              <BetInput bet={bet} setBet={setBet} disabled={spinning} />

              <button
                onClick={handleSpin}
                disabled={spinning || bet < 10 || bet > (user?.balance ?? 0)}
                className="btn-gold w-full py-4 text-lg mt-4"
              >
                {spinning
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="inline-block animate-spin">⚙️</span>
                      En cours...
                    </span>
                  : '🎰 SPIN !'}
              </button>
            </div>
          </div>

          {/* ── Panneau droit ── */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-casino font-bold text-casino-gold mb-1 text-sm uppercase tracking-wide">
                Table des gains
              </h3>
              <div className="flex text-xs text-gray-600 mb-2 px-1">
                <span className="flex-1">Symbole</span>
                <span className="w-10 text-center">3×</span>
                <span className="w-10 text-center">2×</span>
              </div>
              <div className="space-y-1">
                {PAYOUTS_TABLE.map(p => {
                  const sym = SYMBOLS[p.id]
                  const isLastWin = isWin && result?.winSymId === p.id
                  return (
                    <div key={p.id} style={{
                      background: isLastWin ? sym.color + '18' : 'transparent',
                      border: isLastWin ? `1px solid ${sym.color}40` : '1px solid transparent',
                      borderRadius: 8, padding: '5px 6px',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.4s',
                    }}>
                      <img src={sym.sprite} alt={sym.label}
                        style={{ width:28, height:28, imageRendering:'pixelated', filter: isLastWin ? `drop-shadow(0 0 5px ${sym.color})` : 'none' }}
                      />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:'#ccc', fontWeight:600 }}>
                          {sym.label}
                          {sym.isWild && <span style={{ color:'#f0b429', marginLeft:4 }}>Wild</span>}
                        </div>
                        <div style={{ fontSize:9, color:'#444' }}>{sym.rarity}</div>
                      </div>
                      <div style={{ width:36, textAlign:'center', fontSize:10, color:sym.color, fontWeight:700 }}>{p.p3}</div>
                      <div style={{ width:36, textAlign:'center', fontSize:10, color:'#666', fontWeight:600 }}>{p.p2}</div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-casino-border/30 text-xs text-gray-600 space-y-1">
                <div>✨ Mew est Wild — remplace tout</div>
                <div>💡 2× = paire n'importe où sur la ligne</div>
                <div>🐟 Magicarpe — inutile même en paire</div>
              </div>
            </div>
            <LiveFeed compact />
          </div>
        </div>
      </div>
    </div>
  )
}