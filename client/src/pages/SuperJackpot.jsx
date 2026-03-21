import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

const C = {
  bg: '#06060f', surf: '#0c0c1e', border: '#1e1e3a',
  gold: '#f0b429', green: '#22c55e', red: '#ef4444',
  txt: '#e2e2f0', muted: '#44446a', dim: '#12121f',
  purple: '#a855f7',
}

export default function SuperJackpot() {
  const { user }   = useAuth()
  const { socket } = useSocket()

  const [data,    setData]    = useState(null)   // { amount, eligible_count, threshold }
  const [history, setHistory] = useState([])
  const [myStatus,setMyStatus]= useState(null)   // { eligible, bet_today, threshold }
  const [winner,  setWinner]  = useState(null)
  const [loading, setLoading] = useState(true)

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
    try {
      const r = await axios.get('/api/superjackpot/mystatus')
      setMyStatus(r.data)
    } catch {}
  }

  useEffect(() => { load(); loadMyStatus() }, [user])

  // Sockets
  useEffect(() => {
    if (!socket) return
    socket.on('superjackpot_update', ({ amount }) => {
      setData(d => d ? { ...d, amount } : d)
    })
    socket.on('superjackpot_won', ({ winner: w, amount, new_pot, eligible }) => {
      setWinner({ username: w, amount, eligible })
      setData(d => d ? { ...d, amount: new_pot, eligible_count: 0 } : d)
      load()
    })
    socket.on('live_feed', () => {
      axios.get('/api/superjackpot').then(r => setData(r.data)).catch(() => {})
      loadMyStatus()
    })
    return () => {
      socket.off('superjackpot_update')
      socket.off('superjackpot_won')
      socket.off('live_feed')
    }
  }, [socket, user])

  const pot          = data?.amount ?? 0
  const eligibleCount = data?.eligible_count ?? 0
  const threshold    = data?.threshold ?? 5000
  const prize        = Math.floor(pot * 0.8)
  const betProgress  = myStatus ? Math.min((myStatus.bet_today / threshold) * 100, 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 28px', boxSizing: 'border-box' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link to="/casino" style={{ fontSize: 11, color: C.muted, textDecoration: 'none' }}>← Accueil</Link>
        <span style={{ color: C.dim }}>/</span>
        <span style={{ fontSize: 11, color: '#9898b8' }}>💎 SuperJackpot</span>
      </div>

      {/* Annonce victoire */}
      {winner && (
        <div style={{
          background: `${C.gold}10`, border: `1px solid ${C.gold}40`,
          borderRadius: 16, padding: '18px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 32 }}>🏆</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: C.gold }}>
              {winner.username} remporte le SuperJackpot !
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
              {winner.amount.toLocaleString()} jetons remportés · parmi {winner.eligible} joueur{winner.eligible > 1 ? 's' : ''} éligible{winner.eligible > 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={() => setWinner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Colonne principale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Cagnotte hero */}
          <div style={{
            background: C.surf, border: `1px solid ${C.border}`,
            borderRadius: 20, padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            {/* Barre déco top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${C.gold}, ${C.purple}, ${C.gold}, transparent)` }} />

            <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 10 }}>
              💎 Cagnotte SuperJackpot
            </div>
            <div style={{
              fontSize: 62, fontWeight: 900, color: C.gold,
              fontFamily: 'monospace', lineHeight: 1,
              textShadow: `0 0 40px ${C.gold}60`,
            }}>
              {pot.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
              jetons · le gagnant reçoit{' '}
              <span style={{ color: C.green, fontWeight: 800 }}>{prize.toLocaleString()} jetons</span>
              {' '}(80%)
            </div>

            {/* Countdown prominent */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Tirage ce soir dans</div>
              <DrawCountdown large />
            </div>
          </div>

          {/* Stats live */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatCard
              icon="👥" label="Joueurs éligibles"
              value={eligibleCount}
              color={eligibleCount > 0 ? C.green : C.muted}
              sub="ce soir"
            />
            <StatCard
              icon="🎯" label="Seuil d'éligibilité"
              value={`${threshold.toLocaleString()} j.`}
              color={C.gold}
              sub="à miser en 24h"
            />
            <StatCard
              icon="📈" label="Seed minimum"
              value="5 000 j."
              color={C.purple}
              sub="garanti chaque soir"
            />
          </div>

          {/* Statut personnel */}
          {user && myStatus && (
            <div style={{
              background: C.surf, border: `1px solid ${myStatus.eligible ? C.green + '40' : C.border}`,
              borderRadius: 14, padding: '18px 20px',
              boxShadow: myStatus.eligible ? `0 0 20px ${C.green}15` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>
                  🎮 Mon éligibilité aujourd'hui
                </span>
                {myStatus.eligible ? (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: C.green,
                    background: `${C.green}15`, border: `1px solid ${C.green}30`,
                    borderRadius: 20, padding: '3px 12px',
                  }}>
                    ✅ ÉLIGIBLE — Tu es dans le tirage ce soir !
                  </span>
                ) : (
                  <span style={{
                    fontSize: 11, color: C.muted,
                    background: `${C.muted}10`, border: `1px solid ${C.muted}20`,
                    borderRadius: 20, padding: '3px 12px',
                  }}>
                    Pas encore éligible
                  </span>
                )}
              </div>

              {/* Barre de progression */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 6 }}>
                  <span>Misé aujourd'hui : <span style={{ color: C.txt, fontWeight: 700 }}>{myStatus.bet_today.toLocaleString()} jetons</span></span>
                  <span>Objectif : <span style={{ color: C.gold, fontWeight: 700 }}>{threshold.toLocaleString()} jetons</span></span>
                </div>
                <div style={{ height: 8, background: C.dim, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${betProgress}%`,
                    background: myStatus.eligible
                      ? `linear-gradient(90deg, ${C.green}, #4ade80)`
                      : `linear-gradient(90deg, ${C.gold}, #fbbf24)`,
                    transition: 'width .5s ease',
                    boxShadow: myStatus.eligible ? `0 0 8px ${C.green}80` : `0 0 8px ${C.gold}60`,
                  }} />
                </div>
              </div>

              {!myStatus.eligible && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  Il te reste{' '}
                  <span style={{ color: C.gold, fontWeight: 800 }}>
                    {Math.max(0, threshold - myStatus.bet_today).toLocaleString()} jetons
                  </span>
                  {' '}à miser pour être éligible ce soir — go jouer ! 🎰
                </div>
              )}
            </div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                🏆 Derniers gagnants
              </div>
              {history.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: i < history.length - 1 ? `1px solid ${C.dim}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `${C.gold}15`, border: `1px solid ${C.gold}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: C.gold, fontWeight: 800,
                    }}>
                      {h.winner.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>{h.winner}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                        {h.eligible} joueur{h.eligible > 1 ? 's' : ''} en lice · {new Date(h.drawn_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: C.green }}>
                      +{h.amount_won.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>jetons</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Comment ça marche */}
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
              Comment ça marche
            </div>
            {[
              { icon: '🎰', color: C.gold,   title: '5% de chaque mise',         desc: 'Chaque mise sur n\'importe quel jeu contribue automatiquement à la cagnotte.' },
              { icon: '🎯', color: C.green,  title: 'Mise 5 000 jetons en 24h',  desc: 'Pour être éligible au tirage du soir, il faut avoir misé 5 000 jetons dans la journée.' },
              { icon: '🎲', color: C.purple, title: 'Tirage aléatoire pur',       desc: 'Chaque joueur éligible a exactement la même chance. 1 joueur = 1 chance.' },
              { icon: '⏰', color: '#60a5fa', title: 'Tous les soirs à 20h',      desc: 'Le tirage a lieu chaque soir à 20h heure française. Sois dans les parages !' },
              { icon: '💰', color: C.green,  title: '80% pour le gagnant',        desc: '20% reste en seed pour garantir une cagnotte minimum le lendemain.' },
            ].map(({ icon, color, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.dim}` }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color }}>{title}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div style={{
            background: C.surf, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: 18, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Prochain tirage dans</div>
            <DrawCountdown />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>Tous les jours à 20h00 (FR)</div>
          </div>

          {/* CTA si pas éligible */}
          {user && myStatus && !myStatus.eligible && (
            <Link to="/machines" style={{ textDecoration: 'none' }}>
              <div style={{
                background: `linear-gradient(135deg, ${C.gold}20, ${C.purple}15)`,
                border: `1px solid ${C.gold}30`,
                borderRadius: 14, padding: 16, textAlign: 'center',
                cursor: 'pointer', transition: 'all .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.gold + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.gold + '30'}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>🎰</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 4 }}>
                  Devenir éligible ce soir
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  Mise encore{' '}
                  <span style={{ color: C.txt, fontWeight: 700 }}>
                    {Math.max(0, (myStatus.threshold ?? 5000) - myStatus.bet_today).toLocaleString()} jetons
                  </span>
                  {' '}sur les machines →
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: C.surf, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{sub}</div>
    </div>
  )
}

function DrawCountdown({ large }) {
  const [label, setLabel]   = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function update() {
      const now   = new Date()
      const frNow = new Date(now.getTime() + 60 * 60 * 1000)
      const target = new Date(frNow)
      target.setHours(20, 0, 0, 0)
      if (frNow >= target) target.setDate(target.getDate() + 1)

      const diff = target - frNow
      const h    = Math.floor(diff / 3600000)
      const m    = Math.floor((diff % 3600000) / 60000)
      const s    = Math.floor((diff % 60000) / 1000)
      setLabel(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      setUrgent(diff < 3600000)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      fontSize: large ? 42 : 28,
      fontWeight: 900,
      color: urgent ? '#ff6060' : C.txt,
      fontFamily: 'monospace',
      letterSpacing: 4,
      animation: urgent ? 'pulse-dot 1s ease-in-out infinite' : 'none',
    }}>
      {label}
    </div>
  )
}
