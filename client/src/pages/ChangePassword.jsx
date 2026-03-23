import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, updateUser, login } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/login')
    return null
  }

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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-casino-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="font-casino text-2xl font-bold text-white">Choisis ton mot de passe</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Bienvenue <span className="text-casino-gold font-semibold">{user.username}</span> !<br />
            Tu dois choisir un nouveau mot de passe avant de jouer.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                className="input-field"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirmer</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Répète le mot de passe"
                className="input-field"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full py-3">
              {loading ? 'Enregistrement...' : 'Confirmer et jouer →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
