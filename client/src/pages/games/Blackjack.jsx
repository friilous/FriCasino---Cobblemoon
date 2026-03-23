import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'

const SPRITE = dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const SUIT_COLORS = { '♠':'#C8D4E8', '♣':'#C8D4E8', '♥':'#F87171', '♦':'#F87171' }
const STATUS = {
  blackjack:       { label:'🏆 BLACKJACK !',       color:'#FFD700' },
  win:             { label:'✅ Gagné !',             color:'#22C55E' },
  push:            { label:'🤝 Égalité',             color:'#A78BFA' },
  bust:            { label:'💥 Dépassement !',       color:'#EF4444' },
  lose:            { label:'❌ Perdu',               color:'#EF4444' },
  dealer_blackjack:{ label:'😈 Blackjack dealer',   color:'#EF4444' },
}

function Card({ card, hidden = false }) {
  if (hidden) return (
    <div style={{
      width:76, height:106, borderRadius:10, flexShrink:0,
      background:'linear-gradient(135deg, #1A0F14 25%, #2A1525 50%, #1A0F14 75%)',
      border:'1px solid rgba(255,255,255,0.08)',
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow:'0 4px 14px rgba(0,0,0,0.6)',
    }}>
      <span style={{ fontSize:28 }}>🎴</span>
    </div>
  )
  const col = SUIT_COLORS[card.suit] || '#C8D4E8'
  return (
    <div style={{
      width:76, height:106, borderRadius:10,
      background:'linear-gradient(160deg, #1E1015, #150D10)',
      border:'1px solid rgba(255,255,255,0.1)',
      display:'flex', flexDirection:'column', padding:'6px 7px',
      flexShrink:0, boxShadow:'0 4px 14px rgba(0,0,0,0.5)',
    }}>
      <div style={{ lineHeight:1.1 }}>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:14, fontWeight:700, color:col }}>{card.value}</div>
        <div style={{ fontSize:11, color:col }}>{card.suit}</div>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <img src={SPRITE(card.dex)} alt="" style={{ width:38, height:38, imageRendering:'pixelated', objectFit:'contain', filter:`drop-shadow(0 0 4px ${col}60)` }} />
      </div>
      <div style={{ lineHeight:1.1, transform:'rotate(180deg)', alignSelf:'flex-end' }}>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:14, fontWeight:700, color:col }}>{card.value}</div>
        <div style={{ fontSize:11, color:col }}>{card.suit}</div>
      </div>
    </div>
  )
}

function Score({ v }) {
  if (!v) return null
  return (
    <div style={{
      fontFamily:'JetBrains Mono, monospace', fontSize:14, fontWeight:700,
      padding:'3px 12px', borderRadius:20,
      background:'rgba(255,255,255,0.05)',
      border:`1px solid ${v > 21 ? 'rgba(239,68,68,0.4)' : v === 21 ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
      color: v > 21 ? '#EF4444' : v === 21 ? '#FFD700' : '#F5E6C8',
      boxShadow: v === 21 ? '0 0 10px rgba(255,215,0,0.3)' : 'none',
    }}>
      {v > 21 ? `${v} 💥` : v === 21 ? '21 ✨' : v}
    </div>
  )
}

export default function Blackjack() {
  const { user, updateBalance } = useAuth()
  const [bet,     setBet]   = useState(100)
  const [phase,   setPhase] = useState('idle')
  const [game,    setGame]  = useState(null)
  const [loading, setLoad]  = useState(false)
  const [err,     setErr]   = useState('')
  const [history, setHist]  = useState([])

  async function act(action, betAmt) {
    setLoad(true); setErr('')
    try {
      const { data } = await axios.post('/api/games/blackjack',
        action === 'deal' ? { action, bet: betAmt } : { action }
      )
      setGame(data); updateBalance(data.balance)
      if (data.done) {
        setPhase('done')
        setHist(p => [{ status:data.status, bet:action==='deal'?betAmt:game?.bet, payout:data.payout, doubled:data.doubled||false }, ...p].slice(0,6))
      } else { setPhase('playing') }
    } catch (e) { setErr(e.response?.data?.error || 'Erreur réseau') }
    finally { setLoad(false) }
  }

  const canDouble = game?.canDouble && phase === 'playing' && (user?.balance || 0) >= (game?.bet || 0)
  const info   = game?.status ? STATUS[game.status] : null
  const playing = phase === 'playing', done = phase === 'done'

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Link to="/machines" style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(245,230,200,0.3)', textDecoration:'none' }}>← Machines</Link>
        <span style={{ color:'rgba(255,255,255,0.1)' }}>/</span>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(96,165,250,0.6)' }}>🃏 Blackjack</span>
      </div>

      <div style={{ display:'flex', gap:16, alignItems:'start', flex:1 }}>

        {/* Gauche */}
        <div style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'linear-gradient(160deg,#1E1015,#150D10)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:18 }}>
            {!playing ? (
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading} />
                {err && <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(196,30,58,0.1)', border:'1px solid rgba(196,30,58,0.3)', borderRadius:8, fontFamily:'Crimson Pro, serif', fontSize:13, color:'#E8556A' }}>⚠ {err}</div>}
                <button onClick={() => act('deal', bet)} disabled={loading || bet < 10 || bet > (user?.balance || 0)} style={{
                  width:'100%', marginTop:14, padding:'15px',
                  background: loading ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#FFD700,#F0B429,#D4890A)',
                  color: loading ? 'rgba(245,230,200,0.3)' : '#1A0A00',
                  fontFamily:'Cinzel, serif', fontWeight:700, fontSize:14,
                  borderRadius:12, border:'none', cursor: loading || bet>(user?.balance||0) ? 'not-allowed' : 'pointer',
                  opacity: loading || bet > (user?.balance||0) ? 0.4 : 1,
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(240,180,41,0.4)',
                  textTransform:'uppercase', letterSpacing:'0.05em',
                }}>
                  {loading ? 'Distribution…' : done ? '🔄 Nouvelle partie' : '🃏 Distribuer'}
                </button>
              </>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ textAlign:'center', fontFamily:'Crimson Pro, serif', fontSize:14, color:'rgba(245,230,200,0.5)', marginBottom:4 }}>
                  Mise : <span style={{ color:'#F0B429', fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{(game?.bet || bet).toLocaleString('fr-FR')} ✦</span>
                </div>
                <button onClick={() => act('hit')} disabled={loading} style={{ width:'100%', padding:'12px', background:'rgba(96,165,250,0.1)', color:'#60A5FA', fontFamily:'Cinzel, serif', fontWeight:700, fontSize:13, borderRadius:10, border:'1px solid rgba(96,165,250,0.3)', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  🃏 Tirer une carte
                </button>
                <button onClick={() => act('stand')} disabled={loading} style={{ width:'100%', padding:'12px', background:'rgba(196,30,58,0.1)', color:'#E8556A', fontFamily:'Cinzel, serif', fontWeight:700, fontSize:13, borderRadius:10, border:'1px solid rgba(196,30,58,0.3)', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  ✋ Rester
                </button>
                {canDouble && (
                  <button onClick={() => act('double')} disabled={loading} style={{ width:'100%', padding:'10px', background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.3)', color:'#FFD700', fontFamily:'Cinzel, serif', fontWeight:700, fontSize:12, borderRadius:10, cursor:'pointer', textTransform:'uppercase' }}>
                    💰 Double Down
                  </button>
                )}
                {err && <div style={{ fontSize:12, color:'#E8556A', padding:'7px 10px', background:'rgba(196,30,58,0.1)', borderRadius:8, fontFamily:'Crimson Pro, serif' }}>⚠ {err}</div>}
                <div style={{ textAlign:'center', fontFamily:'Crimson Pro, serif', fontSize:13, color:'rgba(245,230,200,0.4)' }}>
                  Ta main : <span style={{ color:(game?.playerValue||0)>21?'#EF4444':(game?.playerValue||0)===21?'#FFD700':'#F5E6C8', fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{game?.playerValue||0}</span>
                </div>
              </div>
            )}
          </div>

          {done && info && (
            <div style={{ background:`${info.color}0a`, border:`1px solid ${info.color}28`, borderRadius:14, padding:16, animation:'slideInUp 0.3s ease forwards' }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:14, fontWeight:800, color:info.color, marginBottom:4 }}>
                {info.label} {game?.doubled && <span style={{ fontSize:10, color:'#FFD700', marginLeft:6 }}>× Double</span>}
              </div>
              <div style={{ fontFamily:'Crimson Pro, serif', fontSize:12, color:'rgba(245,230,200,0.4)', marginBottom:8 }}>
                {game?.playerValue} vs {game?.dealerValue}
              </div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:24, fontWeight:700, color:info.color }}>
                {game?.payout > 0 ? `+${game.payout.toLocaleString('fr-FR')}` : `−${(game?.bet||bet).toLocaleString('fr-FR')}`}
              </div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:10, color:'rgba(245,230,200,0.3)' }}>jetons</div>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {history.map((h,i) => {
                const inf = STATUS[h.status]
                const net = h.payout - (h.bet||0)
                return (
                  <div key={i} style={{
                    fontFamily:'Cinzel, serif', fontSize:10, fontWeight:700,
                    padding:'3px 8px', borderRadius:20,
                    background: net > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
                    border:`1px solid ${net > 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
                    color: net > 0 ? '#22C55E' : '#EF4444',
                  }}>
                    {inf?.label?.split(' ')[0]}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Centre — Table de jeu */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ fontFamily:'Cinzel Decorative, serif', fontSize:22, fontWeight:900, color:'#60A5FA', textShadow:'0 0 30px rgba(96,165,250,0.3)', letterSpacing:4, marginBottom:4 }}>BLACKJACK</h1>
          </div>

          {/* Tapis */}
          <div style={{
            background:'linear-gradient(160deg, #0A1A0C, #081408)',
            border:'1px solid rgba(34,197,94,0.2)',
            borderRadius:20, padding:28, minHeight:380,
            display:'flex', flexDirection:'column', justifyContent:'space-between', gap:20,
            boxShadow:'inset 0 0 60px rgba(0,0,0,0.5)',
            position:'relative', overflow:'hidden',
          }}>
            {/* Texture tapis */}
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, rgba(34,197,94,0.03) 0%, transparent 70%)', pointerEvents:'none' }} />

            {/* Dealer */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(245,230,200,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>🎩 Dealer</span>
                <Score v={done ? game?.dealerValue : (game?.dealer?.[0] ? game.dealerValue : 0)} />
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', minHeight:106 }}>
                {(game?.dealer || []).map((c,i) => <Card key={i} card={c} hidden={c.hidden} />)}
              </div>
            </div>

            {/* Séparateur */}
            <div style={{ position:'relative', borderTop:'1px dashed rgba(34,197,94,0.2)', margin:'0 20px' }}>
              <span style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'#0A1A0C', padding:'0 16px', fontSize:16 }}>🎯</span>
            </div>

            {/* Joueur */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'rgba(245,230,200,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>👤 {user?.username}</span>
                <Score v={game?.playerValue || 0} />
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', minHeight:106 }}>
                {(game?.player || []).map((c,i) => <Card key={i} card={c} />)}
              </div>
            </div>
          </div>

          {phase === 'idle' && (
            <div style={{ textAlign:'center', fontFamily:'Crimson Pro, serif', fontSize:14, color:'rgba(245,230,200,0.3)' }}>
              Place ta mise et distribue les cartes !
            </div>
          )}
        </div>

        {/* Droite — Règles */}
        <div style={{ width:210, flexShrink:0, background:'linear-gradient(160deg,#1E1015,#150D10)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:16 }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:11, fontWeight:700, color:'rgba(96,165,250,0.6)', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:14 }}>Règles</div>
          {[
            ['🏆 Blackjack naturel','×2.2','#FFD700'],
            ['✅ Victoire','×1.8','#22C55E'],
            ['🤝 Égalité','×1.0','#A78BFA'],
            ['💥 Dépasser 21','×0','#EF4444'],
            ['💰 Double Down','mise ×2','#FFD700'],
          ].map(([l,v,col]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily:'Crimson Pro, serif', fontSize:12, color:'rgba(245,230,200,0.4)' }}>{l}</span>
              <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:13, fontWeight:700, color:col }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:12, fontFamily:'Crimson Pro, serif', fontSize:12, color:'rgba(245,230,200,0.3)', lineHeight:1.8 }}>
            <div>📌 Double Down : total 9, 10 ou 11</div>
            <div>🎴 Dealer tire jusqu'à 17 min</div>
            <div>🎲 6 decks · Soft 17 = tire</div>
          </div>
        </div>
      </div>
    </div>
  )
}
