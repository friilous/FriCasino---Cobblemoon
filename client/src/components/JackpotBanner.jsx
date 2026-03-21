import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

export default function JackpotBanner() {
  const { socket }   = useSocket()
  const { user }     = useAuth()
  const [amount,     setAmount]     = useState(null)
  const [eligible,   setEligible]   = useState(0)
  const [myStatus,   setMyStatus]   = useState(null)
  const [winner,     setWinner]     = useState(null)
  const [noWinner,   setNoWinner]   = useState(false)
  const [pulse,      setPulse]      = useState(false)
  const timerRef = useRef(null)

  // Chargement initial + polling toutes les 30s (secours si socket silencieux)
  useEffect(() => {
    function fetchJackpot() {
      axios.get('/api/superjackpot')
        .then(r => { setAmount(r.data.amount); setEligible(r.data.eligible_count) })
        .catch(() => {})
    }
    fetchJackpot()
    const t = setInterval(fetchJackpot, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!user) return
    axios.get('/api/superjackpot/mystatus').then(r => setMyStatus(r.data)).catch(() => {})
    // Polling mystatus toutes les 30s pour tenir à jour la progression
    const t = setInterval(() => {
      axios.get('/api/superjackpot/mystatus').then(r => setMyStatus(r.data)).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [user])

  useEffect(() => {
    if (!socket) return
    // Re-fetch immédiatement à chaque reconnexion socket
    socket.on('connect', () => {
      axios.get('/api/superjackpot')
        .then(r => { setAmount(r.data.amount); setEligible(r.data.eligible_count) })
        .catch(() => {})
    })
    socket.on('superjackpot_update', ({ amount: a }) => {
      setAmount(a); setPulse(true); setTimeout(() => setPulse(false), 700)
    })
    socket.on('superjackpot_won', ({ winner: w, amount: a, new_pot, eligible: e }) => {
      setWinner({ username: w, amount: a, eligible: e })
      setAmount(new_pot); setEligible(0)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setWinner(null), 12000)
    })
    socket.on('superjackpot_no_winner', () => {
      setNoWinner(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setNoWinner(false), 8000)
    })
    socket.on('live_feed', () => {
      axios.get('/api/superjackpot').then(r => { setAmount(r.data.amount); setEligible(r.data.eligible_count) }).catch(() => {})
      if (user) axios.get('/api/superjackpot/mystatus').then(r => setMyStatus(r.data)).catch(() => {})
    })
    // Refresh mystatus à chaque mise du joueur (balance_update = émis après chaque jeu)
    socket.on('balance_update', () => {
      if (user) axios.get('/api/superjackpot/mystatus').then(r => setMyStatus(r.data)).catch(() => {})
    })
    return () => { socket.off('connect'); socket.off('superjackpot_update'); socket.off('superjackpot_won'); socket.off('superjackpot_no_winner'); socket.off('live_feed'); socket.off('balance_update') }
  }, [socket, user])

  if (amount === null) return null

  // ── Annonce victoire ──────────────────────────────────────────────────────
  if (winner) {
    return (
      <div style={{
        background:'linear-gradient(90deg,#100800,#1e1200,#100800)',
        borderBottom:'2px solid #f0b42980',
        padding:'10px 24px',
        display:'flex', alignItems:'center', justifyContent:'center', gap:16,
        animation:'bannerSlide .4s ease',
      }}>
        <span style={{ fontSize:22 }}>🏆</span>
        <div style={{ textAlign:'center' }}>
          <span style={{ fontSize:15, color:'#f0b429', fontWeight:900, letterSpacing:0.5 }}>
            {winner.username} remporte le SuperJackpot !
          </span>
          <span style={{ fontSize:11, color:'#666', marginLeft:10 }}>
            ({winner.eligible} joueur{winner.eligible > 1 ? 's' : ''} en lice)
          </span>
        </div>
        <div style={{ fontSize:17, fontWeight:900, color:'#fff', background:'#f0b42920', border:'1px solid #f0b42950', borderRadius:10, padding:'4px 16px', fontFamily:'monospace' }}>
          +{winner.amount.toLocaleString('fr-FR')} jetons
        </div>
        <span style={{ fontSize:22 }}>🏆</span>
        <style>{`@keyframes bannerSlide{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    )
  }

  // ── Aucun gagnant ─────────────────────────────────────────────────────────
  if (noWinner) {
    return (
      <div style={{ background:'#0c0c1e', borderBottom:'1px solid #2a2a50', padding:'8px 24px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <span>😔</span>
        <span style={{ fontSize:12, color:'#7070a0' }}>Aucun joueur éligible ce soir — la cagnotte est reportée !</span>
        <span style={{ fontSize:13, fontWeight:800, color:'#f0b429', fontFamily:'monospace' }}>{amount.toLocaleString('fr-FR')} jetons</span>
      </div>
    )
  }

  // ── Bandeau normal — centré et attrayant ──────────────────────────────────
  return (
    <Link to="/superjackpot" style={{ textDecoration:'none' }}>
      <div
        style={{
          background:'linear-gradient(90deg, #08081a, #0d0d22, #08081a)',
          borderBottom:'1px solid #2a2a4a',
          padding:'9px 24px',
          display:'flex', alignItems:'center', justifyContent:'center', gap:18,
          cursor:'pointer', transition:'background .2s',
          position:'relative', overflow:'hidden',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(90deg,#0c0c22,#111130,#0c0c22)'}
        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(90deg,#08081a,#0d0d22,#08081a)'}
      >
        {/* Reflet haut */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,#f0b42930,transparent)', pointerEvents:'none' }} />

        {/* Icône + titre */}
        <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          <span style={{ fontSize:17 }}>💎</span>
          <span style={{ fontSize:11, color:'#8080b0', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>SuperJackpot</span>
        </div>

        {/* Séparateur */}
        <div style={{ width:1, height:22, background:'#2a2a4a', flexShrink:0 }} />

        {/* Montant — pièce maîtresse */}
        <div style={{ display:'flex', alignItems:'baseline', gap:5, flexShrink:0 }}>
          <span style={{
            fontSize:20, fontWeight:900, color:'#f0b429', fontFamily:'monospace',
            transition:'transform .3s, color .3s',
            transform: pulse ? 'scale(1.18)' : 'scale(1)',
            display:'inline-block',
            textShadow: pulse ? '0 0 20px #f0b42990' : 'none',
          }}>
            {amount.toLocaleString('fr-FR')}
          </span>
          <span style={{ fontSize:11, color:'#6060a0' }}>jetons</span>
        </div>

        {/* Séparateur */}
        <div style={{ width:1, height:22, background:'#2a2a4a', flexShrink:0 }} />

        {/* Joueurs éligibles */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background: eligible > 0 ? '#22c55e' : '#44446a', boxShadow: eligible > 0 ? '0 0 6px #22c55e' : 'none', animation: eligible > 0 ? 'pulse-dot 1.4s ease-in-out infinite' : 'none' }} />
          <span style={{ fontSize:11, color:'#6060a0' }}>
            <span style={{ color: eligible > 0 ? '#22c55e' : '#6060a0', fontWeight:700 }}>{eligible}</span>
            {' '}joueur{eligible !== 1 ? 's' : ''} éligible{eligible !== 1 ? 's' : ''} ce soir
          </span>
        </div>

        {/* Séparateur */}
        <div style={{ width:1, height:22, background:'#2a2a4a', flexShrink:0 }} />

        {/* Statut personnel */}
        {myStatus ? (
          myStatus.eligible ? (
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <span style={{ fontSize:13 }}>✅</span>
              <span style={{ fontSize:11, color:'#22c55e', fontWeight:700 }}>Tu es dans le tirage !</span>
            </div>
          ) : (
            <div style={{ fontSize:11, color:'#5a5a8a', flexShrink:0 }}>
              Encore <span style={{ color:'#f0b429', fontWeight:700 }}>{Math.max(0, myStatus.threshold - myStatus.bet_today).toLocaleString('fr-FR')}</span> jetons à miser pour participer
            </div>
          )
        ) : (
          <div style={{ fontSize:11, color:'#5a5a8a', flexShrink:0 }}>
            Mise 5 000 jetons aujourd'hui pour participer
          </div>
        )}

        {/* Séparateur */}
        <div style={{ width:1, height:22, background:'#2a2a4a', flexShrink:0 }} />

        {/* Countdown */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:10, color:'#44446a' }}>Tirage dans</span>
          <CountdownTimer />
        </div>
      </div>
    </Link>
  )
}

function CountdownTimer() {
  const [label,  setLabel]  = useState('')
  const [urgent, setUrgent] = useState(false)
  useEffect(() => {
    function upd() {
      const now    = new Date()
      const target = new Date()
      target.setHours(20, 0, 0, 0)
      // Si 20h est déjà passé aujourd'hui, viser demain 20h
      if (now >= target) target.setDate(target.getDate() + 1)

      const diff = target - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
      setUrgent(diff < 3600000)
    }
    upd(); const t = setInterval(upd, 1000); return () => clearInterval(t)
  }, [])
  return (
    <span style={{
      fontSize:13, fontWeight:800, fontFamily:'monospace',
      color: urgent ? '#ff7070' : '#e2e2f0',
      background: urgent ? '#ff000018' : '#1a1a35',
      border:`1px solid ${urgent ? '#ff606040' : '#2a2a4a'}`,
      padding:'2px 10px', borderRadius:6,
      animation: urgent ? 'pulse-dot 1s ease-in-out infinite' : 'none',
    }}>
      {label}
    </span>
  )
}