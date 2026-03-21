import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_GAMES = [
  { path: '/casino/slots',     label: 'Slots',      icon: '🎰' },
  { path: '/casino/roulette',  label: 'Roulette',   icon: '🎯' },
  { path: '/casino/crash',     label: 'Crash',      icon: '📈' },
  { path: '/casino/blackjack', label: 'Blackjack',  icon: '🃏' },
  { path: '/casino/mines',     label: 'Mines',      icon: '💣' },
  { path: '/casino/plinko',    label: 'Plinko',     icon: '🪀' },
  { path: '/casino/fishing', label: 'Shiny Hunt', icon: '🎣' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()

  const isActive = (path) => location.pathname === path

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (!user) return null

  return (
    <aside style={{
      width: 210, background: '#0a0a20', borderRight: '1px solid #1e1e40',
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1e1e40' }}>
        <Link to="/casino" style={{ textDecoration: 'none' }}>
          <div style={{
            fontSize: 17, fontWeight: 800, color: '#f0c040',
            letterSpacing: 2, textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(240,192,64,0.4)',
          }}>
            Fri'Casino
          </div>
          <div style={{ fontSize: 9, color: '#44446a', marginTop: 3, letterSpacing: 1 }}>
            by Frilous · Cobblemon
          </div>
        </Link>
      </div>

      {/* Solde */}
      <div style={{
        margin: 12, background: '#0f0f28',
        border: '1px solid rgba(240,192,64,0.2)',
        borderRadius: 8, padding: '10px 14px',
      }}>
        <div style={{ fontSize: 9, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1 }}>Solde</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#f0c040', marginTop: 3 }}>
          {(user?.balance || 0).toLocaleString()}
          <span style={{ fontSize: 10, color: '#666', fontWeight: 400, marginLeft: 4 }}>jetons</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        <NavSection label="Lobby" />
        <NavItem path="/casino"     icon="🏠" label="Accueil"    active={isActive('/casino')} />
        <NavItem path="/machines"   icon="🎮" label="Machines"   active={isActive('/machines')} />
        <NavItem path="/classement" icon="🏆" label="Classement" active={isActive('/classement')} />

        <NavSection label="Jeux" />
        {NAV_GAMES.map(item => (
          <NavItem key={item.path} path={item.path} icon={item.icon} label={item.label} active={isActive(item.path)} />
        ))}

        <NavSection label="Bonus" />
        <NavItem path="/superjackpot" icon="💎" label="SuperJackpot" active={isActive('/superjackpot')} />
        <NavItem path="/roue-du-jour" icon="🎁" label="Bonus du jour" active={isActive('/roue-du-jour')} />

        <NavSection label="Compte" />
        <NavItem path="/profil" icon="👤" label="Profil & Stats" active={isActive('/profil')} />

        {user?.is_admin && (
          <>
            <NavSection label="Admin" />
            <NavItem path="/admin" icon="⚙️" label="Panel Admin" active={isActive('/admin')} />
          </>
        )}
      </nav>

      {/* User + logout */}
      <div style={{ padding: 12, borderTop: '1px solid #1e1e40' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#1a1a3a', border: '1px solid rgba(240,192,64,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#f0c040', fontWeight: 700,
            }}>
              {user.username?.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 11, color: '#9898b8' }}>{user.username}</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#44446a', padding: '4px' }} title="Déconnexion">
            ⬡
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavSection({ label }) {
  return (
    <div style={{
      fontSize: 9, color: '#2e2e50', textTransform: 'uppercase',
      letterSpacing: '1.5px', padding: '12px 16px 5px',
    }}>
      {label}
    </div>
  )
}

function NavItem({ path, icon, label, active }) {
  return (
    <Link to={path} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px', fontSize: 12,
        color: active ? '#f0c040' : '#5a5a8a',
        background: active ? '#15152e' : 'transparent',
        borderLeft: `2px solid ${active ? '#f0c040' : 'transparent'}`,
        transition: 'all 0.15s', cursor: 'pointer',
      }}>
        <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  )
}
