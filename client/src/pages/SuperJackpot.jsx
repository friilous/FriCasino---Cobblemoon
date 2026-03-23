import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

export default function SuperJackpot() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [jackpot,  setJackpot]  = useState(null)
  const [history,  setHistory]  = useState([])
  const [eligible, setEligible] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [pulse,    setPulse]    = useState(false)

  useEffect(() => {
    Promise.all([
      axios.get('/api/superjackpot'),
      axios.get('/api/superjackpot/history'),
      axios.get('/api/superjackpot/eligible'),
    ]).then(([sj, hist, el]) => {
      setJackpot(sj.data.amount)
      setHistory(hist.data || [])
      setEligible(el.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('superjackpot_update', ({ amount }) => {
      setJackpot(amount)
      setPulse(true)
      setTimeout(() => setPulse(false), 800)
    })
    return () => socket.off('superjackpot_update')
  }, [socket])

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Crimson Pro, serif', color: 'rgba(245,230,200,0.3)', fontSize: 15 }}>
      Chargement…
    </div>
  )

  const isEligible = eligible?.eligible === true

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', boxSizing: 'border-box' }}>

      {/* Hero jackpot */}
      <div style={{
        background: 'linear-gradient(160deg, #1A0008, #0F0005)',
        border: `2px solid ${pulse ? 'rgba(196,30,58,0.7)' : 'rgba(196,30,58,0.3)'}`,
        borderRadius: 20, padding: '40px 32px', textAlign: 'center',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
        boxShadow: `0 0 ${pulse ? 60 : 30}px rgba(196,30,58,${pulse ? 0.3 : 0.1})`,
        transition: 'all 0.4s',
      }}>
        {/* Fond */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(196,30,58,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{
          fontSize: 64, marginBottom: 12,
          filter: 'drop-shadow(0 0 30px rgba(196,30,58,0.6))',
          animation: 'float 3s ease-in-out infinite',
          position: 'relative', zIndex: 1,
        }}>
          💎
        </div>

        <div style={{
          fontFamily: 'Cinzel Decorative, serif',
          fontSize: 14, fontWeight: 700,
          color: 'rgba(196,30,58,0.7)',
          letterSpacing: 8, textTransform: 'uppercase',
          marginBottom: 12, position: 'relative', zIndex: 1,
        }}>
          SuperJackpot
        </div>

        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: jackpot?.toString().length > 6 ? 48 : 60,
          fontWeight: 900,
          color: pulse ? '#FF6B7A' : '#E8556A',
          textShadow: `0 0 ${pulse ? 50 : 30}px rgba(232,85,106,0.6)`,
          transition: 'all 0.3s',
          transform: pulse ? 'scale(1.06)' : 'scale(1)',
          position: 'relative', zIndex: 1,
          lineHeight: 1,
        }}>
          {jackpot !== null ? jackpot.toLocaleString('fr-FR') : '…'}
        </div>

        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 14, color: 'rgba(232,85,106,0.5)',
          marginTop: 8, letterSpacing: 4, position: 'relative', zIndex: 1,
        }}>
          JETONS
        </div>
      </div>

      {/* Comment ça marche */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: 'rgba(245,230,200,0.6)', marginBottom: 16, letterSpacing: '0.08em' }}>
            Comment ça marche ?
          </h2>
          {[
            { icon: '🎰', title: 'Joue normalement', desc: 'Chaque mise contribue automatiquement au pot (2-5%).' },
            { icon: '🎟️', title: 'Deviens éligible', desc: 'Mise au moins 500 jetons dans les 24 dernières heures.' },
            { icon: '📅', title: 'Tirage du dimanche', desc: 'Un gagnant aléatoire est tiré chaque dimanche à minuit.' },
            { icon: '💎', title: 'Empoche le jackpot', desc: 'Le gagnant reçoit tout le pot. Minima 30% restent pour le prochain.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: 'rgba(245,230,200,0.7)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.4)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Statut éligibilité */}
        <div style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: 'rgba(245,230,200,0.6)', marginBottom: 16, letterSpacing: '0.08em' }}>
            Ton statut
          </h2>

          <div style={{
            background: isEligible ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
            border: `2px solid ${isEligible ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{isEligible ? '✅' : '⏳'}</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: isEligible ? '#22C55E' : 'rgba(245,230,200,0.5)', marginBottom: 6 }}>
              {isEligible ? 'Tu participes !' : 'Pas encore éligible'}
            </div>
            <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.4)', lineHeight: 1.6 }}>
              {isEligible
                ? 'Tu es dans le tirage de cette semaine. Bonne chance !'
                : 'Mise au moins 500 jetons dans les 24h pour entrer dans le tirage.'}
            </div>
          </div>

          {eligible && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Crimson Pro, serif', fontSize: 13 }}>
                <span style={{ color: 'rgba(245,230,200,0.4)' }}>Participants éligibles</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#F0B429' }}>
                  {eligible.count ?? '?'}
                </span>
              </div>
              {eligible.count >= 10 && (
                <div style={{ padding: '8px 12px', background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 8, fontFamily: 'Crimson Pro, serif', fontSize: 12, color: 'rgba(240,180,41,0.8)' }}>
                  🎉 10+ joueurs éligibles — le jackpot est boosté ×1.5 !
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Crimson Pro, serif', fontSize: 13 }}>
                <span style={{ color: 'rgba(245,230,200,0.4)' }}>Prochain tirage</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#F5E6C8' }}>Dimanche minuit</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historique */}
      {history.length > 0 && (
        <div style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: 'rgba(245,230,200,0.5)', marginBottom: 16, letterSpacing: '0.08em' }}>
            🏆 Derniers gagnants
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Gagnant', 'Gagné', 'Participants', 'Date'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Gagnant' ? 'left' : 'right', fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.1em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: '#FFD700' }}>
                    🏆 {h.winner}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#E8556A' }}>
                    +{parseInt(h.amount_won).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(245,230,200,0.4)' }}>
                    {h.eligible}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(245,230,200,0.25)' }}>
                    {new Date(h.drawn_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0', fontFamily: 'Crimson Pro, serif', color: 'rgba(245,230,200,0.2)', fontSize: 14 }}>
          Aucun tirage pour l'instant — le premier jackpot est en cours d'accumulation !
        </div>
      )}
    </div>
  )
}
