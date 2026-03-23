import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'

const SPRITE = dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

function Cell({ i, state, onClick, disabled }) {
  const [hover, setHover] = useState(false)
  const base = {
    width:58, height:58, borderRadius:10,
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor: disabled ? 'default' : 'pointer',
    transition:'all 0.15s',
    position:'relative', overflow:'hidden',
    flexShrink:0,
  }
  if (state === 'hidden') return (
    <div
      onClick={() => !disabled && onClick(i)}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...base,
        background: hover ? 'rgba(240,180,41,0.08)' : 'rgba(255,255,255,0.04)',
        border:`1px solid ${hover ? 'rgba(240,180,41,0.35)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hover ? '0 0 12px rgba(240,180,41,0.15)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span style={{ fontSize:18, opacity:0.15, color:'rgba(245,230,200,0.5)' }}>?</span>
    </div>
  )
  if (state === 'token') return (
    <div style={{ ...base, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.35)', boxShadow:'0 0 12px rgba(34,197,94,0.2)' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#FFD700,#F0B429)', boxShadow:'0 0 10px rgba(255,215,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✦</div>
    </div>
  )
  if (state === 'mine') return (
    <div style={{ ...base, background:'rgba(239,68,68,0.2)', border:'2px solid rgba(239,68,68,0.6)', boxShadow:'0 0 20px rgba(239,68,68,0.4)' }}>
      <img src={SPRITE(100)} alt="" style={{ width:46, height:46, imageRendering:'pixelated' }} />
    </div>
  )
  if (state === 'mine_other') return (
    <div style={{ ...base, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', opacity:0.5 }}>
      <img src={SPRITE(100)} alt="" style={{ width:42, height:42, imageRendering:'pixelated', filter:'grayscale(0.6)' }} />
    </div>
  )
  return null
}

export default function Mines() {
  const { user, updateBalance } = useAuth()
  const [bet,     setBet]     = useState(100)
  const [mines,   setMines]   = useState(3)
  const [phase,   setPhase]   = useState('idle')
  const [revealed,setRevealed]= useState([])
  const [minePos, setMinePos] = useState([])
  const [mult,    setMult]    = useState(1)
  const [payout,  setPayout]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')
  const [history, setHistory] = useState([])
  const [hit,     setHit]     = useState(null)

  function cellState(i) {
    if (['exploded','cashed','won'].includes(phase)) {
      if (i === hit) return 'mine'
      if (minePos.includes(i)) return 'mine_other'
      if (revealed.includes(i)) return 'token'
    }
    if (revealed.includes(i)) return 'token'
    return 'hidden'
  }

  async function start() {
    if (bet < 10 || bet > (user?.balance || 0)) return
    setLoading(true); setErr('')
    try {
      const { data } = await axios.post('/api/games/mines', { action:'start', bet, minesCount:mines })
      updateBalance(data.balance)
      setPhase('playing'); setRevealed([]); setMinePos([]); setMult(1); setPayout(0); setHit(null)
    } catch(e) { setErr(e.response?.data?.error || 'Erreur réseau') }
    finally { setLoading(false) }
  }

  async function reveal(i) {
    if (phase !== 'playing' || revealed.includes(i) || loading) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/games/mines', { action:'reveal', cellIndex:i })
      if (data.status === 'exploded') {
        setHit(i); setMinePos(data.mines||[]); setRevealed(p=>[...p,i])
        setPhase('exploded'); setMult(0); setPayout(0)
        setHistory(p=>[{status:'exploded',bet,payout:0},...p].slice(0,6))
      } else {
        setRevealed(p=>[...p,i]); setMult(data.multiplier); setPayout(data.payout)
        if (data.status === 'won') {
          setMinePos(data.mines||[]); setPhase('won')
          updateBalance(data.balance)
          setHistory(p=>[{status:'won',bet,payout:data.payout},...p].slice(0,6))
        }
      }
    } catch(e) { setErr(e.response?.data?.error || 'Erreur réseau') }
    finally { setLoading(false) }
  }

  async function cashout() {
    if (phase !== 'playing' || !revealed.length || loading) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/games/mines', { action:'cashout' })
      setMinePos(data.mines||[]); setPhase('cashed'); setMult(data.multiplier)
      setPayout(data.payout); updateBalance(data.balance)
      setHistory(p=>[{status:'cashed',bet,payout:data.payout},...p].slice(0,6))
    } catch(e) { setErr(e.response?.data?.error || 'Erreur réseau') }
    finally { setLoading(false) }
  }

  const playing = phase === 'playing'
  const done    = ['exploded','cashed','won'].includes(phase)
  const canCashout = playing && revealed.length > 0 && !loading
  const statusCol = phase === 'exploded' ? '#EF4444' : '#22C55E'

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Link to="/machines" style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(245,230,200,0.3)', textDecoration:'none' }}>← Machines</Link>
        <span style={{ color:'rgba(255,255,255,0.1)' }}>/</span>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(34,197,94,0.6)' }}>💣 Mines</span>
      </div>

      <div style={{ display:'flex', gap:16, alignItems:'start', flex:1 }}>

        {/* Gauche */}
        <div style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'linear-gradient(160deg,#1E1015,#150D10)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:18 }}>
            {!playing ? (
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading} />
                <div style={{ marginTop:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <label style={{ fontFamily:'Cinzel, serif', fontSize:10, color:'rgba(245,230,200,0.3)', textTransform:'uppercase', letterSpacing:'0.15em' }}>
                      Voltorbe
                    </label>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:15, fontWeight:700, color:'#EF4444', background:'rgba(239,68,68,0.12)', padding:'2px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)' }}>
                      {mines} 💣
                    </div>
                  </div>
                  <input type="range" min={1} max={24} value={mines} onChange={e=>setMines(parseInt(e.target.value))} style={{ width:'100%', accentColor:'#EF4444', cursor:'pointer' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Cinzel, serif', fontSize:9, color:'rgba(245,230,200,0.2)', marginTop:3 }}>
                    <span>1 facile</span><span>24 extrême</span>
                  </div>
                </div>
                <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'Crimson Pro, serif', fontSize:12, color:'rgba(245,230,200,0.4)' }}>1ère case sûre</span>
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:13, color:'#F0B429', fontWeight:700 }}>
                    ×{(0.92*(25/(25-mines))).toFixed(2)}
                  </span>
                </div>
                {err && <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(196,30,58,0.1)', border:'1px solid rgba(196,30,58,0.3)', borderRadius:8, fontFamily:'Crimson Pro, serif', fontSize:13, color:'#E8556A' }}>⚠ {err}</div>}
                <button onClick={start} disabled={loading||bet<10||bet>(user?.balance||0)} style={{
                  width:'100%', marginTop:12, padding:'15px',
                  background: loading ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#FFD700,#F0B429,#D4890A)',
                  color: loading ? 'rgba(245,230,200,0.3)' : '#1A0A00',
                  fontFamily:'Cinzel, serif', fontWeight:700, fontSize:14,
                  borderRadius:12, border:'none', cursor: loading||bet>(user?.balance||0)?'not-allowed':'pointer',
                  opacity: loading||bet>(user?.balance||0)?0.4:1,
                  boxShadow: loading?'none':'0 4px 20px rgba(240,180,41,0.4)',
                  textTransform:'uppercase', letterSpacing:'0.05em',
                }}>
                  {loading?'Démarrage…':done?'🔄 Nouvelle partie':'💣 Commencer'}
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign:'center', padding:'12px', background:'rgba(255,255,255,0.03)', borderRadius:12, marginBottom:12 }}>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:10, color:'rgba(245,230,200,0.3)', marginBottom:4 }}>Multiplicateur</div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:32, fontWeight:700, color:'#FFD700' }}>×{mult}</div>
                  {revealed.length > 0 && (
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:16, color:'#22C55E', fontWeight:700, marginTop:4 }}>
                      {payout.toLocaleString('fr-FR')} ✦
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'center', fontFamily:'Crimson Pro, serif', fontSize:13, color:'rgba(245,230,200,0.4)', marginBottom:12 }}>
                  Mise : <span style={{ color:'#F0B429', fontFamily:'JetBrains Mono, monospace' }}>{bet.toLocaleString('fr-FR')}</span> · <span style={{ color:'#EF4444' }}>{mines} 💣</span>
                </div>
                <button onClick={cashout} disabled={!canCashout} style={{
                  width:'100%', padding:'14px',
                  background: canCashout ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                  color: canCashout ? '#22C55E' : 'rgba(245,230,200,0.2)',
                  border:`1px solid ${canCashout?'rgba(34,197,94,0.35)':'rgba(255,255,255,0.06)'}`,
                  fontFamily:'Cinzel, serif', fontWeight:700, fontSize:13,
                  borderRadius:12, cursor: canCashout ? 'pointer' : 'not-allowed',
                  boxShadow: canCashout ? '0 0 20px rgba(34,197,94,0.2)' : 'none',
                  transition:'all 0.15s', textTransform:'uppercase',
                }}>
                  {revealed.length === 0 ? 'Retourne une case…' : `💰 Encaisser ${payout.toLocaleString('fr-FR')} ✦`}
                </button>
                {err && <div style={{ marginTop:8, fontSize:12, color:'#E8556A', padding:'7px 10px', background:'rgba(196,30,58,0.1)', borderRadius:8, fontFamily:'Crimson Pro, serif' }}>⚠ {err}</div>}
              </>
            )}
          </div>

          {done && (
            <div style={{ background:`${statusCol}08`, border:`1px solid ${statusCol}25`, borderRadius:14, padding:16, animation:'slideInUp 0.3s ease forwards' }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:13, fontWeight:800, color:statusCol, marginBottom:4 }}>
                {phase==='exploded'?'💥 Voltorbe !':phase==='won'?'🏆 Grille complète !':'✅ Encaissé !'}
              </div>
              <div style={{ fontFamily:'Crimson Pro, serif', fontSize:12, color:'rgba(245,230,200,0.4)', marginBottom:8 }}>
                {revealed.length} cases · {mines} mines
              </div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:24, fontWeight:700, color:statusCol }}>
                {phase==='exploded'?`−${bet.toLocaleString('fr-FR')}`:`+${payout.toLocaleString('fr-FR')}`}
              </div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:10, color:'rgba(245,230,200,0.3)' }}>jetons</div>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {history.map((h,i) => (
                <div key={i} style={{
                  fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700,
                  padding:'3px 8px', borderRadius:20,
                  background: h.status==='exploded' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  border:`1px solid ${h.status==='exploded'?'rgba(239,68,68,0.25)':'rgba(34,197,94,0.25)'}`,
                  color: h.status==='exploded' ? '#EF4444' : '#22C55E',
                }}>
                  {h.status==='exploded'?'💥':`+${h.payout.toLocaleString('fr-FR')}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Centre — Grille */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ fontFamily:'Cinzel Decorative, serif', fontSize:22, fontWeight:900, color:'#22C55E', textShadow:'0 0 30px rgba(34,197,94,0.3)', letterSpacing:4, marginBottom:4 }}>MINES</h1>
            <p style={{ fontFamily:'Crimson Pro, serif', fontSize:13, color:'rgba(245,230,200,0.4)' }}>
              Grille 5×5 · Évite les Voltorbe · Encaisse quand tu veux
            </p>
          </div>

          <div style={{
            background:'rgba(0,0,0,0.3)',
            border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:18, padding:20,
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,58px)', gap:8 }}>
              {Array.from({length:25},(_,i) => (
                <Cell key={i} i={i} state={cellState(i)} onClick={reveal} disabled={!playing||loading} />
              ))}
            </div>
          </div>

          {playing && revealed.length > 0 && (
            <div style={{
              display:'flex', alignItems:'center', gap:16, padding:'12px 24px',
              background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.2)',
              borderRadius:12, animation:'slideInUp 0.3s ease forwards',
            }}>
              <div style={{ fontFamily:'Crimson Pro, serif', fontSize:12, color:'rgba(245,230,200,0.4)' }}>
                {revealed.length} case{revealed.length>1?'s':''}
              </div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:24, fontWeight:700, color:'#FFD700' }}>×{mult}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:16, fontWeight:700, color:'#22C55E' }}>
                {payout.toLocaleString('fr-FR')} ✦
              </div>
            </div>
          )}

          {phase === 'idle' && (
            <div style={{ fontFamily:'Crimson Pro, serif', fontSize:14, color:'rgba(245,230,200,0.3)', textAlign:'center' }}>
              Configure ta mise et lance le jeu !
            </div>
          )}
        </div>

        {/* Droite — Règles */}
        <div style={{ width:210, flexShrink:0, background:'linear-gradient(160deg,#1E1015,#150D10)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:16 }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:11, fontWeight:700, color:'rgba(34,197,94,0.6)', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:14 }}>Comment jouer</div>
          {[
            {icon:'🪙',t:'Retourne des cases',d:'pour trouver des jetons'},
            {icon:'💰',t:'Encaisse quand tu veux',d:'le gain est sécurisé'},
            {icon:'💥',t:'Un Voltorbe touché',d:'= tout est perdu, 0 jeton'},
            {icon:'📈',t:'Plus de mines',d:'= multiplicateurs plus élevés'},
            {icon:'🏆',t:'Toutes les cases sûres',d:'= victoire totale'},
          ].map(({icon,t,d}) => (
            <div key={t} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
              <div>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:11, fontWeight:700, color:'rgba(245,230,200,0.7)', marginBottom:2 }}>{t}</div>
                <div style={{ fontFamily:'Crimson Pro, serif', fontSize:11, color:'rgba(245,230,200,0.35)' }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
