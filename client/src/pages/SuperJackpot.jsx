import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

const C = {
  bg:'#06060f', surf:'#0c0c1e', border:'#1e1e3a',
  gold:'#f0b429', green:'#22c55e', red:'#ef4444',
  txt:'#e2e2f0', muted:'#44446a', dim:'#12121f',
  purple:'#a855f7', blue:'#60a5fa',
}

// Pokémon légendaires décoratifs (numéros de dex)
const LEGENDARY_DEX = [144, 145, 146, 150, 151, 249, 250, 382, 383, 384]
const SPRITE = dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

export default function SuperJackpot() {
  const { user }   = useAuth()
  const { socket } = useSocket()

  const [data,     setData]     = useState(null)
  const [history,  setHistory]  = useState([])
  const [myStatus, setMyStatus] = useState(null)
  const [winner,   setWinner]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [particles, setParticles] = useState([])

  // Particules flottantes décoratives
  useEffect(() => {
    const p = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      dur: 3 + Math.random() * 5,
      delay: Math.random() * 4,
      color: [C.gold, C.purple, C.blue, '#ff6b6b', C.green][Math.floor(Math.random() * 5)],
    }))
    setParticles(p)
  }, [])

  async function load() {
    try {
      const [r1, r2] = await Promise.all([
        axios.get('/api/superjackpot'),
        axios.get('/api/superjackpot/history'),
      ])
      setData(r1.data)
      setHistory(r2.data)
    } catch {}
    setLoading(false)
  }

  async function loadMyStatus() {
    if (!user) return
    try { const r = await axios.get('/api/superjackpot/mystatus'); setMyStatus(r.data) } catch {}
  }

  useEffect(() => { load(); loadMyStatus() }, [user])

  useEffect(() => {
    if (!socket) return
    socket.on('superjackpot_update', ({ amount }) => setData(d => d ? { ...d, amount } : d))
    socket.on('superjackpot_won', ({ winner: w, amount, new_pot, eligible }) => {
      setWinner({ username: w, amount, eligible })
      setData(d => d ? { ...d, amount: new_pot, eligible_count: 0 } : d)
      load()
    })
    socket.on('live_feed', () => {
      axios.get('/api/superjackpot').then(r => setData(r.data)).catch(() => {})
      loadMyStatus()
    })
    return () => { socket.off('superjackpot_update'); socket.off('superjackpot_won'); socket.off('live_feed') }
  }, [socket, user])

  const pot           = data?.amount ?? 0
  const eligibleCount = data?.eligible_count ?? 0
  const threshold     = data?.threshold ?? 5000
  const betProgress   = myStatus ? Math.min((myStatus.bet_today / threshold) * 100, 100) : 0
  const randomLegendary = LEGENDARY_DEX[Math.floor(Date.now() / 10000) % LEGENDARY_DEX.length]

  return (
    <div style={{ minHeight:'100vh', background:C.bg, overflowX:'hidden' }}>

      {/* ── Particules de fond ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size, borderRadius:'50%',
            background:p.color, opacity:0.12,
            animation:`floatParticle ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{ position:'relative', zIndex:1, padding:'24px 28px', boxSizing:'border-box' }}>

        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
          <Link to="/casino" style={{ fontSize:11, color:C.muted, textDecoration:'none' }}>← Accueil</Link>
          <span style={{ color:C.dim }}>/</span>
          <span style={{ fontSize:11, color:'#9898b8' }}>💎 SuperJackpot</span>
        </div>

        {/* ── Annonce victoire ── */}
        {winner && (
          <div style={{
            background:`linear-gradient(135deg, ${C.gold}15, ${C.purple}10)`,
            border:`2px solid ${C.gold}50`,
            borderRadius:20, padding:'20px 28px', marginBottom:24,
            display:'flex', alignItems:'center', gap:16,
            animation:'winnerSlide .5s cubic-bezier(.34,1.56,.64,1)',
          }}>
            <span style={{ fontSize:40 }}>🏆</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:900, color:C.gold }}>
                {winner.username} a remporté le SuperJackpot du soir !
              </div>
              <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
                Tiré parmi {winner.eligible} joueur{winner.eligible > 1 ? 's' : ''} éligible{winner.eligible > 1 ? 's' : ''} ce soir
              </div>
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:'#fff', background:`${C.gold}20`, border:`1px solid ${C.gold}40`, borderRadius:14, padding:'8px 20px', fontFamily:'monospace' }}>
              +{winner.amount.toLocaleString('fr-FR')} jetons
            </div>
            <button onClick={() => setWinner(null)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:22 }}>✕</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>

          {/* ── Colonne principale ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Hero cagnotte */}
            <div style={{
              background:`linear-gradient(135deg, #0d0d20, #12103a, #0a0d1e)`,
              border:`1px solid ${C.gold}30`,
              borderRadius:24, padding:'36px 32px',
              textAlign:'center', position:'relative', overflow:'hidden',
            }}>
              {/* Halo radial */}
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:400, height:400, background:`radial-gradient(circle, ${C.gold}08 0%, transparent 70%)`, pointerEvents:'none' }} />
              {/* Barre déco top */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, transparent, ${C.gold}, ${C.purple}, ${C.gold}, transparent)` }} />

              {/* Pokémon légendaire décoratif */}
              <div style={{ position:'absolute', right:24, top:'50%', transform:'translateY(-50%)', opacity:0.08, pointerEvents:'none' }}>
                <img src={SPRITE(randomLegendary)} alt="" style={{ width:160, height:160, imageRendering:'pixelated', filter:'brightness(2) saturate(0)' }} />
              </div>

              <div style={{ fontSize:11, color:`${C.gold}90`, textTransform:'uppercase', letterSpacing:4, marginBottom:12 }}>
                💎 SuperJackpot du soir
              </div>

              {/* Montant animé */}
              <div style={{
                fontSize:70, fontWeight:900, color:C.gold,
                fontFamily:'monospace', lineHeight:1,
                textShadow:`0 0 60px ${C.gold}50, 0 0 20px ${C.gold}30`,
                animation:'jackpotGlow 2s ease-in-out infinite alternate',
              }}>
                {pot.toLocaleString('fr-FR')}
              </div>
              <div style={{ fontSize:16, color:`${C.gold}70`, marginTop:8, fontWeight:600 }}>jetons</div>

              {/* Countdown mis en avant */}
              <div style={{ marginTop:24, display:'inline-flex', flexDirection:'column', alignItems:'center', gap:6, background:'#ffffff08', border:'1px solid #ffffff10', borderRadius:16, padding:'14px 28px' }}>
                <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>Tirage ce soir dans</div>
                <DrawCountdown large />
              </div>
            </div>

            {/* Statut éligibilité perso */}
            {user && myStatus && (
              <div style={{
                background: myStatus.eligible
                  ? `linear-gradient(135deg, ${C.green}12, ${C.green}06)`
                  : C.surf,
                border:`1px solid ${myStatus.eligible ? C.green + '40' : C.border}`,
                borderRadius:16, padding:'20px 22px',
                boxShadow: myStatus.eligible ? `0 0 30px ${C.green}15` : 'none',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:24 }}>{myStatus.eligible ? '✅' : '🎯'}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color: myStatus.eligible ? C.green : C.txt }}>
                        {myStatus.eligible ? 'Tu participes au tirage de ce soir !' : 'Tu n\'es pas encore éligible'}
                      </div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                        {myStatus.eligible
                          ? 'Continue à jouer — chaque partie compte !'
                          : `Mise encore ${Math.max(0, threshold - myStatus.bet_today).toLocaleString('fr-FR')} jetons aujourd'hui`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:900, color: myStatus.eligible ? C.green : C.gold }}>
                      {myStatus.bet_today.toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize:10, color:C.muted }}>/ {threshold.toLocaleString('fr-FR')} jetons misés</div>
                  </div>
                </div>

                {/* Barre de progression stylisée */}
                <div style={{ height:10, background:'#ffffff08', borderRadius:5, overflow:'hidden', border:'1px solid #ffffff08' }}>
                  <div style={{
                    height:'100%', borderRadius:5,
                    width:`${betProgress}%`,
                    background: myStatus.eligible
                      ? `linear-gradient(90deg, ${C.green}, #4ade80, ${C.green})`
                      : `linear-gradient(90deg, ${C.gold}80, ${C.gold})`,
                    transition:'width .8s cubic-bezier(.34,1.56,.64,1)',
                    boxShadow: myStatus.eligible ? `0 0 12px ${C.green}80` : `0 0 12px ${C.gold}60`,
                    backgroundSize:'200% 100%',
                    animation:'shimmer 2s linear infinite',
                  }} />
                </div>

                {!myStatus.eligible && (
                  <Link to="/machines" style={{ textDecoration:'none', display:'block', marginTop:14 }}>
                    <div style={{
                      background:`linear-gradient(135deg, ${C.gold}20, ${C.gold}10)`,
                      border:`1px solid ${C.gold}30`, borderRadius:10,
                      padding:'10px 16px', textAlign:'center', cursor:'pointer',
                      fontSize:13, fontWeight:700, color:C.gold,
                      transition:'all .2s',
                    }}>
                      🎰 Jouer maintenant pour être éligible →
                    </div>
                  </Link>
                )}
              </div>
            )}

            {/* Stats en ligne */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
              <StatCard icon="👥" label="En lice ce soir" value={eligibleCount} color={eligibleCount > 0 ? C.green : C.muted} glow={eligibleCount > 0} />
              <StatCard icon="🎯" label="Pour participer" value={`${threshold.toLocaleString('fr-FR')} jetons`} color={C.gold} />
            </div>

            {/* Historique gagnants */}
            {history.length > 0 && (
              <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:16, padding:20, overflow:'hidden' }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.gold, textTransform:'uppercase', letterSpacing:2, marginBottom:16 }}>
                  🏆 Derniers gagnants
                </div>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 0',
                    borderBottom: i < history.length - 1 ? `1px solid ${C.dim}` : 'none',
                    animation:`fadeInUp .3s ease ${i * .05}s both`,
                  }}>
                    {/* Médaille */}
                    <div style={{ fontSize: i === 0 ? 22 : 16, width:28, textAlign:'center', flexShrink:0 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                    </div>
                    {/* Avatar */}
                    <div style={{
                      width:36, height:36, borderRadius:'50%',
                      background:`linear-gradient(135deg, ${C.gold}30, ${C.purple}20)`,
                      border:`2px solid ${C.gold}30`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, color:C.gold, fontWeight:900, flexShrink:0,
                    }}>
                      {h.winner.slice(0,2).toUpperCase()}
                    </div>
                    {/* Infos */}
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:C.gold }}>{h.winner}</div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                        {h.eligible} joueur{h.eligible > 1 ? 's' : ''} en lice · {new Date(h.drawn_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
                      </div>
                    </div>
                    {/* Gain */}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:900, color:C.green }}>+{h.amount_won.toLocaleString('fr-FR')}</div>
                      <div style={{ fontSize:10, color:C.muted }}>jetons</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Colonne droite ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Comment ça marche — carte principale */}
            <div style={{
              background:`linear-gradient(160deg, #0e0e24, #0a0a1e)`,
              border:`1px solid ${C.border}`,
              borderRadius:18, padding:22, overflow:'hidden', position:'relative',
            }}>
              {/* Pokémon décoratif en filigrane */}
              <div style={{ position:'absolute', bottom:-10, right:-10, opacity:0.06, pointerEvents:'none' }}>
                <img src={SPRITE(151)} alt="" style={{ width:120, imageRendering:'pixelated', filter:'brightness(3)' }} />
              </div>

              <div style={{ fontSize:13, fontWeight:800, color:C.gold, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
                <span>📖</span> Comment ça marche ?
              </div>

              {[
                { icon:'🎰', color:C.gold,   step:'1', title:'Joue normalement',         desc:'5% de chaque mise part automatiquement dans la cagnotte. Pas besoin de faire quoi que ce soit !' },
                { icon:'🎯', color:C.blue,   step:'2', title:'Atteins 10 000 jetons',      desc:'Si tu mises au moins 10 000 jetons dans la journée, tu es automatiquement inscrit au tirage du soir.' },
                { icon:'🎲', color:C.purple, step:'3', title:'Tirage à 20h00',            desc:'Chaque soir à 20h, un gagnant est tiré au sort parmi tous les joueurs éligibles du jour.' },
                { icon:'💰', color:C.green,  step:'4', title:'Le gagnant emporte tout !', desc:'Le jackpot atterrit directement sur ton compte. Le reste repart en cagnotte pour le lendemain.' },
              ].map(({ icon, color, step, title, desc }) => (
                <div key={step} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.dim}` }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%', flexShrink:0,
                    background:`${color}20`, border:`1px solid ${color}40`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14,
                  }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800, color, marginBottom:3 }}>{title}</div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Countdown seul */}
            <div style={{
              background:C.surf, border:`1px solid ${C.border}`,
              borderRadius:16, padding:18, textAlign:'center',
            }}>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>
                ⏰ Prochain tirage
              </div>
              <DrawCountdown />
              <div style={{ fontSize:11, color:C.muted, marginTop:8 }}>Tous les jours à 20h00 heure française</div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes jackpotGlow {
          from { text-shadow: 0 0 40px #f0b42940, 0 0 15px #f0b42920; }
          to   { text-shadow: 0 0 80px #f0b42970, 0 0 30px #f0b42950, 0 0 5px #fff5; }
        }
        @keyframes floatParticle {
          from { transform: translateY(0px) scale(1); opacity: 0.08; }
          to   { transform: translateY(-30px) scale(1.3); opacity: 0.18; }
        }
        @keyframes floatPokemon {
          from { transform: translateY(0px); filter: drop-shadow(0 0 6px #f0b42960); }
          to   { transform: translateY(-8px); filter: drop-shadow(0 0 14px #f0b42999); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes winnerSlide {
          from { opacity:0; transform: translateY(-20px) scale(.95); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform: translateY(8px); }
          to   { opacity:1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function StatCard({ icon, label, value, color, glow }) {
  return (
    <div style={{
      background:C.surf, border:`1px solid ${glow ? color + '30' : C.border}`,
      borderRadius:14, padding:'16px 14px', textAlign:'center',
      boxShadow: glow ? `0 0 20px ${color}15` : 'none',
      transition:'all .3s',
    }}>
      <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{icon} {label}</div>
      <div style={{ fontSize:20, fontWeight:900, color, lineHeight:1 }}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</div>
    </div>
  )
}

function DrawCountdown({ large }) {
  const [label,  setLabel]  = useState('')
  const [urgent, setUrgent] = useState(false)
  useEffect(() => {
    function upd() {
      const now   = new Date()
      const frNow = new Date(now.getTime() + 60 * 60 * 1000)
      const target = new Date(frNow)
      target.setHours(20, 0, 0, 0)
      if (frNow >= target) target.setDate(target.getDate() + 1)
      const diff = target - frNow
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
      setUrgent(diff < 3600000)
    }
    upd(); const t = setInterval(upd, 1000); return () => clearInterval(t)
  }, [])
  return (
    <div style={{
      fontSize: large ? 48 : 32,
      fontWeight:900, fontFamily:'monospace', letterSpacing:4,
      color: urgent ? '#ff7070' : C.txt,
      textShadow: urgent ? '0 0 20px #ff000060' : `0 0 20px ${C.txt}20`,
      animation: urgent ? 'pulse-dot 1s ease-in-out infinite' : 'none',
    }}>
      {label}
    </div>
  )
}
