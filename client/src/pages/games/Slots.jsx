import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'

const API = dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

const SYMBOLS = {
  mew:        { label:'Mew',       color:'#fbbf24', dex:151, wild:true  },
  masterball: { label:'MasterBall',color:'#a78bfa', dex:null, item:'master-ball' },
  dragon:     { label:'Dragon',    color:'#8b5cf6', dex:149  },
  dark:       { label:'Ténèbres',  color:'#9ca3af', dex:197  },
  psychic:    { label:'Psy',       color:'#ec4899', dex:65   },
  electric:   { label:'Électrik',  color:'#fbbf24', dex:25   },
  fire:       { label:'Feu',       color:'#f97316', dex:6    },
  water:      { label:'Eau',       color:'#3b82f6', dex:9    },
  grass:      { label:'Plante',    color:'#22c55e', dex:3    },
  magikarp:   { label:'Magicarpe', color:'#f87171', dex:129  },
}

const PAYOUT3 = { masterball:261, dragon:104, dark:52, psychic:26, electric:14, fire:6, water:6, grass:6, magikarp:0.5 }
const PAYOUT2 = { masterball:26, dragon:10, dark:6, psychic:4, electric:2.5, fire:2, water:2, grass:2, magikarp:0 }
const WEIGHTS = { mew:2, masterball:3, dragon:5, dark:8, psychic:10, electric:14, fire:18, water:18, grass:22, magikarp:28 }
const IDS = Object.keys(SYMBOLS)
const TW = Object.values(WEIGHTS).reduce((a,b)=>a+b,0)

function spin_reel() {
  let r = Math.random()*TW
  for (const id of IDS) { r -= WEIGHTS[id]; if (r <= 0) return id }
  return 'grass'
}

function SpriteImg({ id }) {
  const s = SYMBOLS[id]
  if (!s) return <span style={{ fontSize:36 }}>?</span>
  const url = s.item
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${s.item}.png`
    : s.dex ? API(s.dex) : null
  if (!url) return <span style={{ fontSize:36 }}>⭐</span>
  return (
    <img
      src={url} alt={s.label}
      style={{ width:64, height:64, imageRendering:'pixelated', objectFit:'contain', filter:`drop-shadow(0 0 5px ${s.color}60)` }}
      onError={e => { e.target.style.display='none' }}
    />
  )
}

function Reel({ finalId, spinning, win }) {
  const [display, setDisplay] = useState(finalId)
  const iv = useRef(null)

  useEffect(() => {
    if (spinning) {
      iv.current = setInterval(() => setDisplay(spin_reel()), 60)
    } else {
      clearInterval(iv.current)
      setDisplay(finalId)
    }
    return () => clearInterval(iv.current)
  }, [spinning, finalId])

  const s = SYMBOLS[display] || SYMBOLS.grass

  return (
    <div
      className={`reel-wrap${win ? ' win-reel' : ''}${spinning ? ' reel-spinning' : ''}`}
      style={{ borderColor: win ? s.color : undefined, boxShadow: win ? `0 0 20px ${s.color}40` : undefined }}
    >
      <div className="reel-symbol">
        <SpriteImg id={display} />
      </div>
      {win && s.wild && (
        <div style={{ position:'absolute', top:3, right:3, fontSize:8, background:'rgba(251,191,36,.2)', color:'#fbbf24', borderRadius:4, padding:'1px 5px', fontFamily:'Orbitron,monospace', fontWeight:700 }}>WILD</div>
      )}
    </div>
  )
}

export default function Slots() {
  const { user, updateBalance } = useAuth()
  const [bet,     setBet]     = useState(100)
  const [line,    setLine]    = useState(['electric','fire','water'])
  const [spinning,setSpinning]= useState(false)
  const [result,  setResult]  = useState(null)
  const [err,     setErr]     = useState('')
  const [history, setHistory] = useState([])
  const [session, setSession] = useState({ spins:0, wins:0, pnl:0 })
  const spinTimeouts = useRef([])

  async function doSpin() {
    if (spinning || !user || bet < 10 || bet > (user.balance || 0)) return
    setSpinning(true); setResult(null); setErr('')

    try {
      const { data } = await axios.post('/api/games/slots', { bet })
      // Animer les rouleaux séquentiellement
      spinTimeouts.current.forEach(clearTimeout)
      spinTimeouts.current = [
        setTimeout(() => {}, 0), // start spinning via state
      ]
      setTimeout(() => {
        setLine([data.line[0].id, data.line[1].id, data.line[2].id])
        setSpinning(false)
        updateBalance(data.balance)
        setResult(data)
        setSession(s => ({
          spins: s.spins + 1,
          wins: s.wins + (data.isWin ? 1 : 0),
          pnl: s.pnl + (data.isWin ? data.payout - bet : -bet),
        }))
        if (data.isWin) setHistory(h => [{ id:Date.now(), payout:data.payout, mult:data.multiplier },...h].slice(0,8))
      }, 1400)
    } catch(e) {
      setErr(e.response?.data?.error || 'Erreur réseau')
      setSpinning(false)
    }
  }

  const isWin  = result?.isWin
  const isBig  = isWin && (result?.multiplier || 0) >= 50
  const winSym = isWin && result?.winSymId ? SYMBOLS[result.winSymId] : null

  return (
    <div className="game-page">
      {/* Breadcrumb */}
      <div className="game-breadcrumb">
        <Link to="/machines" className="breadcrumb-link">← Machines</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">🎰 Slot Machine</span>
      </div>

      <div className="game-body">
        {/* ── Contrôles gauche ── */}
        <div className="game-controls-panel">
          <div className="card">
            <BetInput bet={bet} setBet={setBet} disabled={spinning} max={user?.total_wagered !== undefined ? 10000 : 10000} />
            {err && <div style={{ marginTop:8, padding:'7px 10px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:7, fontSize:12, color:'#f87171', fontFamily:'Exo 2,sans-serif' }}>⚠ {err}</div>}
            <button
              className="btn btn-gold btn-xl"
              style={{ marginTop:10 }}
              onClick={doSpin}
              disabled={spinning || bet < 10 || bet > (user?.balance||0)}
            >
              {spinning ? '⏳ TIRAGE…' : '🎰 SPIN !'}
            </button>
            {result && !spinning && (
              <button className="btn btn-ghost" style={{ width:'100%', marginTop:6, fontSize:12 }} onClick={doSpin}>
                ↺ Rejouer ({bet.toLocaleString('fr-FR')} ✦)
              </button>
            )}
          </div>

          {/* Résultat */}
          {result && (
            <div
              className={`game-result${isWin ? ' win' : ' lose'} anim-scale`}
              key={result.payout + result.winType}
            >
              {isBig && (
                <div className="result-label jackpot">🏆 JACKPOT !</div>
              )}
              {isWin && !isBig && <div className="result-label win">Gagné !</div>}
              {!isWin && <div className="result-label lose">Pas de chance…</div>}

              {isWin && winSym && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, justifyContent:'center' }}>
                  <img src={API(winSym.dex)} alt="" style={{ width:28, height:28, imageRendering:'pixelated', filter:`drop-shadow(0 0 6px ${winSym.color})` }} />
                  <span style={{ fontSize:11, color:winSym.color, fontFamily:'Rajdhani,sans-serif', fontWeight:600 }}>
                    {result.winType === '3x' ? '3 identiques' : 'Paire + Wild'}
                  </span>
                </div>
              )}

              {isWin
                ? <div className="result-win-amt anim-up">+{result.payout.toLocaleString('fr-FR')}</div>
                : <div className="result-lose-amt">−{bet.toLocaleString('fr-FR')}</div>
              }
              {isWin && <div className="result-mult">×{result.multiplier} · {result.winType}</div>}
            </div>
          )}

          {/* Session */}
          {session.spins > 0 && (
            <div className="session-stats">
              <div className="ss-item">
                <div className="ss-val">{session.spins}</div>
                <div className="ss-lbl">Spins</div>
              </div>
              <div className="ss-item">
                <div className="ss-val" style={{ color: session.pnl >= 0 ? '#10b981' : '#9d7fcf' }}>
                  {session.pnl >= 0 ? '+' : ''}{session.pnl.toLocaleString('fr-FR')}
                </div>
                <div className="ss-lbl">Bilan</div>
              </div>
              <div className="ss-item">
                <div className="ss-val">{session.spins > 0 ? Math.round(session.wins/session.spins*100) : 0}%</div>
                <div className="ss-lbl">Win%</div>
              </div>
            </div>
          )}

          {/* Historique chips */}
          {history.length > 0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {history.map(h => (
                <div key={h.id} className="chip chip-win">+{h.payout.toLocaleString('fr-FR')} <span style={{ opacity:.6 }}>×{h.mult}</span></div>
              ))}
            </div>
          )}
        </div>

        {/* ── Arène centrale ── */}
        <div className="game-arena-panel">
          <div style={{ textAlign:'center', marginBottom:12 }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:18, fontWeight:900, color:'#a78bfa', letterSpacing:4 }}>SLOT MACHINE</div>
            <div style={{ fontSize:11, color:'#5b3fa0', marginTop:3, fontFamily:'Rajdhani,sans-serif' }}>Ligne centrale · Mew est Wild ✨</div>
          </div>

          <div
            className={`slots-machine${isWin ? ' win-state' : result && !isWin ? ' lose-state' : ''}`}
            key={`machine-${result?.payout}`}
          >
            {/* Effet jackpot */}
            {isBig && (
              <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, rgba(251,191,36,.1) 0%, transparent 70%)', pointerEvents:'none', animation:'winFlash .6s ease infinite alternate' }} />
            )}

            <div className="slots-reels">
              {[0,1,2].map(i => (
                <Reel key={i} finalId={line[i]} spinning={spinning} win={isWin || false} />
              ))}
            </div>

            <div className={`payline-indicator${isWin ? ' show' : ''}`} style={{ width:'100%', maxWidth:330 }} />

            {/* Symboles haut/bas grissés */}
            <div style={{ display:'flex', gap:10, marginTop:6, opacity:.3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:100, height:36, background:'rgba(255,255,255,.03)', border:'1px solid rgba(124,58,237,.1)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <SpriteImg id={spin_reel()} />
                </div>
              ))}
            </div>
          </div>

          {!result && !spinning && (
            <div style={{ textAlign:'center', color:'#5b3fa0', fontSize:13, fontFamily:'Exo 2,sans-serif', marginTop:8 }}>
              Configure ta mise et appuie sur SPIN !
            </div>
          )}

          {spinning && (
            <div style={{ textAlign:'center', marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#7c3aed', animation:`blink .5s ${i*.15}s ease-in-out infinite` }} />)}
              <span style={{ color:'#6d28d9', fontSize:12, fontFamily:'Exo 2,sans-serif' }}>Les rouleaux tournent…</span>
            </div>
          )}
        </div>

        {/* ── Règles droite ── */}
        <div className="game-rules-panel">
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'#5b3fa0', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
            Gains × mise
          </div>

          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:'#5b3fa0', letterSpacing:1, textTransform:'uppercase', marginBottom:5, fontFamily:'Rajdhani,sans-serif' }}>3 identiques</div>
            <table className="rule-table">
              <tbody>
                {Object.entries(PAYOUT3).map(([id, m]) => {
                  const s = SYMBOLS[id]
                  const active = result?.isWin && result?.winSymId === id && result?.winType === '3x'
                  return (
                    <tr key={id} style={{ background: active ? `${s.color}12` : undefined }}>
                      <td className="rt-name" style={{ display:'flex', alignItems:'center', gap:5, color: active ? s.color : undefined }}>
                        <img src={API(s.dex)} alt="" style={{ width:16, height:16, imageRendering:'pixelated', flexShrink:0 }} onError={e => e.target.style.display='none'} />
                        {s.label}
                      </td>
                      <td className={`rt-val${m >= 50 ? ' gold' : m >= 10 ? '' : ''}`} style={{ color: s.color }}>×{m}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <hr className="sep" />
          <div style={{ fontSize:9, color:'#5b3fa0', letterSpacing:1, textTransform:'uppercase', marginBottom:5, fontFamily:'Rajdhani,sans-serif' }}>2 identiques</div>
          <table className="rule-table">
            <tbody>
              {Object.entries(PAYOUT2).filter(([,m]) => m > 0).map(([id, m]) => {
                const s = SYMBOLS[id]
                return (
                  <tr key={id}>
                    <td className="rt-name" style={{ fontSize:10 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                        <img src={API(s.dex)} alt="" style={{ width:12, height:12, imageRendering:'pixelated' }} onError={e => e.target.style.display='none'} />
                        {s.label}
                      </span>
                    </td>
                    <td className="rt-val" style={{ color: s.color, fontSize:10 }}>×{m}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <hr className="sep" />
          <div style={{ fontSize:11, color:'#5b3fa0', lineHeight:1.7, fontFamily:'Exo 2,sans-serif' }}>
            <div>✨ Mew remplace tout</div>
            <div>🐟 Magicarpe ×0.5 en 3×</div>
            <div>💡 2× = paire n'importe où</div>
          </div>
        </div>
      </div>
    </div>
  )
}
