import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}
const GAME_ICONS={slots:'🎰',plinko:'⚪',roulette:'🎡',crash:'📈',blackjack:'🃏',mines:'💣'}
const GAME_NAMES={slots:'Slots',plinko:'Plinko',roulette:'Roulette',crash:'Crash',blackjack:'Blackjack',mines:'Mines'}

export default function PublicProfile() {
  const { username } = useParams()
  const [data,    setData]    = useState(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    axios.get(`/api/games/player/${username}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Joueur introuvable'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return <div style={{ padding:'60px', textAlign:'center', color:C.muted }}>Chargement…</div>

  if (error) return (
    <div style={{ padding:'60px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>😕</div>
      <div style={{ color:C.red, fontSize:14, marginBottom:8 }}>{error}</div>
      <Link to="/classement" style={{ color:C.muted, fontSize:12 }}>← Retour au classement</Link>
    </div>
  )

  const { stats, by_game, big_wins, member_since } = data
  const profit = stats.net_profit ?? 0

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 28px', boxSizing:'border-box' }}>
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <Link to="/classement" style={{ fontSize:11, color:C.muted, textDecoration:'none' }}>← Classement</Link>
        <span style={{ color:C.dim }}>/</span>
        <span style={{ fontSize:11, color:'#9898b8' }}>{data.username}</span>
      </div>

      {/* Header */}
      <div style={{ background:C.surf, border:`1px solid ${profit>=0?C.gold+'30':C.border}`, borderRadius:16, padding:'20px 24px', marginBottom:14, display:'flex', alignItems:'center', gap:18 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:`${C.gold}18`, border:`2px solid ${C.gold}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:C.gold, fontWeight:900, flexShrink:0 }}>
          {data.username?.slice(0,2).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:C.txt, margin:'0 0 4px' }}>{data.username}</h1>
          <div style={{ fontSize:11, color:C.muted }}>Membre depuis {new Date(member_since).toLocaleDateString('fr')}</div>
        </div>
        <div style={{ marginLeft:'auto', background:profit>=0?`${C.green}08`:`${C.red}08`, border:`1px solid ${profit>=0?C.green+'25':C.red+'25'}`, borderRadius:12, padding:'10px 18px', textAlign:'center' }}>
          <div style={{ fontSize:9, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Bilan net</div>
          <div style={{ fontSize:24, fontWeight:900, color:profit>=0?C.green:C.red }}>{profit>=0?'+':''}{profit.toLocaleString()}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          { icon:'🎮', label:'Parties',     val: stats.games_played.toLocaleString() },
          { icon:'🪙', label:'Total misé',  val: stats.total_bet.toLocaleString() },
          { icon:'💰', label:'Total gagné', val: stats.total_payout.toLocaleString() },
          { icon:'🔥', label:'Meilleur gain', val: `+${stats.biggest_profit?.toLocaleString() ?? 0}`, color: C.gold },
        ].map(({ icon, label, val, color }) => (
          <div key={label} style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{icon}</div>
            <div style={{ fontSize:18, fontWeight:900, color:color||C.txt }}>{val}</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Par jeu */}
        {by_game?.length > 0 && (
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.txt, marginBottom:14 }}>Par jeu</div>
            {by_game.map(g => {
              const gp = parseInt(g.profit)
              return (
                <div key={g.game} style={{ background:C.dim, borderRadius:10, padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{GAME_ICONS[g.game]||'🎲'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.txt, marginBottom:2 }}>{GAME_NAMES[g.game]||g.game}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{parseInt(g.plays)} parties · meilleur gain {parseInt(g.best_win).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:gp>=0?C.green:C.red }}>{gp>=0?'+':''}{gp.toLocaleString()}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Gros coups */}
        {big_wins?.length > 0 && (
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.txt, marginBottom:14 }}>🔥 Gros coups</div>
            {big_wins.map((w, i) => (
              <div key={i} style={{ background:C.dim, border:`1px solid ${C.gold}15`, borderRadius:10, padding:'10px 14px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:14 }}>{GAME_ICONS[w.game]||'🎲'}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.txt }}>{GAME_NAMES[w.game]||w.game}</span>
                  </div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>Mise {parseInt(w.bet).toLocaleString()}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16, fontWeight:900, color:C.gold }}>+{parseInt(w.profit).toLocaleString()}</div>
                  <div style={{ fontSize:9, color:C.muted }}>{new Date(w.created_at).toLocaleDateString('fr')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
