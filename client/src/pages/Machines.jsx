import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const GAMES = [
  {
    path:    '/casino/slots',
    id:      'slots',
    name:    'Slot Machine',
    icon:    '🎰',
    desc:    'Alignez 3 symboles Pokémon sur la ligne du milieu. Mew est le Wild !',
    rtp:     88,
    max:     '×190 (Master Ball ×3)',
    color:   '#f0c040',
    rules: [
      '3 symboles identiques → gain selon le tableau',
      'Mew (✨) = Wild, remplace n\'importe quel symbole',
      '2 symboles identiques → gain réduit',
      'Mise min/max : 10 – 10 000 jetons',
    ],
  },
  {
    path:    '/casino/roulette',
    id:      'roulette',
    name:    'Roulette Pokémon',
    icon:    '🎯',
    desc:    'Mise sur une catégorie de type. La roue a 16 segments.',
    rtp:     91,
    max:     '×14.4 (Légendaire)',
    color:   '#c040f0',
    rules: [
      'Commun (6/16) → ×2.4',
      'Rare (5/16) → ×2.9',
      'Épique (3/16) → ×4.8',
      'Légendaire (1/16) → ×14.4',
      '🐟 Magicarpe (1/16) → perdu !',
    ],
  },
  {
    path:    '/casino/crash',
    id:      'crash',
    name:    'Crash',
    icon:    '📈',
    desc:    'Le multiplicateur monte — encaisse avant le crash ou tout perds !',
    rtp:     92,
    max:     '×150',
    color:   '#f04040',
    rules: [
      'Le multiplicateur part de ×1 et monte',
      'Définis un cashout automatique OU encaisse manuellement',
      'Si le crash arrive avant ton cashout → perte totale',
      '~8% de chance de crash immédiat à ×1',
    ],
  },
  {
    path:    '/casino/blackjack',
    id:      'blackjack',
    name:    'Blackjack',
    icon:    '🃏',
    desc:    'Atteins 21 avec les cartes Pokémon sans dépasser. Bats le dealer !',
    rtp:     91,
    max:     '×2.2 (Blackjack naturel)',
    color:   '#4080f0',
    rules: [
      'Blackjack naturel (as + figure dès le début) → ×2.2',
      'Victoire normale → ×1.9',
      'Égalité → mise remboursée',
      'Double Down disponible (9, 10 ou 11)',
      'Dealer tire jusqu\'à 17 (soft 17 inclus)',
    ],
  },
  {
    path:    '/casino/mines',
    id:      'mines',
    name:    'Mines',
    icon:    '💣',
    desc:    'Révèle des cases safe — le multiplicateur monte à chaque case !',
    rtp:     92,
    max:     'Jusqu\'à ×100+ selon mines',
    color:   '#40f080',
    rules: [
      'Choisis le nombre de mines (1-24)',
      'Plus il y a de mines, plus les gains sont élevés',
      'Révèle une mine → tout perdu',
      'Encaisse à tout moment pour sécuriser ton gain',
    ],
  },
  {
    path:    '/casino/plinko',
    id:      'plinko',
    name:    'Plinko',
    icon:    '🪀',
    desc:    'Lâche la Poké Ball, elle rebondit sur les picots jusqu\'aux buckets !',
    rtp:     91,
    max:     '×27 (risque élevé)',
    color:   '#c040f0',
    rules: [
      'Choisis le niveau de risque : Faible / Moyen / Élevé',
      'Faible : max ×4.5, gains plus fréquents',
      'Moyen : max ×9.0, équilibré',
      'Élevé : max ×27.0, très volatile',
      'Les buckets centraux tombent plus souvent',
    ],
  },
]

export default function Machines() {
  const { gameSettings } = useSocket()

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>
            ← Accueil
          </Link>
          <span style={{ color: '#2a2a4a' }}>/</span>
          <span style={{ fontSize: 11, color: '#9898b8' }}>🎮 Machines</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#d8d8f0', margin: 0 }}>
          Nos Machines
        </h1>
        <p style={{ fontSize: 11, color: '#44446a', marginTop: 4 }}>
          Clique sur une machine pour jouer · Mise min 10 — max 10 000 jetons
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {GAMES.map(game => {
          const enabled = gameSettings[game.id] !== false
          return (
            <GameCard key={game.id} game={game} enabled={enabled} />
          )
        })}
      </div>
    </div>
  )
}

function GameCard({ game, enabled }) {
  const content = (
    <div style={{
      background: '#0a0a20',
      border: `1px solid ${enabled ? game.color + '33' : '#1e1e40'}`,
      borderRadius: 14, padding: 18,
      position: 'relative', overflow: 'hidden',
      opacity: enabled ? 1 : 0.55,
      transition: 'border-color 0.15s, background 0.15s',
    }}
      onMouseEnter={e => {
        if (!enabled) return
        e.currentTarget.style.borderColor = game.color + '77'
        e.currentTarget.style.background = '#10102a'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = enabled ? game.color + '33' : '#1e1e40'
        e.currentTarget.style.background = '#0a0a20'
      }}
    >
      {/* Barre colorée top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: enabled ? game.color : '#2a2a4a',
        borderRadius: '14px 14px 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ fontSize: 36, flexShrink: 0 }}>{game.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#d8d8f0' }}>{game.name}</span>
            {!enabled && (
              <span style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 8,
                background: 'rgba(240,64,64,0.12)', color: '#f06060',
                border: '1px solid rgba(240,64,64,0.25)',
              }}>
                🔧 Maintenance
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#5a5a8a', margin: '0 0 10px', lineHeight: 1.5 }}>
            {game.desc}
          </p>

          {/* Stats rapides */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <InfoPill label="RTP" value={`${game.rtp}%`} color={game.color} />
            <InfoPill label="Max" value={game.max} color={game.color} />
          </div>

          {/* Règles */}
          <div style={{
            background: '#07071a', borderRadius: 8, padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 9, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
              Comment gagner
            </div>
            {game.rules.map((r, i) => (
              <div key={i} style={{
                fontSize: 10, color: '#6a6a9a', lineHeight: 1.6,
                paddingLeft: 10, position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', left: 0,
                  color: game.color, fontSize: 8,
                }}>▸</span>
                {r}
              </div>
            ))}
          </div>

          {/* Bouton jouer */}
          {enabled ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: game.color, color: '#07071a',
              fontWeight: 800, fontSize: 12, padding: '8px 18px',
              borderRadius: 8,
            }}>
              Jouer →
            </div>
          ) : (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#1a1a3a', color: '#44446a',
              fontWeight: 600, fontSize: 12, padding: '8px 18px',
              borderRadius: 8, cursor: 'not-allowed',
            }}>
              Indisponible
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (!enabled) return <div>{content}</div>
  return <Link to={game.path} style={{ textDecoration: 'none' }}>{content}</Link>
}

function InfoPill({ label, value, color }) {
  return (
    <div style={{
      background: color + '12', border: `1px solid ${color}30`,
      borderRadius: 6, padding: '3px 8px', fontSize: 10,
    }}>
      <span style={{ color: '#44446a' }}>{label} </span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  )
}
