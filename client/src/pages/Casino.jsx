import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { getRankFromWagered, getNextRank, getXPProgress } from '../utils/ranks'

const GAMES = [
  { id:'slots',     to:'/casino/slots',     icon:'🎰', name:'Slot Machine',    sub:'Jackpot jusqu\'à ×261',   color:'#fbbf24', badge:'HOT' },
  { id:'blackjack', to:'/casino/blackjack', icon:'🃏', name:'Blackjack',        sub:'Blackjack naturel ×2.2', color:'#60a5fa' },
  { id:'mines',     to:'/casino/mines',     icon:'💣', name:'Mines',            sub:'Encaisse quand tu veux',  color:'#10b981' },
  { id:'roulette',  to:'/casino/roulette',  icon:'🎡', name:'Roulette Pokémon', sub:'Légendaire = ×14',        color:'#a78bfa' },
  { id:'plinko',    to:'/casino/plinko',    icon:'⚪', name:'Plinko',           sub:'Jackpot ×37.5 risque max',color:'#f472b6' },
]

export default function Casino() {
  const { user } = useAuth()
  const { gameSettings } = useSocket()
  const navigate = useNavigate()
  const [bonus, setBonus]   = useState(false)
  const [jp,    setJp]      = useState(null)

  const rank     = user?.total_wagered !== undefined ? getRankFromWagered(user.total_wagered) : null
  const nextRank = rank ? getNextRank(rank.id) : null
  const xp       = rank && nextRank ? getXPProgress(user?.total_wagered||0, rank, nextRank) : 100

  useEffect(() => {
    if (!user) return
    axios.get('/api/wheel').then(r => setBonus(r.data.can_spin)).catch(() => {})
    axios.get('/api/superjackpot').then(r => setJp(r.data.amount)).catch(() => {})
  }, [user])

  const hour = new Date().getHours()
  const greet = hour < 6 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="page" style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Bonus banner */}
      {bonus && (
        <Link to="/roue-du-jour" style={{ textDecoration:'none' }}>
          <div className="bonus-banner">
            <div className="bb-icon">🎁</div>
            <div>
              <div className="bb-title">Coffre du Jour disponible !</div>
              <div className="bb-sub">Jusqu'à 50 000 jetons gratuits — expire à minuit</div>
            </div>
            <button className="bb-cta">Ouvrir →</button>
          </div>
        </Link>
      )}

      {/* Welcome + Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'start' }}>
        <div>
          <div style={{ fontFamily:'Exo 2,sans-serif', fontSize:12, color:'#5b3fa0', marginBottom:2 }}>{greet},</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:18, fontWeight:900, color:'#e2d4f0', marginBottom:4 }}>
            <span style={{ color:'#a78bfa' }}>{user?.username}</span> 👋
          </div>
          {rank && nextRank && (
            <div style={{ maxWidth:280 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#5b3fa0', marginBottom:4, fontFamily:'Rajdhani,sans-serif' }}>
                <span>{rank.icon} {rank.name}</span>
                <span>→ {nextRank.icon} {nextRank.name}</span>
              </div>
              <div className="xp-track"><div className="xp-fill" style={{ width:`${xp}%`, background:`linear-gradient(90deg,${rank.color}99,${rank.color})` }} /></div>
              <div style={{ fontSize:9, color:'#5b3fa0', marginTop:3, fontFamily:'Orbitron,monospace' }}>
                {(user?.total_wagered||0).toLocaleString('fr-FR')} / {nextRank.threshold.toLocaleString('fr-FR')} ✦
              </div>
            </div>
          )}
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          <div className="stat-card gold">
            <div className="sv">{(user?.balance||0).toLocaleString('fr-FR')}</div>
            <div className="sl">Solde ✦</div>
          </div>
          <div className="stat-card pink">
            <div className="sv">{jp !== null ? jp.toLocaleString('fr-FR') : '—'}</div>
            <div className="sl">Jackpot</div>
          </div>
          <div className="stat-card" style={{ '--accent': rank?.color }}>
            <div className="sv" style={{ color: rank?.color || '#a78bfa', fontSize:13 }}>{rank?.icon} {rank?.name}</div>
            <div className="sl">Rang actuel</div>
          </div>
        </div>
      </div>

      {/* Grille jeux */}
      <div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, color:'#5b3fa0', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
          Les machines
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
          {GAMES.map(g => {
            const enabled = gameSettings[g.id] !== false
            return (
              <Link key={g.id} to={enabled ? g.to : '#'} style={{ textDecoration:'none' }}>
                <div
                  className="game-tile"
                  style={{ '--accent': g.color, opacity: enabled ? 1 : .45, cursor: enabled ? 'pointer' : 'not-allowed', padding:'12px 10px', textAlign:'center' }}
                >
                  {g.badge && enabled && <div className="gt-badge">{g.badge}</div>}
                  {!enabled && <div className="gt-badge" style={{ background:'rgba(107,114,128,.2)', color:'#6b7280', borderColor:'rgba(107,114,128,.3)' }}>OFF</div>}
                  <div className="gt-icon" style={{ fontSize:30, margin:'0 0 8px' }}>{g.icon}</div>
                  <div className="gt-name" style={{ fontSize:12 }}>{g.name}</div>
                  <div className="gt-sub" style={{ fontSize:10, marginTop:3 }}>{g.sub}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="card" style={{ padding:'12px 14px' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, color:'#5b3fa0', letterSpacing:2, marginBottom:10, textTransform:'uppercase' }}>Comment jouer ?</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { icon:'🎮', title:'Gagne des Pokédollars', desc:'En jouant sur CobbleMoon.' },
            { icon:'💬', title:'Échange avec Frilous', desc:'1 jeton = 1 Pokédollar.' },
            { icon:'🎰', title:'Joue au casino', desc:'Mise min 10 ✦, max selon rang.' },
            { icon:'💸', title:'Retire tes gains', desc:'Frilous te reverse en jeu.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background:'rgba(109,40,217,.05)', border:'1px solid rgba(109,40,217,.1)', borderRadius:9, padding:'10px 10px' }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:12, fontWeight:700, color:'#c4b5fd', marginBottom:3 }}>{title}</div>
              <div style={{ fontFamily:'Exo 2,sans-serif', fontSize:11, color:'#5b3fa0', lineHeight:1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
