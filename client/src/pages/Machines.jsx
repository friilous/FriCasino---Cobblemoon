import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const GAMES = [
  {
    path: '/casino/slots', id: 'slots',
    name: 'Slot Machine', icon: '🎰', color: '#F0B429',
    hook: 'Aligne les Pokémon',
    details: ['Mew est Wild — remplace tout', 'Jackpot Master Ball ×261', 'Magicarpe = ×0.5 en consolation'],
    rtp: 88, difficulty: 'Chance pure',
  },
  {
    path: '/casino/blackjack', id: 'blackjack',
    name: 'Blackjack', icon: '🃏', color: '#60A5FA',
    hook: 'Bats le dealer à 21',
    details: ['Blackjack naturel ×2.2', 'Double Down sur 9, 10 ou 11', 'Dealer tire jusqu\'à 17'],
    rtp: 90, difficulty: 'Stratégie',
  },
  {
    path: '/casino/mines', id: 'mines',
    name: 'Mines', icon: '💣', color: '#22C55E',
    hook: 'Évite les Voltorbe',
    details: ['Encaisse quand tu veux', '1 à 24 mines configurables', 'Plus de mines = plus de gains'],
    rtp: 92, difficulty: 'Risque contrôlé',
  },
  {
    path: '/casino/roulette', id: 'roulette',
    name: 'Roulette Pokémon', icon: '🎡', color: '#A78BFA',
    hook: 'Mise sur un type de Pokémon',
    details: ['16 segments — 4 catégories', 'Mew Légendaire = ×14', 'Magicarpe = piège !'],
    rtp: 89, difficulty: 'Chance',
  },
  {
    path: '/casino/plinko', id: 'plinko',
    name: 'Plinko', icon: '⚪', color: '#F472B6',
    hook: 'Lâche la Poké Ball',
    details: ['3 niveaux de risque', 'Jackpot ×37.5 en risque élevé', 'Physique réelle des rebonds'],
    rtp: 90, difficulty: 'Chance + Risque',
  },
]

const DIFFICULTY_COLOR = {
  'Chance pure':    '#F0B429',
  'Stratégie':      '#60A5FA',
  'Risque contrôlé':'#22C55E',
  'Chance':         '#A78BFA',
  'Chance + Risque':'#F472B6',
}

export default function Machines() {
  const { gameSettings } = useSocket()
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'Cinzel Decorative, serif',
          fontSize: 24, fontWeight: 900,
          color: '#F5E6C8', marginBottom: 6,
        }}>
          Les Machines
        </h1>
        <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 15, color: 'rgba(245,230,200,0.4)' }}>
          Choisissez votre jeu — mise minimum 10 jetons
        </p>
      </div>

      {/* Grille 1 col (pour la MCEF window) ou 2 col sur grand écran */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {GAMES.map(game => {
          const enabled = gameSettings[game.id] !== false
          const isHovered = hovered === game.id && enabled

          const card = (
            <div
              key={game.id}
              onMouseEnter={() => setHovered(game.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHovered
                  ? `linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`
                  : 'linear-gradient(160deg, #1E1015, #150D10)',
                border: `1px solid ${isHovered ? game.color + '55' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 16,
                opacity: enabled ? 1 : 0.45,
                cursor: enabled ? 'pointer' : 'default',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                transform: isHovered ? 'translateX(6px)' : 'none',
                boxShadow: isHovered ? `0 8px 40px ${game.color}20` : 'none',
                overflow: 'hidden', position: 'relative',
                display: 'flex', alignItems: 'center',
              }}
            >
              {/* Barre gauche */}
              <div style={{
                width: 4, alignSelf: 'stretch', flexShrink: 0,
                background: enabled ? game.color : 'rgba(255,255,255,0.05)',
                transition: 'background 0.2s',
              }} />

              {/* Icône */}
              <div style={{
                padding: '20px 22px', fontSize: 44, flexShrink: 0,
                filter: enabled ? `drop-shadow(0 0 ${isHovered ? 16 : 8}px ${game.color}50)` : 'grayscale(1)',
                transition: 'filter 0.3s',
              }}>
                {game.icon}
              </div>

              {/* Contenu */}
              <div style={{ flex: 1, padding: '20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 700, color: '#F5E6C8' }}>
                    {game.name}
                  </div>
                  {!enabled && (
                    <div style={{
                      fontFamily: 'Cinzel, serif', fontSize: 9,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(245,230,200,0.3)',
                      padding: '2px 8px', borderRadius: 4, letterSpacing: '0.1em',
                    }}>
                      MAINTENANCE
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 14, color: game.color, fontWeight: 600, marginBottom: 8 }}>
                  {game.hook}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {game.details.map((d, i) => (
                    <span key={i} style={{
                      fontFamily: 'Crimson Pro, serif', fontSize: 12,
                      color: 'rgba(245,230,200,0.4)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '3px 10px', borderRadius: 6,
                    }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats droite */}
              <div style={{ padding: '20px 22px', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(245,230,200,0.3)', letterSpacing: '0.1em', marginBottom: 2 }}>
                    RETOUR JOUEUR
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#22C55E' }}>
                    ~{game.rtp}%
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Cinzel, serif', fontSize: 10,
                  color: DIFFICULTY_COLOR[game.difficulty] || '#F0B429',
                  background: `${DIFFICULTY_COLOR[game.difficulty]}18`,
                  border: `1px solid ${DIFFICULTY_COLOR[game.difficulty]}30`,
                  padding: '3px 10px', borderRadius: 20,
                  display: 'inline-block',
                }}>
                  {game.difficulty}
                </div>
                {enabled && (
                  <div style={{
                    marginTop: 10,
                    fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
                    color: game.color,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}>
                    Jouer →
                  </div>
                )}
              </div>
            </div>
          )

          if (!enabled) return <div key={game.id}>{card}</div>
          return <Link key={game.id} to={game.path} style={{ textDecoration: 'none' }}>{card}</Link>
        })}
      </div>

      {/* Note RTP */}
      <div style={{
        marginTop: 24, padding: '12px 18px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 10,
        fontFamily: 'Crimson Pro, serif', fontSize: 12,
        color: 'rgba(245,230,200,0.25)', lineHeight: 1.6,
      }}>
        📊 Le "Retour Joueur" (RTP) indique le pourcentage moyen reversé aux joueurs sur des millions de parties. Un RTP de 92% signifie que pour 100 jetons misés, 92 sont en moyenne reversés. Le casino conserve le reste.
      </div>
    </div>
  )
}
