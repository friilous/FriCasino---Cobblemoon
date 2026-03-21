import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'

// ── JackpotBanner ─────────────────────────────────────────────────────────────
// Affiche le jackpot live en bandeau en haut de page
// Mis à jour via socket 'jackpot_update' sans refresh
// Affiche une animation quand quelqu'un gagne

export default function JackpotBanner() {
  const { socket }  = useSocket()
  const [amount, setAmount]   = useState(null)
  const [winner, setWinner]   = useState(null) // { username, amount }
  const [animate, setAnimate] = useState(false)
  const timerRef = useRef(null)

  // Charger le montant initial
  useEffect(() => {
    axios.get('/api/jackpot')
      .then(r => setAmount(r.data.amount))
      .catch(() => {})
  }, [])

  // Écouter les mises à jour live
  useEffect(() => {
    if (!socket) return

    socket.on('jackpot_update', ({ amount: a }) => {
      setAmount(a)
      setAnimate(true)
      setTimeout(() => setAnimate(false), 600)
    })

    socket.on('jackpot_won', ({ winner: w, amount: a, new_pot }) => {
      setWinner({ username: w, amount: a })
      setAmount(new_pot)
      // Effacer l'annonce après 10s
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setWinner(null), 10000)
    })

    return () => {
      socket.off('jackpot_update')
      socket.off('jackpot_won')
    }
  }, [socket])

  if (amount === null) return null

  // Mode annonce victoire
  if (winner) {
    return (
      <div style={{
        background: 'linear-gradient(90deg, #1a1000, #2a1800, #1a1000)',
        borderBottom: '1px solid #f0b42960',
        padding: '8px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        animation: 'jackpotFlash 0.5s ease',
      }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <span style={{ fontSize: 13, color: '#f0b429', fontWeight: 900, letterSpacing: 1 }}>
          {winner.username} vient de remporter le jackpot !
        </span>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', background: '#f0b42920', border: '1px solid #f0b42940', borderRadius: 8, padding: '2px 12px', fontFamily: 'monospace' }}>
          +{winner.amount.toLocaleString()} jetons
        </span>
        <span style={{ fontSize: 18 }}>🏆</span>
        <style>{`@keyframes jackpotFlash{0%{opacity:0;transform:scaleY(.8)}100%{opacity:1;transform:scaleY(1)}}`}</style>
      </div>
    )
  }

  return (
    <Link to="/loterie" style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#0c0c1e',
        borderBottom: '1px solid #1e1e3a',
        padding: '7px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        cursor: 'pointer',
        transition: 'background .2s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#101028'}
        onMouseLeave={e => e.currentTarget.style.background = '#0c0c1e'}
      >
        <span style={{ fontSize: 14 }}>💰</span>
        <span style={{ fontSize: 11, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1 }}>Jackpot</span>
        <span style={{
          fontSize: 15, fontWeight: 900, color: '#f0b429',
          fontFamily: 'monospace', letterSpacing: 1,
          transition: 'transform .3s',
          transform: animate ? 'scale(1.15)' : 'scale(1)',
          display: 'inline-block',
        }}>
          {amount.toLocaleString()} jetons
        </span>
        <span style={{ fontSize: 11, color: '#44446a' }}>· Tirage dans</span>
        <CountdownTimer />
        <span style={{ fontSize: 11, color: '#f0b42980', marginLeft: 4 }}>Cliquer pour jouer →</span>
      </div>
    </Link>
  )
}

// Compte à rebours jusqu'au prochain tirage (jours impairs à 20h FR)
function CountdownTimer() {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function update() {
      const now    = new Date()
      // Prochain tirage : prochain jour impair à 20h UTC+1
      const frNow  = new Date(now.getTime() + 60 * 60 * 1000) // approx UTC+1
      const target = new Date(frNow)
      target.setHours(20, 0, 0, 0)
      // Si on est passé 20h, aller au lendemain
      if (frNow >= target) target.setDate(target.getDate() + 1)
      // Aller au prochain jour impair
      while (target.getDay() % 2 === 0) target.setDate(target.getDate() + 1)

      const diff = target - frNow
      const h    = Math.floor(diff / 3600000)
      const m    = Math.floor((diff % 3600000) / 60000)
      const s    = Math.floor((diff % 60000) / 1000)
      setLabel(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e2f0', fontFamily: 'monospace', background: '#1e1e3a', padding: '2px 10px', borderRadius: 6 }}>
      {label}
    </span>
  )
}
