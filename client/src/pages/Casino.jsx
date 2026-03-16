import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

const GAMES = [
  {
    path:    '/casino/slots',
    name:    'Slot Machine',
    icon:    '🎰',
    desc:    'Alignez 3 symboles Pokémon — Master Ball pour le jackpot ultime',
    max:     'Jackpot jusqu\'à ×256 ta mise',
    color:   '#f0c040',
    glow:    'rgba(240,192,64,0.2)',
    featured: true,
  },
  {
    path:    '/casino/roulette',
    name:    'Roulette Pokémon',
    icon:    '🎯',
    desc:    'Mise sur un type — attention au 🐟 Magicarpe piège',
    max:     'Jusqu\'à ×15 ta mise',
    color:   '#c040f0',
    glow:    'rgba(192,64,240,0.2)',
  },
  {
    path:    '/casino/crash',
    name:    'Crash',
    icon:    '📈',
    desc:    'Le multiplicateur monte, encaisse avant le crash',
    max:     'Multiplicateur illimité',
    color:   '#f04040',
    glow:    'rgba(240,64,64,0.2)',
    isNew:   true,
  },
  {
    path:    '/casino/blackjack',
    name:    'Blackjack',
    icon:    '🃏',
    desc:    '21 avec des cartes Pokémon — bats le dealer',
    max:     'Jusqu\'à ×2.5 ta mise',
    color:   '#4080f0',
    glow:    'rgba(64,128,240,0.2)',
    isNew:   true,
  },
  {
    path:    '/casino/mines',
    name:    'Mines',
    icon:    '💣',
    desc:    'Évite les Voltorbe, collecte les gemmes Pokémon',
    max:     'Jusqu\'à ×100 ta mise',
    color:   '#40f080',
    glow:    'rgba(64,240,128,0.2)',
    isNew:   true,
  },
  {
    path:    '/casino/plinko',
    name:    'Plinko',
    icon:    '🪀',
    desc:    'Lâche la balle, regarde-la rebondir sur les picots',
    max:     'Jusqu\'à ×30 ta mise',
    color:   '#c040f0',
    glow:    'rgba(192,64,240,0.2)',
  },
]

export default function Casino() {
  const { user } = useAuth()
  const { liveFeed } = useSocket()

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: '#d8d8f0', margin: 0,
        }}>
          Bienvenue, <span style={{ color: '#f0c040' }}>{user?.username}</span> 👋
        </h1>
        <p style={{ fontSize: 11, color: '#44446a', marginTop: 4 }}>
          Choisis ton jeu et tente ta chance
        </p>
      </div>

      {/* Jackpot banner */}
      <div style={{
        background: '#100e00',
        border: '1px solid rgba(240,192,64,0.4)',
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 20,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#f0c040',
          animation: 'pulse-dot 1.4s ease-in-out infinite', flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: 9, color: '#777755', textTransform: 'uppercase', letterSpacing: 1 }}>
            ⚡ Jackpot progressif en cours
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#f0c040', marginLeft: 'auto' }}>
          Rejoins la partie !
        </div>
      </div>

      {/* Jeux */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        marginBottom: 16,
      }}>
        {GAMES.map(game => (
          <Link
            key={game.path}
            to={game.path}
            style={{
              textDecoration: 'none',
              gridColumn: game.featured ? 'span 2' : 'span 1',
            }}
          >
            <div style={{
              background: '#0c0c22',
              border: `1px solid ${game.featured ? game.color + '55' : '#1e1e40'}`,
              borderRadius: 12,
              padding: 14,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              display: game.featured ? 'flex' : 'block',
              alignItems: game.featured ? 'center' : undefined,
              gap: game.featured ? 16 : undefined,
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = game.color + '88'
                e.currentTarget.style.background = '#10102a'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = game.featured ? game.color + '55' : '#1e1e40'
                e.currentTarget.style.background = '#0c0c22'
              }}
            >
              {/* Barre néon en haut */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: game.color,
                boxShadow: `0 0 10px ${game.color}88`,
                borderRadius: '12px 12px 0 0',
              }} />

              <span style={{
                fontSize: game.featured ? 44 : 30,
                display: 'block',
                marginBottom: game.featured ? 0 : 8,
                flexShrink: 0,
              }}>
                {game.icon}
              </span>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0' }}>{game.name}</div>
                  {game.isNew && (
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                      background: 'rgba(64,240,128,0.12)', color: '#40f080',
                      border: '1px solid rgba(64,240,128,0.25)',
                    }}>
                      Nouveau
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#44446a', lineHeight: 1.5 }}>{game.desc}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: game.color, marginTop: 6 }}>{game.max}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Live feed + disclaimer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Live feed */}
        <div style={{
          background: '#0c0c22', border: '1px solid #1e1e40',
          borderRadius: 10, padding: 14,
        }}>
          <div style={{
            fontSize: 9, color: '#2e2e55', textTransform: 'uppercase',
            letterSpacing: 1, marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#40f080',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }} />
            Activité en direct
          </div>
          {liveFeed.length === 0 ? (
            <p style={{ fontSize: 10, color: '#2e2e55', textAlign: 'center', padding: '12px 0' }}>
              Aucune activité — sois le premier !
            </p>
          ) : liveFeed.slice(0, 5).map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 0', borderBottom: i < 4 ? '1px solid #12122a' : 'none',
              fontSize: 11,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>
                  {e.game === 'slots' ? '🎰' : e.game === 'roulette' ? '🎯' : e.game === 'crash' ? '📈' : '🎲'}
                </span>
                <span style={{ color: '#8888b8' }}>{e.username}</span>
              </div>
              <span style={{
                fontWeight: 700,
                color: e.payout > e.bet ? '#40f080' : '#f06060',
              }}>
                {e.payout > e.bet ? `+${(e.payout - e.bet).toLocaleString()}` : `-${e.bet?.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{
          background: '#0c0c22', border: '1px solid #1e1e40',
          borderRadius: 10, padding: 14,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: 9, color: '#2e2e55', textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: 10,
            }}>
              ℹ️ Infos
            </div>
            <div style={{ fontSize: 10, color: '#44446a', lineHeight: 1.7 }}>
              <div style={{ marginBottom: 6 }}>
                🎲 Mise min/max : <span style={{ color: '#8888b8' }}>10 — 10 000 jetons</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                🎁 Jetons : <span style={{ color: '#8888b8' }}>demande à Frilous en jeu</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                💸 Retrait : <span style={{ color: '#8888b8' }}>via ton profil</span>
              </div>
              <div>
                💬 Support : <span style={{ color: '#f0c040' }}>.Frilous</span> sur Discord
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 12, padding: '8px 10px',
            background: 'rgba(240,192,64,0.05)',
            border: '1px solid rgba(240,192,64,0.12)',
            borderRadius: 8,
            fontSize: 9, color: '#444430', lineHeight: 1.6,
          }}>
            ⚠️ Projet indépendant de Frilous — sans lien avec le staff CobbleMoon.
            En cas de problème, contactez Frilous et non le staff.
          </div>
        </div>
      </div>
    </div>
  )
}
