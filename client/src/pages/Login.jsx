import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }    = useAuth()
  const navigate     = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/login', { username, password })
      login(data.token, data.user)
      navigate(data.user.is_temp_pw ? '/changer-mot-de-passe' : '/casino')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07071a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎰</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: '#f0c040',
            letterSpacing: 3, textTransform: 'uppercase', margin: 0,
            textShadow: '0 0 30px rgba(240,192,64,0.4)',
          }}>
            Fri'Casino
          </h1>
          <p style={{ fontSize: 11, color: '#44446a', marginTop: 6, letterSpacing: 1 }}>
            by Frilous · Cobblemon
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0a0a20',
          border: '1px solid rgba(240,192,64,0.25)',
          borderRadius: 14,
          padding: '28px 24px',
          boxShadow: '0 0 40px rgba(240,192,64,0.06)',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#9898b8', marginBottom: 20, margin: '0 0 20px' }}>
            Connexion
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#5a5a8a', marginBottom: 6 }}>
                Pseudo Minecraft
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="TonPseudo"
                required
                autoFocus
                style={{
                  width: '100%', background: '#07071a',
                  border: '1px solid #2a2a4a', borderRadius: 8,
                  padding: '10px 14px', color: '#d8d8f0',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#f0c040'}
                onBlur={e => e.target.style.borderColor = '#2a2a4a'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#5a5a8a', marginBottom: 6 }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', background: '#07071a',
                  border: '1px solid #2a2a4a', borderRadius: 8,
                  padding: '10px 14px', color: '#d8d8f0',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#f0c040'}
                onBlur={e => e.target.style.borderColor = '#2a2a4a'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.25)',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 12, color: '#f06060', marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', background: loading ? '#6a5020' : '#f0c040',
                color: '#07071a', fontWeight: 800, fontSize: 13,
                padding: '12px', borderRadius: 8, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 0 20px rgba(240,192,64,0.25)',
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>

          <p style={{
            textAlign: 'center', fontSize: 10, color: '#2e2e50', marginTop: 16,
          }}>
            Pas encore de compte ? Contacte Frilous sur Discord ou en jeu.
          </p>
        </div>

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center', fontSize: 9, color: '#2a2a40', marginTop: 16, lineHeight: 1.6,
        }}>
          ⚠️ Projet indépendant — sans lien avec le staff CobbleMoon.<br />
          Aucun argent réel impliqué.
        </p>
      </div>
    </div>
  )
}
