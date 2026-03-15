import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <nav className="sticky top-0 z-50 bg-casino-card/95 backdrop-blur border-b border-casino-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <span className="font-casino font-bold text-xl text-gradient">Fri'</span>
          <span className="text-casino-gold/60 font-casino text-m hidden sm:block">Casino</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') && location.pathname === '/' ? 'bg-casino-gold/20 text-casino-gold' : 'text-gray-400 hover:text-white'}`}>
            Accueil
          </Link>
          {user && (
            <Link to="/casino" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/casino') ? 'bg-casino-gold/20 text-casino-gold' : 'text-gray-400 hover:text-white'}`}>
              🎮 Casino
            </Link>
          )}
          {user && (
            <Link to="/profil" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/profil') ? 'bg-casino-gold/20 text-casino-gold' : 'text-gray-400 hover:text-white'}`}>
              👤 Profil
            </Link>
          )}
          {user?.is_admin && (
            <Link to="/admin" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/admin') ? 'bg-casino-purple/20 text-casino-purple2' : 'text-gray-400 hover:text-white'}`}>
              ⚙️ Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 bg-casino-bg border border-casino-border rounded-lg px-3 py-1.5">
                <span className="text-casino-gold font-bold text-sm">{user.balance?.toLocaleString()}</span>
                <span className="text-gray-500 text-xs">jetons</span>
              </div>
              <span className="hidden sm:block text-gray-400 text-sm">{user.username}</span>
              <button onClick={handleLogout} className="btn-outline text-sm py-1.5 px-4">
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-gold text-sm py-1.5">
              Connexion
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
