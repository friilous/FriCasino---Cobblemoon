import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const GAMES = [
  {
    path: '/casino/slots',      id: 'slots',
    name: 'Slot Machine',       icon: '🎰', color: '#f0c040',
    hook: 'Aligne les Pokémon',
    sub:  'Mew est Wild · Jackpot ×261.5',
  },
  {
    path: '/casino/blackjack',  id: 'blackjack',
    name: 'Blackjack',          icon: '🃏', color: '#4080f0',
    hook: 'Bats le dealer',
    sub:  'Sans dépasser 21 · Blackjack ×2.2',
  },
  {
    path: '/casino/crash',      id: 'crash',
    name: 'Crash',              icon: '📈', color: '#f04040',
    hook: 'Encaisse avant le crash',
    sub:  'Multiplicateur croissant · Max ×150',
  },
  {
    path: '/casino/mines',      id: 'mines',
    name: 'Mines',              icon: '💣', color: '#40f080',
    hook: 'Évite les Voltorbe',
    sub:  'Encaisse quand tu veux · ×100+',
  },
  {
    path: '/casino/roulette',   id: 'roulette',
    name: 'Roulette Pokémon',   icon: '🎡', color: '#c040f0',
    hook: 'Mise sur un type',
    sub:  '16 segments · Légendaire ×14',
  },
  {
    path: '/casino/plinko',     id: 'plinko',
    name: 'Plinko',             icon: '⚪', color: '#a040f0',
    hook: 'Lâche la Poké Ball',
    sub:  'Rebonds aléatoires · Jackpot ×37.5',
  },
]

export default function Machines() {
  const { gameSettings } = useSocket()

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', padding: '28px', boxSizing: 'border-box' }}>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>← Accueil</Link>
          <span style={{ color: '#12121f' }}>/</span>
          <span style={{ fontSize: 11, color: '#9898b8' }}>Machines</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#e2e2f0', margin: 0, letterSpacing: 1 }}>
          Choisissez votre jeu
        </h1>
        <p style={{ fontSize: 12, color: '#44446a', margin: '6px 0 0' }}>
          Mise minimum 10 · maximum 10 000 jetons
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 860 }}>
        {GAMES.map(g => {
          const enabled = gameSettings[g.id] !== false
          const card = (
            <div
              style={{
                background: '#0c0c1e',
                border: `1px solid ${enabled ? g.color + '25' : '#1e1e3a'}`,
                borderRadius: 18,
                overflow: 'hidden',
                opacity: enabled ? 1 : 0.45,
                cursor: enabled ? 'pointer' : 'default',
                transition: 'border-color .2s, box-shadow .2s, transform .15s',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={e => {
                if (!enabled) return
                e.currentTarget.style.borderColor = g.color + '80'
                e.currentTarget.style.boxShadow = `0 0 32px ${g.color}20`
                e.currentTarget.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = enabled ? g.color + '25' : '#1e1e3a'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}
            >
              {/* Zone icône */}
              <div style={{
                background: `linear-gradient(160deg, ${g.color}18 0%, ${g.color}06 100%)`,
                borderBottom: `1px solid ${g.color}18`,
                padding: '28px 24px 22px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 12,
                position: 'relative',
              }}>
                {/* Accent top */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: enabled ? g.color : '#1e1e3a', borderRadius: '18px 18px 0 0' }} />

                <div style={{ fontSize: 38 }}>{g.icon}</div>

                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e2f0', marginBottom: 3 }}>
                    {g.name}
                    {!enabled && <span style={{ marginLeft: 8, fontSize: 9, color: '#44446a', background: '#1e1e3a', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>Maintenance</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.hook}</div>
                </div>
              </div>

              {/* Bas */}
              <div style={{ padding: '12px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: '#44446a' }}>{g.sub}</div>
                {enabled && (
                  <div style={{ fontSize: 13, color: g.color, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>Jouer →</div>
                )}
              </div>
            </div>
          )

          if (!enabled) return <div key={g.id}>{card}</div>
          return <Link key={g.id} to={g.path} style={{ textDecoration: 'none' }}>{card}</Link>
        })}
      </div>
    </div>
  )
}
