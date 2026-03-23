// ── Roulette Pokémon ──────────────────────────────────────────────────────────
// 16 segments · 4 catégories + Magicarpe · RTP ~89%
//
// Catégorie   | Segments | Prob   | Payout | RTP
// Commun      |  6 / 16  | 37.5%  |  ×2.4  | 90%
// Rare        |  5 / 16  | 31.3%  |  ×2.8  | 87.5%
// Épique      |  3 / 16  | 18.8%  |  ×4.7  | 88.1%
// Légendaire  |  1 / 16  |  6.3%  |  ×14.0 | 87.5%
// Magicarpe   |  1 / 16  |  6.3%  |  ×0    | 0% (segment piège, non pariable)

const CATEGORIES = [
  {
    id:      'common',
    label:   'Commun',
    count:   6,
    payout:  2.4,
    color:   '#78c850',
    emoji:   '⭐',
    desc:    'Normal · Eau · Plante · Sol · Vol',
    pokemons: [
      { dex: 132, name: 'Ditto'      },
      { dex: 9,   name: 'Tortank'    },
      { dex: 3,   name: 'Florizarre' },
      { dex: 50,  name: 'Taupiqueur' },
      { dex: 16,  name: 'Roucool'    },
    ],
  },
  {
    id:      'rare',
    label:   'Rare',
    count:   5,
    payout:  2.8,
    color:   '#6890f0',
    emoji:   '💙',
    desc:    'Feu · Électrik · Glace · Roche · Insecte',
    pokemons: [
      { dex: 6,   name: 'Dracaufeu'    },
      { dex: 25,  name: 'Pikachu'      },
      { dex: 131, name: 'Lokhlass'     },
      { dex: 74,  name: 'Racaillou'    },
      { dex: 127, name: 'Scarabeugue'  },
    ],
  },
  {
    id:      'epic',
    label:   'Épique',
    count:   3,
    payout:  4.7,
    color:   '#f85888',
    emoji:   '💜',
    desc:    'Combat · Poison · Psy',
    pokemons: [
      { dex: 107, name: 'Tygnon'    },
      { dex: 110, name: 'Smogogo'   },
      { dex: 65,  name: 'Alakazam'  },
    ],
  },
  {
    id:      'legendary',
    label:   'Légendaire',
    count:   1,
    payout:  14.0,
    color:   '#f0b429',
    emoji:   '✨',
    desc:    'Mew uniquement',
    pokemons: [
      { dex: 151, name: 'Mew' },
    ],
  },
]

const MAGIKARP = {
  id:     'magikarp',
  label:  'Magicarpe',
  count:  1,
  payout: 0,
  color:  '#f87171',
  emoji:  '🐟',
}

const ALL_SEGMENTS = [...CATEGORIES, MAGIKARP]
const TOTAL = ALL_SEGMENTS.reduce((s, c) => s + c.count, 0) // 16

function buildWheel() {
  const byCat = ALL_SEGMENTS.map(c =>
    Array.from({ length: c.count }, (_, i) => ({ ...c, segIndex: i }))
  )
  const result = []
  let round = 0
  while (result.length < TOTAL) {
    for (const arr of byCat) {
      if (round < arr.length) result.push(arr[round])
    }
    round++
  }
  return result.slice(0, TOTAL)
}

const WHEEL = buildWheel()

function play(betType, betValue) {
  if (betType !== 'category') return { error: 'Type de pari invalide' }

  const category = CATEGORIES.find(c => c.id === betValue)
  if (!category) return { error: 'Catégorie invalide' }

  const idx     = Math.floor(Math.random() * TOTAL)
  const winning = WHEEL[idx]
  const isWin   = winning.id === betValue

  return {
    winning: {
      id:    winning.id,
      label: winning.label,
      emoji: winning.emoji,
      color: winning.color,
    },
    winningIndex: idx,
    isWin,
    multiplier:   isWin ? category.payout : 0,
    betType,
    betValue,
  }
}

module.exports = { play, CATEGORIES, MAGIKARP, WHEEL, TOTAL }
