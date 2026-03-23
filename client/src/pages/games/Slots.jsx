import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'

const SYMBOLS = {
  mew:        { label:'Mew',         color:'#FFD700', isWild:true,  sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png' },
  masterball: { label:'Master Ball', color:'#A78BFA', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png' },
  dragon:     { label:'Dragon',      color:'#8B5CF6', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png' },
  dark:       { label:'Ténèbres',    color:'#9CA3AF', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/197.png' },
  psychic:    { label:'Psy',         color:'#EC4899', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png' },
  electric:   { label:'Électrik',    color:'#EAB308', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
  fire:       { label:'Feu',         color:'#F97316', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png' },
  water:      { label:'Eau',         color:'#3B82F6', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png' },
  grass:      { label:'Plante',      color:'#22C55E', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png' },
  magikarp:   { label:'Magicarpe',   color:'#F87171', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png' },
}
const SYM_IDS = Object.keys(SYMBOLS)
const SLOT_H = 88
const STRIP  = 28

const WEIGHTS = { mew:2, masterball:3, dragon:5, dark:8, psychic:10, electric:14, fire:18, water:18, grass:22, magikarp:28 }
const TW = Object.values(WEIGHTS).reduce((a,b) => a+b, 0)
function rnd() { let r=Math.random()*TW; for(const id of SYM_IDS){r-=WEIGHTS[id];if(r<=0)return id} return 'magikarp' }
function mkStrip(f) { const s=Array.from({length:STRIP},rnd); s[STRIP-3]=f[0]; s[STRIP-2]=f[1]; s[STRIP-1]=f[2]; return s }
function sym(id) { return SYMBOLS[id] ?? SYMBOLS.magikarp }

function Reel({ idx, trigger, delay, onStop, win, getSyms }) {
  const endY = -(STRIP-3)*SLOT_H
  const [s, setS]       = useState(() => mkStrip([rnd(),rnd(),rnd()]))
  const [settled, setSt] = useState(true)
  const [flash,  setFl]  = useState(false)
  const ref = useRef(null)
  const raf = useRef(null)
  const to  = useRef(null)
  const pos = px => { if(ref.current) ref.current.style.transform = `translateY(${px}px)` }

  useEffect(() => {
    if (!trigger) return
    cancelAnimationFrame(raf.current); clearTimeout(to.current)
    setSt(false); setFl(false); pos(0); setS(mkStrip(getSyms(idx)))
    const dur = delay + 500
    const t0  = performance.now()
    const go  = now => {
      const p = Math.min((now-t0)/dur, 1)
      const e = 1 - Math.pow(1-p, 3)
      pos(e*endY)
      if (p < 1) { raf.current = requestAnimationFrame(go) }
      else {
        pos(endY)
        to.current = setTimeout(() => {
          setSt(true); setFl(true); setTimeout(() => setFl(false), 400)
          onStop?.()
        }, 20)
      }
    }
    raf.current = requestAnimationFrame(() => { pos(0); raf.current = requestAnimationFrame(go) })
    return () => { cancelAnimationFrame(raf.current); clearTimeout(to.current) }
  }, [trigger])

  const mw = settled && win
  const MI = STRIP-3, MM = STRIP-2, MB = STRIP-1

  return (
    <div style={{
      width: 100, height: SLOT_H*3, background: 'rgba(0,0,0,0.4)',
      borderRadius: 12,
      border: `2px solid ${mw ? 'rgba(255,215,0,0.7)' : flash ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
      boxShadow: mw ? '0 0 30px rgba(255,215,0,0.4)' : 'none',
      overflow: 'hidden', position: 'relative',
      transition: 'border-color 0.3s, box-shadow 0.4s',
    }}>
      {/* Dégradés haut/bas */}
      <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none', background:'linear-gradient(to bottom,rgba(12,6,8,0.8) 0%,transparent 25%,transparent 75%,rgba(12,6,8,0.8) 100%)' }} />
      {/* Ligne centrale */}
      <div style={{ position:'absolute', left:0, right:0, top:SLOT_H, height:SLOT_H, zIndex:1, pointerEvents:'none', borderTop:`1px solid ${mw ? 'rgba(255,215,0,0.6)' : 'rgba(240,180,41,0.2)'}`, borderBottom:`1px solid ${mw ? 'rgba(255,215,0,0.6)' : 'rgba(240,180,41,0.2)'}`, background: mw ? 'rgba(255,215,0,0.05)' : 'transparent', transition:'all 0.4s' }} />
      <div ref={ref} style={{ position:'absolute', top:0, left:0, right:0, height:STRIP*SLOT_H, transform:`translateY(${endY}px)`, zIndex:3, willChange:'transform' }}>
        {s.map((id, i) => {
          const sy   = sym(id)
          const isMid = i === MM
          const isVis = i >= MI && i <= MB
          const ws    = settled && win && isMid
          return (
            <div key={i} style={{ height:SLOT_H, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <img src={sy.sprite} alt={sy.label} draggable={false} style={{
                width: settled && isMid ? 64 : settled && isVis ? 44 : 52,
                height: settled && isMid ? 64 : settled && isVis ? 44 : 52,
                imageRendering: 'pixelated', objectFit: 'contain',
                opacity: settled && isVis && !isMid ? 0.25 : 1,
                filter: ws ? `drop-shadow(0 0 12px ${sy.color}) brightness(1.2)` : settled && isMid ? `brightness(1.05)` : 'brightness(0.7)',
                transition: settled ? 'all 0.2s' : 'none',
              }} />
              {settled && isMid && (
                <div style={{ fontSize:9, fontFamily:'Cinzel, serif', fontWeight:700, color: ws ? sy.color : 'rgba(245,230,200,0.3)', marginTop:2 }}>
                  {sy.isWild ? '★ WILD ★' : sy.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Slots() {
  const { user, updateBalance } = useAuth()
  const [bet,     setBet]     = useState(100)
  const [spinning,setSpin]    = useState(false)
  const [trigger, setTrigger] = useState(0)
  const [result,  setResult]  = useState(null)
  const [err,     setErr]     = useState('')
  const [stopped, setStopped] = useState(0)
  const [history, setHistory] = useState([])
  const pending = useRef(null)

  useEffect(() => {
    if (stopped === 3 && pending.current) {
      const r = pending.current
      updateBalance(r.balance)
      setResult(r)
      setSpin(false)
      if (r.isWin) setHistory(p => [{ id:Date.now(), payout:r.payout, mult:r.multiplier },...p].slice(0,6))
    }
  }, [stopped])

  const getSyms = useCallback(ri => {
    const d = pending.current
    if (!d?.reels?.[ri]) return [rnd(),rnd(),rnd()]
    return [d.reels[ri][0].id, d.reels[ri][1].id, d.reels[ri][2].id]
  }, [])

  async function spin() {
    if (spinning || !user || bet < 10 || bet > user.balance) return
    setSpin(true); setResult(null); setErr(''); setStopped(0); pending.current = null
    try {
      const { data } = await axios.post('/api/games/slots', { bet })
      pending.current = data
      setTrigger(t => t + 1)
    } catch (e) {
      setErr(e.response?.data?.error || 'Erreur réseau')
      setSpin(false)
    }
  }

  async function quickPlay() {
    if (!result || spinning) return
    spin()
  }

  const isWin  = result?.isWin === true
  const isJP   = isWin && (result?.multiplier ?? 0) >= 100
  const winSym = isWin && result?.winSymId ? sym(result.winSymId) : null

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:20 }}>
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Link to="/machines" style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(245,230,200,0.3)', textDecoration:'none' }}>← Machines</Link>
        <span style={{ color:'rgba(255,255,255,0.1)' }}>/</span>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(240,180,41,0.6)' }}>🎰 Slot Machine</span>
      </div>

      <div style={{ display:'flex', gap:16, alignItems:'start', flex:1 }}>

        {/* Gauche — Contrôles */}
        <div style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{
            background:'linear-gradient(160deg, #1E1015, #150D10)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:16, padding:18,
          }}>
            <BetInput bet={bet} setBet={setBet} disabled={spinning} />
            {err && (
              <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(196,30,58,0.1)', border:'1px solid rgba(196,30,58,0.3)', borderRadius:8, fontFamily:'Crimson Pro, serif', fontSize:13, color:'#E8556A' }}>
                ⚠ {err}
              </div>
            )}
            <button
              onClick={spin}
              disabled={spinning || bet < 10 || bet > (user?.balance ?? 0)}
              style={{
                width:'100%', marginTop:14, padding:'15px',
                background: spinning ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #FFD700, #F0B429, #D4890A)',
                color: spinning ? 'rgba(245,230,200,0.3)' : '#1A0A00',
                fontFamily:'Cinzel, serif', fontWeight:700, fontSize:15,
                borderRadius:12, border:'none',
                cursor: spinning || bet > (user?.balance ?? 0) ? 'not-allowed' : 'pointer',
                opacity: bet > (user?.balance ?? 0) ? 0.4 : 1,
                boxShadow: spinning ? 'none' : '0 4px 20px rgba(240,180,41,0.4)',
                transition:'all 0.2s',
                letterSpacing:'0.05em', textTransform:'uppercase',
              }}
            >
              {spinning ? '⏳ Tirage…' : '🎰 SPIN !'}
            </button>

            {result && !spinning && (
              <button onClick={quickPlay} style={{
                width:'100%', marginTop:8, padding:'10px',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:10,
                fontFamily:'Cinzel, serif', fontSize:11,
                color:'rgba(245,230,200,0.5)', cursor:'pointer',
                transition:'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(240,180,41,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                🔄 Rejouer ({bet.toLocaleString('fr-FR')} ✦)
              </button>
            )}
          </div>

          {/* Résultat */}
          {result && !spinning && (
            <div style={{
              background: isWin ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isWin ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius:14, padding:16, textAlign:'center',
              animation:'slideInUp 0.3s ease forwards',
            }}>
              {isJP && <div style={{ fontFamily:'Cinzel Decorative, serif', fontSize:12, color:'#FFD700', marginBottom:8, letterSpacing:2 }}>🏆 JACKPOT !</div>}
              {isWin ? (
                <>
                  {winSym && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', marginBottom:10 }}>
                      <img src={winSym.sprite} alt="" style={{ width:36, height:36, imageRendering:'pixelated', filter:`drop-shadow(0 0 8px ${winSym.color})` }} />
                      <div style={{ textAlign:'left' }}>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:11, fontWeight:700, color:winSym.color }}>{winSym.label}</div>
                        <div style={{ fontFamily:'Crimson Pro, serif', fontSize:11, color:'rgba(245,230,200,0.4)' }}>
                          {result.winType === '3x' ? '3 identiques' : result.hasWild ? 'Wild + paire' : '2 identiques'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:26, fontWeight:700, color: isJP ? '#FFD700' : '#22C55E' }}>
                    +{result.payout.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:10, color:'rgba(245,230,200,0.3)', marginTop:4 }}>
                    jetons · ×{result.multiplier}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily:'Crimson Pro, serif', fontSize:14, color:'rgba(245,230,200,0.4)', marginBottom:4 }}>Pas de chance cette fois</div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:18, fontWeight:700, color:'rgba(245,230,200,0.25)' }}>
                    −{bet.toLocaleString('fr-FR')}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {history.map(h => (
                <div key={h.id} style={{
                  fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700,
                  padding:'3px 8px', borderRadius:20,
                  background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)',
                  color:'#22C55E',
                }}>
                  +{h.payout.toLocaleString('fr-FR')} <span style={{ opacity:0.5 }}>×{h.mult}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Centre — Machine */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          {/* Titre */}
          <div style={{ textAlign:'center' }}>
            <h1 style={{
              fontFamily:'Cinzel Decorative, serif',
              fontSize:22, fontWeight:900, color:'#FFD700',
              textShadow:'0 0 30px rgba(255,215,0,0.4)',
              letterSpacing:4, marginBottom:4,
            }}>
              SLOT MACHINE
            </h1>
            <p style={{ fontFamily:'Crimson Pro, serif', fontSize:13, color:'rgba(245,230,200,0.4)' }}>
              Ligne centrale · Mew est Wild ✨
            </p>
          </div>

          {/* Machine */}
          <div style={{
            background:'linear-gradient(160deg, #1A0A0F, #0F080B)',
            border: `2px solid ${isJP ? '#FFD700' : isWin ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius:20,
            padding:'24px 20px 20px',
            boxShadow: isJP ? '0 0 50px rgba(255,215,0,0.3)' : isWin ? '0 0 25px rgba(255,215,0,0.1)' : 'none',
            transition:'all 0.5s',
            position:'relative', overflow:'hidden',
          }}>
            {/* Ligne déco top */}
            <div style={{
              position:'absolute', top:0, left:0, right:0, height:3,
              background: isJP ? 'linear-gradient(90deg, transparent, #FFD700, transparent)' : isWin ? 'linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)' : 'linear-gradient(90deg, transparent, rgba(240,180,41,0.2), transparent)',
              transition:'all 0.5s',
            }} />

            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              {[0,1,2].map(i => (
                <Reel
                  key={i} idx={i} trigger={trigger}
                  delay={800 + i*600}
                  onStop={() => setStopped(c => c+1)}
                  win={isWin} getSyms={getSyms}
                />
              ))}
            </div>

            {isJP && (
              <div style={{
                position:'absolute', inset:0,
                background:'radial-gradient(ellipse, rgba(255,215,0,0.08) 0%, transparent 70%)',
                pointerEvents:'none',
                animation:'jackpotPulse 1s ease-in-out infinite',
              }} />
            )}
          </div>

          {/* État */}
          {!result && !spinning && (
            <div style={{ fontFamily:'Crimson Pro, serif', fontSize:14, color:'rgba(245,230,200,0.3)', textAlign:'center' }}>
              Choisis ta mise et lance le spin !
            </div>
          )}
        </div>

        {/* Droite — Règles */}
        <div style={{
          width:210, flexShrink:0,
          background:'linear-gradient(160deg, #1E1015, #150D10)',
          border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:16, padding:16,
        }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:11, fontWeight:700, color:'rgba(240,180,41,0.6)', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:14 }}>
            Gains
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px', gap:'3px 4px', marginBottom:6 }}>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:9, color:'rgba(245,230,200,0.25)' }}>Symbole</div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:9, color:'rgba(245,230,200,0.25)', textAlign:'center' }}>3×</div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:9, color:'rgba(245,230,200,0.25)', textAlign:'center' }}>2×</div>
          </div>
          <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.06)', marginBottom:6 }} />
          {[
            ['mew',        'WILD','WILD'],
            ['masterball', '×261','×26'],
            ['dragon',     '×104','×10'],
            ['dark',       '×52', '×6'],
            ['psychic',    '×26', '×4'],
            ['electric',   '×14', '×2'],
            ['fire',       '×6',  '×2'],
            ['water',      '×6',  '×2'],
            ['grass',      '×6',  '×2'],
            ['magikarp',   '×0.5','—'],
          ].map(([id, p3, p2]) => {
            const s = SYMBOLS[id]
            const active = result?.isWin && result?.winSymId === id
            return (
              <div key={id} style={{
                display:'grid', gridTemplateColumns:'1fr 40px 40px',
                alignItems:'center', padding:'4px 0',
                borderRadius:4,
                background: active ? `${s.color}14` : 'transparent',
                transition:'background 0.3s',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <img src={s.sprite} alt="" style={{ width:16, height:16, imageRendering:'pixelated', flexShrink:0 }} />
                  <span style={{ fontFamily:'Crimson Pro, serif', fontSize:12, color: active ? s.color : 'rgba(245,230,200,0.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700, color:s.color, textAlign:'center' }}>{p3}</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'rgba(245,230,200,0.3)', textAlign:'center' }}>{p2}</div>
              </div>
            )
          })}
          <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.06)', margin:'10px 0 8px' }} />
          <div style={{ fontFamily:'Crimson Pro, serif', fontSize:12, color:'rgba(245,230,200,0.3)', lineHeight:1.8 }}>
            <div>✨ Mew remplace tout (Wild)</div>
            <div>💡 2× = paire n'importe où</div>
            <div>🐟 Magicarpe ×0.5 en 3× seulement</div>
          </div>
        </div>
      </div>
    </div>
  )
}
