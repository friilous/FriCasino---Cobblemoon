import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }   = useAuth()
  const navigate    = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/login', { username, password })
      login(data.token, data.user)
      navigate(data.user.is_temp_pw ? '/changer-mot-de-passe' : '/casino')
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(196,30,58,0.07) 0%, transparent 50%), #0C0608',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      fontFamily: 'Crimson Pro, serif',
    }}>

      {/* Effet lumière de fond */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(240,180,41,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16, filter: 'drop-shadow(0 0 30px rgba(240,180,41,0.4))' }}>🎰</div>
          <h1 style={{
            fontFamily: 'Cinzel Decorative, serif',
            fontSize: 28, fontWeight: 900,
            color: '#FFD700',
            textShadow: '0 0 40px rgba(255,215,0,0.4)',
            letterSpacing: 3,
            marginBottom: 6,
          }}>
            CobbleMoon
          </h1>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 12, color: 'rgba(240,180,41,0.4)',
            letterSpacing: 8, textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Casino
          </div>
          <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.3)', letterSpacing: 1 }}>
            by Frilous · Serveur Cobblemon
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(160deg, #1E1015, #150D10)',
          border: '1px solid rgba(240,180,41,0.2)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ligne déco top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(240,180,41,0.5), transparent)',
          }} />

          <h2 style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 16, fontWeight: 700,
            color: 'rgba(245,230,200,0.7)',
            marginBottom: 28, textAlign: 'center', letterSpacing: 1,
          }}>
            Connexion
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontFamily: 'Cinzel, serif',
                fontSize: 10, color: 'rgba(240,180,41,0.5)',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Pseudo Minecraft
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="TonPseudo"
                required autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(240,180,41,0.15)',
                  borderRadius: 10, padding: '12px 16px',
                  color: '#F5E6C8',
                  fontFamily: 'Crimson Pro, serif', fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(240,180,41,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(240,180,41,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(240,180,41,0.15)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontFamily: 'Cinzel, serif',
                fontSize: 10, color: 'rgba(240,180,41,0.5)',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(240,180,41,0.15)',
                  borderRadius: 10, padding: '12px 16px',
                  color: '#F5E6C8',
                  fontFamily: 'Crimson Pro, serif', fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(240,180,41,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(240,180,41,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(240,180,41,0.15)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(196,30,58,0.1)',
                border: '1px solid rgba(196,30,58,0.3)',
                borderRadius: 10, padding: '10px 16px',
                fontFamily: 'Crimson Pro, serif', fontSize: 14,
                color: '#E8556A', marginBottom: 20,
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading
                  ? 'rgba(240,180,41,0.2)'
                  : 'linear-gradient(135deg, #FFD700, #F0B429, #D4890A)',
                color: loading ? 'rgba(240,180,41,0.4)' : '#1A0A00',
                fontFamily: 'Cinzel, serif', fontWeight: 700,
                fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '14px',
                borderRadius: 10, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(240,180,41,0.4)',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => e.currentTarget.style.transform = 'none' }
            >
              {loading ? 'Connexion en cours…' : 'Entrer dans le Casino →'}
            </button>
          </form>

          <p style={{
            textAlign: 'center', fontFamily: 'Crimson Pro, serif',
            fontSize: 13, color: 'rgba(245,230,200,0.25)',
            marginTop: 20,
          }}>
            Pas encore de compte ? Contacte Frilous sur Discord.
          </p>
        </div>

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center', fontFamily: 'Crimson Pro, serif',
          fontSize: 11, color: 'rgba(245,230,200,0.15)',
          marginTop: 20, lineHeight: 1.6,
        }}>
          ⚠ Projet indépendant — aucun lien avec le staff CobbleMoon.<br />
          Aucun argent réel. Jetons = Pokédollars in-game.
        </p>
      </div>
    </div>
  )
}
