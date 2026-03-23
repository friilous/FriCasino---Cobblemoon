import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const { user, login } = useAuth()
  const navigate = useNavigate()

  if (!user) { navigate('/login'); return null }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) return setError('6 caractères minimum')
    if (newPassword !== confirm) return setError('Les mots de passe ne correspondent pas')
    setLoading(true)
    try {
      const { data } = await axios.put('/api/auth/change-password', { newPassword })
      login(data.token, { ...user, is_temp_pw: false })
      navigate('/casino')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.08) 0%, transparent 60%), #0C0608',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 60, marginBottom: 14, filter: 'drop-shadow(0 0 20px rgba(167,139,250,0.5))' }}>🔐</div>
          <h1 style={{ fontFamily: 'Cinzel Decorative, serif', fontSize: 22, fontWeight: 900, color: '#FFD700', marginBottom: 10 }}>
            Bienvenue !
          </h1>
          <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 15, color: 'rgba(245,230,200,0.5)', lineHeight: 1.6 }}>
            Bonjour <span style={{ color: '#F0B429', fontWeight: 600 }}>{user.username}</span> !<br />
            Choisis ton mot de passe personnel avant de jouer.
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(160deg, #1E1015, #150D10)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: 20, padding: '36px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)',
          }} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Nouveau mot de passe', value: newPassword, set: setNewPassword, placeholder: 'Au moins 6 caractères' },
              { label: 'Confirmer', value: confirm, set: setConfirm, placeholder: 'Répète le mot de passe' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label style={{ display: 'block', fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(167,139,250,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {label}
                </label>
                <input
                  type="password" value={value} onChange={e => set(e.target.value)} placeholder={placeholder} required
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10,
                    padding: '12px 16px', color: '#F5E6C8',
                    fontFamily: 'Crimson Pro, serif', fontSize: 15,
                    outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(167,139,250,0.15)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            ))}

            {error && (
              <div style={{ background: 'rgba(196,30,58,0.1)', border: '1px solid rgba(196,30,58,0.3)', borderRadius: 10, padding: '10px 16px', fontFamily: 'Crimson Pro, serif', fontSize: 14, color: '#E8556A' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: loading ? 'rgba(167,139,250,0.2)' : 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
              color: loading ? 'rgba(167,139,250,0.4)' : '#fff',
              fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '14px', borderRadius: 10, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(139,92,246,0.4)',
              transition: 'all 0.2s',
              marginTop: 4,
            }}>
              {loading ? 'Enregistrement…' : 'Confirmer et entrer au Casino →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
