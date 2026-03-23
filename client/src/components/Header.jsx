import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { getRankFromWagered } from '../utils/ranks'

export default function Header() {
  const { user, logout } = useAuth()
  const { socket, lastBet } = useSocket()
  const navigate = useNavigate()

  const [jackpot,     setJackpot]     = useState(null)
  const [pulse,       setPulse]       = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [jackpotPulse,setJackpotPulse]= useState(false)
  const menuRef = useRef(null)

  const rank = user?.total_wagered !== undefined
    ? getRankFromWagered(user.total_wagered)
    : null

  useEffect(() => {
    axios.get('/api/superjackpot').then(r => setJackpot(r.data.amount)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('superjackpot_update', ({ amount }) => {
      setJackpot(amount)
      setJackpotPulse(true)
      setTimeout(() => setJackpotPulse(false), 800)
    })
    return () => socket.off('superjackpot_update')
  }, [socket])

  useEffect(() => {
    setPulse(true)
    setTimeout(() => setPulse(false), 600)
  }, [user?.balance])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: 60,
      background: 'linear-gradient(90deg, #0C0608, #180E12, #0C0608)',
      borderBottom: '1px solid rgba(240,180,41,0.2)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      boxShadow: '0 4px 30px rgba(0,0,0,0.6)',
    }}>
      {/* Logo */}
      <Link to="/casino" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 22 }}>🎰</div>
        <div>
          <div style={{
            fontFamily: 'Cinzel Decorative, serif',
            fontSize: 13, fontWeight: 900,
            color: '#FFD700',
            textShadow: '0 0 20px rgba(255,215,0,0.4)',
            letterSpacing: 1,
          }}>
            CobbleMoon
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(240,180,41,0.5)', letterSpacing: 3 }}>
            CASINO
          </div>
        </div>
      </Link>

      <div style={{ width: 1, height: 30, background: 'rgba(240,180,41,0.15)', flexShrink: 0 }} />

      {/* Solde */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          background: 'rgba(240,180,41,0.08)',
          border: `1px solid ${pulse ? 'rgba(240,180,41,0.5)' : 'rgba(240,180,41,0.2)'}`,
          borderRadius: 10, padding: '6px 14px',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          boxShadow: pulse ? '0 0 16px rgba(240,180,41,0.25)' : 'none',
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(240,180,41,0.5)', letterSpacing: 2, marginBottom: 1 }}>
            SOLDE
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 15, fontWeight: 700,
            color: '#F0B429',
            transition: 'transform 0.2s',
          }}>
            {(user?.balance || 0).toLocaleString('fr-FR')}
            <span style={{ fontSize: 10, color: 'rgba(240,180,41,0.5)', marginLeft: 4 }}>✦</span>
          </div>
        </div>
      </div>

      {/* SuperJackpot */}
      {jackpot !== null && (
        <Link to="/superjackpot" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            background: 'rgba(196,30,58,0.1)',
            border: `1px solid ${jackpotPulse ? 'rgba(196,30,58,0.6)' : 'rgba(196,30,58,0.3)'}`,
            borderRadius: 10, padding: '6px 14px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: jackpotPulse ? '0 0 20px rgba(196,30,58,0.3)' : 'none',
          }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(196,30,58,0.7)', letterSpacing: 2, marginBottom: 1 }}>
              SUPERJACKPOT
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15, fontWeight: 700,
              color: jackpotPulse ? '#FF6B7A' : '#E8556A',
              transition: 'transform 0.3s, color 0.3s',
              transform: jackpotPulse ? 'scale(1.1)' : 'scale(1)',
            }}>
              💎 {jackpot.toLocaleString('fr-FR')}
            </div>
          </div>
        </Link>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Rang */}
      {rank && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{rank.icon}</span>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: rank.color, fontWeight: 700 }}>
              {rank.name}
            </div>
          </div>
        </div>
      )}

      <div style={{ width: 1, height: 30, background: 'rgba(240,180,41,0.15)', flexShrink: 0 }} />

      {/* Avatar + Menu */}
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: menuOpen ? 'rgba(240,180,41,0.1)' : 'transparent',
            border: `1px solid ${menuOpen ? 'rgba(240,180,41,0.3)' : 'transparent'}`,
            borderRadius: 10, padding: '6px 12px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(240,180,41,0.3), rgba(196,30,58,0.3))',
            border: '1px solid rgba(240,180,41,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700, color: '#F0B429',
          }}>
            {user.username?.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#F5E6C8' }}>
            {user.username}
          </span>
          <span style={{ color: 'rgba(240,180,41,0.4)', fontSize: 10 }}>{menuOpen ? '▲' : '▼'}</span>
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: '#1E1015',
            border: '1px solid rgba(240,180,41,0.2)',
            borderRadius: 12, padding: 8,
            minWidth: 180,
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            animation: 'slideInUp 0.2s ease forwards',
            zIndex: 200,
          }}>
            <MenuLink to="/profil" icon="👤" label="Mon Profil" onClick={() => setMenuOpen(false)} />
            <MenuLink to="/classement" icon="🏆" label="Classement" onClick={() => setMenuOpen(false)} />
            <MenuLink to="/roue-du-jour" icon="🎁" label="Bonus du Jour" onClick={() => setMenuOpen(false)} />
            {user.is_admin && (
              <MenuLink to="/admin" icon="⚙️" label="Panel Admin" onClick={() => setMenuOpen(false)} />
            )}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(240,180,41,0.1)', margin: '6px 0' }} />
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: 'transparent', border: 'none',
                color: '#E8556A', cursor: 'pointer',
                fontFamily: 'Cinzel, serif', fontSize: 12,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,30,58,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>🚪</span> Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

function MenuLink({ to, icon, label, onClick }) {
  return (
    <Link to={to} onClick={onClick} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8,
          fontFamily: 'Cinzel, serif', fontSize: 12,
          color: '#F5E6C8', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,180,41,0.08)'; e.currentTarget.style.color = '#F0B429' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F5E6C8' }}
      >
        <span>{icon}</span> {label}
      </div>
    </Link>
  )
}
