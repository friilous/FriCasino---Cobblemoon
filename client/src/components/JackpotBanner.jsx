import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

export default function JackpotBanner() {
  const { socket }       = useSocket()
  const { user }         = useAuth()
  const [amount, setAmount]         = useState(null)
  const [eligible, setEligible]     = useState(0)
  const [myStatus, setMyStatus]     = useState(null)   // { eligible, bet_today, threshold }
  const [winner, setWinner]         = useState(null)
  const [noWinner, setNoWinner]     = useState(false)
  const [animate, setAnimate]       = useState(false)
  const timerRef = useRef(null)

  // Chargement initial
  useEffect(() => {
    axios.get('/api/superjackpot')
      .then(r => { setAmount(r.data.amount); setEligible(r.data.eligible_count) })
      .catch(() => {})
  }, [])

  // Statut personnel
  useEffect(() => {
    if (!user) return
    axios.get('/api/superjackpot/mystatus')
      .then(r => setMyStatus(r.data))
      .catch(() => {})
  }, [user])

  // Sockets live
  useEffect(() => {
    if (!socket) return

    socket.on('superjackpot_update', ({ amount: a }) => {
      setAmount(a)
      setAnimate(true)
      setTimeout(() => setAnimate(false), 600)
    })

    socket.on('superjackpot_won', ({ winner: w, amount: a, new_pot, eligible: e }) => {
      setWinner({ username: w, amount: a, eligible: e })
      setAmount(new_pot)
      setEligible(0)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setWinner(null), 12000)
    })

    socket.on('superjackpot_no_winner', ({ pot }) => {
      setNoWinner(true)
      setAmount(pot)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setNoWinner(false), 8000)
    })

    // Mise à jour du nb éligibles en temps réel
    socket.on('live_feed', () => {
      axios.get('/api/superjackpot')
        .then(r => setEligible(r.data.eligible_count))
        .catch(() => {})
      if (user) {
        axios.get('/api/superjackpot/mystatus')
          .then(r => setMyStatus(r.data))
          .catch(() => {})
      }
    })

    return () => {
      socket.off('superjackpot_update')
      socket.off('superjackpot_won')
      socket.off('superjackpot_no_winner')
      socket.off('live_feed')
    }
  }, [socket, user])

  if (amount === null) return null

  // ── Annonce victoire ──────────────────────────────────────────────────────
  if (winner) {
    return (
      <div style={{
        background: 'linear-gradient(90deg, #0d0800, #1e1000, #0d0800)',
        borderBottom: '2px solid #f0b42970',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        animation: 'sjFlash 0.4s ease',
      }}>
        <span style={{ fontSize: 20 }}>💎</span>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 14, color: '#f0b429', fontWeight: 900, letterSpacing: 1 }}>
            🏆 {winner.username} remporte le SuperJackpot !
          </span>
          <span style={{ fontSize: 11, color: '#888', marginLeft: 10 }}>
            parmi {winner.eligible} joueur{winner.eligible > 1 ? 's' : ''} éligible{winner.eligible > 1 ? 's' : ''}
          </span>
        </div>
        <span style={{
          fontSize: 16, fontWeight: 900, color: '#fff',
          background: '#f0b42922', border: '1px solid #f0b42950',
          borderRadius: 8, padding: '3px 14px', fontFamily: 'monospace',
        }}>
          +{winner.amount.toLocaleString()} jetons
        </span>
        <span style={{ fontSize: 20 }}>💎</span>
        <style>{`@keyframes sjFlash{0%{opacity:0;transform:scaleY(.85)}100%{opacity:1;transform:scaleY(1)}}`}</style>
      </div>
    )
  }

  // ── Aucun gagnant ce soir ─────────────────────────────────────────────────
  if (noWinner) {
    return (
      <div style={{
        background: '#0c0c1e', borderBottom: '1px solid #2a2a50',
        padding: '8px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 13 }}>😔</span>
        <span style={{ fontSize: 12, color: '#7070a0' }}>
          Aucun joueur éligible ce soir — la cagnotte est reportée à demain !
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#f0b429', fontFamily: 'monospace' }}>
          {amount.toLocaleString()} jetons
        </span>
      </div>
    )
  }

  // ── Bandeau normal ────────────────────────────────────────────────────────
  return (
    <Link to="/superjackpot" style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#0a0a1e',
        borderBottom: '1px solid #1e1e3a',
        padding: '7px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', transition: 'background .2s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#0f0f28'}
        onMouseLeave={e => e.currentTarget.style.background = '#0a0a1e'}
      >
        {/* Icône + label */}
        <span style={{ fontSize: 15 }}>💎</span>
        <span style={{ fontSize: 10, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1.5, flexShrink: 0 }}>
          SuperJackpot
        </span>

        {/* Montant */}
        <span style={{
          fontSize: 16, fontWeight: 900, color: '#f0b429',
          fontFamily: 'monospace', letterSpacing: 1,
          transition: 'transform .3s',
          transform: animate ? 'scale(1.15)' : 'scale(1)',
          display: 'inline-block',
        }}>
          {amount.toLocaleString()}
          <span style={{ fontSize: 10, color: '#888', fontWeight: 400, marginLeft: 4 }}>jetons</span>
        </span>

        {/* Séparateur */}
        <span style={{ color: '#2a2a4a', fontSize: 14 }}>|</span>

        {/* Éligibles */}
        <span style={{ fontSize: 11, color: '#5a5a8a', flexShrink: 0 }}>
          <span style={{ color: eligible > 0 ? '#40f080' : '#5a5a8a', fontWeight: 700 }}>{eligible}</span>
          {' '}joueur{eligible !== 1 ? 's' : ''} éligible{eligible !== 1 ? 's' : ''}
        </span>

        {/* Statut perso */}
        {myStatus && (
          <>
            <span style={{ color: '#2a2a4a', fontSize: 14 }}>|</span>
            {myStatus.eligible ? (
              <span style={{ fontSize: 11, color: '#40f080', fontWeight: 700, flexShrink: 0 }}>
                ✅ Tu es dans le tirage !
              </span>
            ) : (
              <span style={{ fontSize: 11, color: '#5a5a8a', flexShrink: 0 }}>
                Mise encore{' '}
                <span style={{ color: '#f0b429', fontWeight: 700 }}>
                  {Math.max(0, myStatus.threshold - myStatus.bet_today).toLocaleString()}
                </span>
                {' '}jetons pour être éligible
              </span>
            )}
          </>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Countdown */}
        <span style={{ fontSize: 10, color: '#44446a', flexShrink: 0 }}>Tirage dans</span>
        <CountdownTimer />
        <span style={{ fontSize: 10, color: '#f0b42980', flexShrink: 0 }}>→</span>
      </div>
    </Link>
  )
}

// Compte à rebours jusqu'à 20h FR chaque jour
function CountdownTimer() {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function update() {
      const now    = new Date()
      const frNow  = new Date(now.getTime() + 60 * 60 * 1000) // UTC+1
      const target = new Date(frNow)
      target.setHours(20, 0, 0, 0)
      if (frNow >= target) target.setDate(target.getDate() + 1)

      const diff = target - frNow
      const h    = Math.floor(diff / 3600000)
      const m    = Math.floor((diff % 3600000) / 60000)
      const s    = Math.floor((diff % 60000) / 1000)
      setLabel(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      setUrgent(diff < 3600000) // < 1h → rouge
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <span style={{
      fontSize: 13, fontWeight: 800,
      color: urgent ? '#ff6060' : '#e2e2f0',
      fontFamily: 'monospace',
      background: urgent ? '#ff000015' : '#1e1e3a',
      border: `1px solid ${urgent ? '#ff606040' : 'transparent'}`,
      padding: '2px 10px', borderRadius: 6,
      animation: urgent ? 'pulse-dot 1s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}
