import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRankFromWagered, getNextRank, getXPProgress } from '../utils/ranks'

const NAV_GAMES = [
  { path: '/casino/slots',     label: 'Slot Machine', icon: '🎰', color: '#F0B429' },
  { path: '/casino/blackjack', label: 'Blackjack',    icon: '🃏', color: '#60A5FA' },
  { path: '/casino/mines',     label: 'Mines',        icon: '💣', color: '#22C55E' },
  { path: '/casino/roulette',  label: 'Roulette',     icon: '🎡', color: '#A78BFA' },
  { path: '/casino/plinko',    label: 'Plinko',       icon: '⚪', color: '#F472B6' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const rank     = user?.total_wagered !== undefined ? getRankFromWagered(user.total_wagered) : null
  const nextRank = rank ? getNextRank(rank.id) : null
  const xp       = rank && nextRank ? getXPProgress(user?.total_wagered || 0, rank, nextRank) : 100

  if (!user) return null

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'linear-gradient(180deg, #100A0D, #0C0608)',
      borderRight: '1px solid rgba(240,180,41,0.1)',
      display: 'flex', flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
    }}>

      {/* ── Section Rang ── */}
      {rank && (
        <div style={{
          margin: 12,
          background: 'rgba(240,180,41,0.05)',
          border: '1px solid rgba(240,180,41,0.15)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{rank.icon}</span>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700, color: rank.color }}>
                {rank.name}
              </div>
              {nextRank && (
                <div style={{ fontSize: 9, color: 'rgba(245,230,200,0.4)', fontFamily: 'Cinzel, serif' }}>
                  → {nextRank.name}
                </div>
              )}
            </div>
          </div>
          {nextRank && (
            <>
              <div style={{
                height: 4, background: 'rgba(255,255,255,0.06)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${xp}%`,
                  background: `linear-gradient(90deg, ${rank.color}aa, ${rank.color})`,
                  borderRadius: 2,
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ fontSize: 9, color: 'rgba(245,230,200,0.3)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                {(user.total_wagered || 0).toLocaleString('fr-FR')} / {nextRank.threshold.toLocaleString('fr-FR')} ✦
              </div>
            </>
          )}
          {!nextRank && (
            <div style={{ fontSize: 10, color: rank.color, fontFamily: 'Cinzel, serif', textAlign: 'center', padding: '4px 0' }}>
              ✦ Rang Maximum ✦
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '4px 0' }}>

        <SectionLabel label="Hall" />
        <NavItem path="/casino"     icon="🏠" label="Accueil"    active={isActive('/casino') && location.pathname === '/casino'} />
        <NavItem path="/machines"   icon="🎮" label="Machines"   active={isActive('/machines')} />
        <NavItem path="/classement" icon="🏆" label="Classement" active={isActive('/classement')} />

        <SectionLabel label="Jeux" />
        {NAV_GAMES.map(item => (
          <NavItem
            key={item.path}
            path={item.path}
            icon={item.icon}
            label={item.label}
            active={isActive(item.path)}
            accentColor={item.color}
          />
        ))}

        <SectionLabel label="Bonus" />
        <NavItem path="/superjackpot" icon="💎" label="SuperJackpot" active={isActive('/superjackpot')} accentColor="#E8556A" />
        <NavItem path="/roue-du-jour" icon="🎁" label="Coffre du Jour" active={isActive('/roue-du-jour')} accentColor="#A78BFA" />

        <SectionLabel label="Compte" />
        <NavItem path="/profil" icon="👤" label="Mon Profil" active={isActive('/profil')} />

        {user?.is_admin && (
          <>
            <SectionLabel label="Admin" />
            <NavItem path="/admin" icon="⚙️" label="Panel Admin" active={isActive('/admin')} accentColor="#F472B6" />
          </>
        )}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(240,180,41,0.08)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(240,180,41,0.3), rgba(196,30,58,0.2))',
            border: '1px solid rgba(240,180,41,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700, color: '#F0B429',
          }}>
            {user.username?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#F5E6C8' }}>{user.username}</div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, color: '#F0B429', fontWeight: 700,
            }}>
              {(user?.balance || 0).toLocaleString('fr-FR')} ✦
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{
      fontFamily: 'Cinzel, serif',
      fontSize: 9, color: 'rgba(245,230,200,0.25)',
      textTransform: 'uppercase', letterSpacing: '0.15em',
      padding: '14px 16px 5px',
    }}>
      {label}
    </div>
  )
}

function NavItem({ path, icon, label, active, accentColor = '#F0B429' }) {
  return (
    <Link to={path} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px',
        color: active ? accentColor : 'rgba(245,230,200,0.5)',
        background: active ? `${accentColor}12` : 'transparent',
        borderLeft: `2px solid ${active ? accentColor : 'transparent'}`,
        fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'rgba(245,230,200,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'rgba(245,230,200,0.5)'; e.currentTarget.style.background = 'transparent' } }}
      >
        <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  )
}
