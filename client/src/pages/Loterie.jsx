import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}

export default function Loterie() {
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [data,    setData]    = useState(null)
  const [myTix,   setMyTix]   = useState(0)
  const [qty,     setQty]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [msg,     setMsg]     = useState(null)
  const [winner,  setWinner]  = useState(null)

  async function load() {
    try {
      const [r1, r2, r3] = await Promise.all([
        axios.get('/api/lottery'),
        user ? axios.get('/api/lottery/mytickets') : Promise.resolve({ data: { tickets: 0 } }),
        axios.get('/api/lottery/history'),
      ])
      setData(r1.data)
      setMyTix(r2.data.tickets)
      setHistory(r3.data)
    } catch {}
  }

  useEffect(() => { load() }, [user])

  // Socket — mise à jour live
  useEffect(() => {
    if (!socket) return
    socket.on('lottery_update', ({ pot }) => {
      setData(d => d ? { ...d, pot } : d)
    })
    socket.on('lottery_won', ({ winner: w, amount, new_pot }) => {
      setWinner({ username: w, amount })
      setData(d => d ? { ...d, pot: new_pot } : d)
      load()
    })
    return () => { socket.off('lottery_update'); socket.off('lottery_won') }
  }, [socket])

  async function buy() {
    if (!user || loading) return
    setLoading(true); setMsg(null)
    try {
      const { data: r } = await axios.post('/api/lottery/buy', { amount: qty })
      updateBalance(r.balance)
      setMyTix(t => t + qty)
      setData(d => d ? { ...d, pot: r.pot, total_tickets: (d.total_tickets || 0) + qty } : d)
      setMsg({ type: 'ok', text: `${qty} ticket${qty > 1 ? 's' : ''} acheté${qty > 1 ? 's' : ''} !` })
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.error || 'Erreur' })
    }
    setLoading(false)
  }

  const pot     = data?.pot ?? 0
  const tixCount = data?.total_tickets ?? 0
  const winChance = myTix > 0 && tixCount > 0 ? ((myTix / tixCount) * 100).toFixed(1) : 0
  const cost    = qty * 5000

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 28px', boxSizing:'border-box' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <Link to="/casino" style={{ fontSize:11, color:C.muted, textDecoration:'none' }}>← Accueil</Link>
        <span style={{ color:C.dim }}>/</span>
        <span style={{ fontSize:11, color:'#9898b8' }}>🎟️ Loterie</span>
      </div>

      {/* Annonce victoire */}
      {winner && (
        <div style={{ background:`${C.gold}12`, border:`1px solid ${C.gold}40`, borderRadius:14, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:28 }}>🏆</span>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:C.gold }}>{winner.username} a remporté la loterie !</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>{winner.amount.toLocaleString()} jetons remportés</div>
          </div>
          <button onClick={() => setWinner(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>

        {/* Zone principale */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Pot */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:18, padding:28, textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${C.gold},transparent)` }}/>
            <div style={{ fontSize:12, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>Cagnotte actuelle</div>
            <div style={{ fontSize:52, fontWeight:900, color:C.gold, fontFamily:'monospace', lineHeight:1 }}>
              {pot.toLocaleString()}
            </div>
            <div style={{ fontSize:14, color:C.muted, marginTop:6 }}>jetons · 80% pour le gagnant = <span style={{ color:C.green, fontWeight:700 }}>{Math.floor(pot * 0.8).toLocaleString()} jetons</span></div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'Tickets vendus', val: tixCount, col: C.txt },
              { label:'Mes tickets',    val: myTix,    col: C.gold },
              { label:'Mes chances',    val: `${winChance}%`, col: myTix > 0 ? C.green : C.muted },
            ].map(({ label, val, col }) => (
              <div key={label} style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:900, color:col }}>{val}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Participants */}
          {data?.players?.length > 0 && (
            <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Participants</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {data.players.map(p => (
                  <div key={p.username} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:`1px solid ${C.dim}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:`${C.gold}18`, border:`1px solid ${C.gold}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:C.gold, fontWeight:700 }}>
                        {p.username.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize:12, color:C.txt, fontWeight:600 }}>{p.username}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:11, color:C.muted }}>{p.count} ticket{p.count > 1 ? 's' : ''}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:C.gold }}>{tixCount > 0 ? ((p.count / tixCount) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Derniers tirages</div>
              {history.map((h, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.dim}` }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:700, color:C.gold }}>🏆 {h.winner}</span>
                    <span style={{ fontSize:10, color:C.muted, marginLeft:8 }}>{h.tickets} tickets · {new Date(h.drawn_at).toLocaleDateString('fr')}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:C.green }}>+{h.amount_won.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau achat */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.txt, marginBottom:14 }}>🎟️ Acheter des tickets</div>

            {/* Quantité */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>Nombre de tickets</div>
              <div style={{ display:'flex', gap:6 }}>
                {[1, 3, 5, 10].map(n => (
                  <button key={n} onClick={() => setQty(n)}
                    style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', border:`2px solid ${qty===n?C.gold:C.border}`, background:qty===n?`${C.gold}18`:'transparent', color:qty===n?C.gold:C.muted, transition:'all .15s' }}>
                    {n}
                  </button>
                ))}
              </div>
              <input type="number" min={1} max={50} value={qty} onChange={e => setQty(Math.max(1, Math.min(50, parseInt(e.target.value)||1)))}
                style={{ width:'100%', marginTop:8, background:'#07071a', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', color:C.txt, fontSize:13, outline:'none', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Récap */}
            <div style={{ background:C.dim, borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:C.muted }}>Prix / ticket</span>
                <span style={{ color:C.txt, fontWeight:700 }}>5 000 jetons</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:C.muted }}>Tickets</span>
                <span style={{ color:C.txt, fontWeight:700 }}>×{qty}</span>
              </div>
              <div style={{ height:1, background:C.border, margin:'8px 0' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                <span style={{ color:C.muted, fontWeight:700 }}>Total</span>
                <span style={{ color:C.gold, fontWeight:900 }}>{cost.toLocaleString()} jetons</span>
              </div>
              {user && <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>Solde restant : <span style={{ color:C.txt }}>{(user.balance - cost).toLocaleString()}</span></div>}
            </div>

            {msg && (
              <div style={{ fontSize:11, padding:'8px 12px', borderRadius:8, marginBottom:10, background:msg.type==='ok'?`${C.green}12`:`${C.red}10`, border:`1px solid ${msg.type==='ok'?C.green+'28':C.red+'25'}`, color:msg.type==='ok'?C.green:C.red }}>
                {msg.type==='ok'?'✓':' ⚠'} {msg.text}
              </div>
            )}

            <button onClick={buy} disabled={loading || !user || cost > (user?.balance ?? 0)}
              style={{ width:'100%', padding:'14px', background:loading||!user||cost>(user?.balance??0)?C.dim:C.gold, color:loading||!user||cost>(user?.balance??0)?C.muted:'#06060f', fontWeight:800, fontSize:15, borderRadius:10, border:'none', cursor:loading||!user||cost>(user?.balance??0)?'not-allowed':'pointer', boxShadow:cost<=(user?.balance??0)&&user?`0 0 20px ${C.gold}44`:'none', transition:'all .15s' }}>
              {loading ? 'Achat…' : !user ? 'Connecte-toi pour jouer' : `🎟️ Acheter ${qty} ticket${qty>1?'s':''}`}
            </button>
          </div>

          {/* Règles */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Règles</div>
            {[
              { icon:'🎟️', t:'Ticket à 5 000 jetons',   d:'Achetez autant de tickets que vous voulez' },
              { icon:'📊', t:'Plus de tickets',          d:'= plus de chances de gagner' },
              { icon:'🏆', t:'80% de la cagnotte',       d:'directement crédités au gagnant' },
              { icon:'🔄', t:'20% reporté',              d:'pour alimenter le prochain tirage' },
              { icon:'⏰', t:'Tirage toutes les 48h',    d:'à 20h heure française' },
            ].map(({ icon, t, d }) => (
              <div key={t} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:`1px solid ${C.dim}` }}>
                <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
                <div><div style={{ fontSize:11, fontWeight:700, color:C.txt }}>{t}</div><div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{d}</div></div>
              </div>
            ))}
          </div>

          {/* Compte à rebours */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:14, textAlign:'center' }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Prochain tirage dans</div>
            <DrawCountdown />
          </div>
        </div>
      </div>
    </div>
  )
}

function DrawCountdown() {
  const [label, setLabel] = useState('')
  useEffect(() => {
    function update() {
      const now    = new Date()
      const frNow  = new Date(now.getTime() + 60 * 60 * 1000)
      const target = new Date(frNow)
      target.setHours(20, 0, 0, 0)
      if (frNow >= target) target.setDate(target.getDate() + 1)
      while (target.getDay() % 2 === 0) target.setDate(target.getDate() + 1)
      const diff = target - frNow
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update(); const t = setInterval(update, 1000); return () => clearInterval(t)
  }, [])
  return <div style={{ fontSize:28, fontWeight:900, color:'#e2e2f0', fontFamily:'monospace', letterSpacing:3 }}>{label}</div>
}
