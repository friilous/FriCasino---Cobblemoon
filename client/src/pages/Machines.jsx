import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const C = {
  bg: '#06060f', surf: '#0c0c1e', border: '#1e1e3a',
  gold: '#f0b429', txt: '#e2e2f0', muted: '#44446a', dim: '#12121f',
}

const GAMES = [
  {
    path: '/casino/slots', id: 'slots',
    name: 'Slot Machine', icon: '🎰',
    color: '#f0c040',
    tagline: 'Aligne les Pokémon, décroche le jackpot',
    desc: 'Trois rouleaux, dix symboles, un Wild. Mew remplace tout — la ligne du milieu décide.',
    highlight: 'Jackpot ×261.5',
    rewards: [
      { sym: '✨', label: 'Mew (Wild)', val: 'Remplace tout' },
      { sym: '🔵', label: 'Master Ball × 3', val: '×261.5' },
      { sym: '🐉', label: 'Dragon × 3', val: '×104.5' },
      { sym: '⚡', label: 'Électrik × 3', val: '×14' },
    ],
  },
  {
    path: '/casino/blackjack', id: 'blackjack',
    name: 'Blackjack', icon: '🃏',
    color: '#4080f0',
    tagline: 'Dépasse 21 et tout est perdu. Bats le dealer.',
    desc: 'Les cartes sont des Pokémon. Tire, reste ou double ta mise — mais ne dépasse pas 21.',
    highlight: 'Blackjack naturel ×2.2',
    rewards: [
      { sym: '🏆', label: 'Blackjack naturel', val: '×2.2' },
      { sym: '✅', label: 'Victoire normale', val: '×1.9' },
      { sym: '💰', label: 'Double Down', val: 'Mise ×2' },
      { sym: '🤝', label: 'Égalité', val: 'Remboursé' },
    ],
  },
  {
    path: '/casino/crash', id: 'crash',
    name: 'Crash', icon: '📈',
    color: '#f04040',
    tagline: 'Le multiplicateur monte. Encaisse avant le crash.',
    desc: 'Plus tu attends, plus tu gagnes — mais un crash peut tout effacer en une fraction de seconde.',
    highlight: 'Jusqu\'à ×150',
    rewards: [
      { sym: '🚀', label: 'Encaisse tôt', val: 'Sécurisé' },
      { sym: '💰', label: 'Gain', val: 'Mise × cashout' },
      { sym: '🤖', label: 'Auto-cashout', val: 'Ton ×' },
      { sym: '💥', label: 'Crash avant toi', val: 'Tout perdu' },
    ],
  },
  {
    path: '/casino/mines', id: 'mines',
    name: 'Mines', icon: '💣',
    color: '#40f080',
    tagline: 'Chaque case retournée fait monter le gain.',
    desc: 'Trouve les jetons, évite les Voltorbe. Plus il y a de mines, plus les gains sont explosifs.',
    highlight: '×100+ avec 24 mines',
    rewards: [
      { sym: '🪙', label: '1ère case (3 mines)', val: '×1.05' },
      { sym: '📈', label: 'Plus de mines', val: '= plus gros' },
      { sym: '💰', label: 'Encaisse quand tu veux', val: 'Libre' },
      { sym: '💥', label: 'Voltorbe touché', val: 'Tout perdu' },
    ],
  },
  {
    path: '/casino/roulette', id: 'roulette',
    name: 'Roulette Pokémon', icon: '🎡',
    color: '#c040f0',
    tagline: 'Mise sur un type. La roue décide.',
    desc: '16 segments, 4 catégories de types Pokémon. Plus c\'est rare, plus ça paie — attention au Magicarpe.',
    highlight: 'Légendaire ×14.0',
    rewards: [
      { sym: '⭐', label: 'Commun (6/16)', val: '×2.4' },
      { sym: '💙', label: 'Rare (5/16)', val: '×2.8' },
      { sym: '💜', label: 'Épique (3/16)', val: '×4.7' },
      { sym: '✨', label: 'Légendaire (1/16)', val: '×14.0' },
      { sym: '🐟', label: 'Magicarpe (1/16)', val: 'Perte !' },
    ],
  },
  {
    path: '/casino/plinko', id: 'plinko',
    name: 'Plinko', icon: '⚪',
    color: '#a040f0',
    tagline: 'Lâche la Poké Ball. Regarde-la rebondir.',
    desc: 'La bille rebondit sur les picots jusqu\'aux buckets. Centre = fréquent. Bords = rare mais jackpot.',
    highlight: 'Jackpot ×37.5 (risque élevé)',
    rewards: [
      { sym: '🟢', label: 'Faible — max', val: '×5.0' },
      { sym: '🟡', label: 'Moyen — max', val: '×9.0' },
      { sym: '🔴', label: 'Élevé — jackpot', val: '×37.5' },
      { sym: '📊', label: 'Centre', val: 'Plus fréquent' },
    ],
  },
]

export default function Machines() {
  const { gameSettings } = useSocket()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 28px', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link to="/casino" style={{ fontSize: 11, color: C.muted, textDecoration: 'none' }}>← Accueil</Link>
          <span style={{ color: C.dim }}>/</span>
          <span style={{ fontSize: 11, color: '#9898b8' }}>🎮 Machines</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: C.txt, margin: 0, letterSpacing: 1 }}>Nos Machines</h1>
          <span style={{ fontSize: 12, color: C.muted }}>Mise min. 10 · max. 10 000 jetons</span>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0', maxWidth: 480 }}>
          Six jeux, un seul objectif : faire grossir tes jetons. Clique sur une machine pour jouer.
        </p>
      </div>

      {/* Grille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {GAMES.map(game => {
          const enabled = gameSettings[game.id] !== false
          return <GameCard key={game.id} game={game} enabled={enabled} />
        })}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 10, color: C.muted }}>
        Toutes les machines utilisent un générateur aléatoire équitable · Les gains sont distribués instantanément
      </div>
    </div>
  )
}

function GameCard({ game, enabled }) {
  const card = (
    <div
      style={{
        background: C.surf,
        border: `1px solid ${enabled ? game.color + '30' : C.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        opacity: enabled ? 1 : 0.5,
        transition: 'border-color .2s, box-shadow .2s',
        cursor: enabled ? 'pointer' : 'default',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!enabled) return
        e.currentTarget.style.borderColor = game.color + '70'
        e.currentTarget.style.boxShadow = `0 0 24px ${game.color}18`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = enabled ? game.color + '30' : C.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Barre couleur top */}
      <div style={{ height: 3, background: enabled ? game.color : C.dim, borderRadius: '16px 16px 0 0' }} />

      <div style={{ padding: '16px 18px' }}>

        {/* Titre + badge maintenance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>{game.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.txt }}>{game.name}</span>
              {!enabled && (
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: `${C.muted}20`, color: C.muted, border: `1px solid ${C.muted}30` }}>
                  🔧 Maintenance
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: game.color, fontWeight: 600, marginTop: 1 }}>{game.tagline}</div>
          </div>
          {/* Highlight gain max */}
          <div style={{ flexShrink: 0, background: game.color + '14', border: `1px solid ${game.color}30`, borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 1 }}>Max</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: game.color, whiteSpace: 'nowrap' }}>{game.highlight}</div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 11, color: '#6a6a9a', margin: '0 0 12px', lineHeight: 1.6, paddingLeft: 38 }}>
          {game.desc}
        </p>

        {/* Tableau gains rapide */}
        <div style={{ background: C.dim, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Conditions de victoire
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {game.rewards.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{r.sym}</span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 10, color: '#6a6a9a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: r.label.includes('Magicarpe') || r.label.includes('Crash') || r.label.includes('Voltorbe') || r.val === 'Tout perdu' || r.val === 'Perte !' ? '#f87171' : game.color, flexShrink: 0 }}>
                  {r.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: enabled ? game.color : C.dim,
          color: enabled ? '#06060f' : C.muted,
          fontWeight: 800, fontSize: 12, padding: '9px 20px',
          borderRadius: 9, cursor: enabled ? 'pointer' : 'not-allowed',
          transition: 'opacity .15s',
        }}>
          {enabled ? `Jouer →` : 'Indisponible'}
        </div>
      </div>
    </div>
  )

  if (!enabled) return <div>{card}</div>
  return <Link to={game.path} style={{ textDecoration: 'none' }}>{card}</Link>
}
