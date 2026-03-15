import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/login', { username, password })
      login(data.token, data.user)
      if (data.user.is_temp_pw) {
        navigate('/changer-mot-de-passe')
      } else {
        navigate('/casino')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-casino-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎰</div>
          <h1 className="font-casino text-3xl font-bold text-gradient">CobbleMoon Casino</h1>
          <p className="text-gray-500 mt-2 text-sm">Connecte-toi avec ton pseudo Minecraft</p>
        </div>

        <div className="card glow-gold/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Pseudo Minecraft</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="TonPseudo"
                className="input-field"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full py-3 text-base">
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-xs mt-5">
            Pas encore de compte ? Contacte l'admin sur Discord pour en créer un.
          </p>
        </div>
      </div>
    </div>
  )
}
