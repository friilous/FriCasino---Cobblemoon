// ═══════════════════════════════════════════════════════════
// Système de Rangs CobbleMoon Casino
// Basé sur le total de jetons misés (total_wagered)
// ═══════════════════════════════════════════════════════════

export const RANKS = [
  {
    id: 1,
    name: 'Rookie',
    icon: '🔴',
    ball: 'Poké Ball',
    threshold: 0,
    color: '#9CA3AF',
    cssClass: 'rank-rookie',
    maxBet: 10000,
    maxWithdraw: 5000,
    bonusWheel: 1.0,
    description: 'Tu débutes ton aventure au casino.',
  },
  {
    id: 2,
    name: 'Dresseur',
    icon: '🔵',
    ball: 'Super Ball',
    threshold: 10000,
    color: '#60A5FA',
    cssClass: 'rank-dresseur',
    maxBet: 15000,
    maxWithdraw: 10000,
    bonusWheel: 1.1,
    description: 'Tu as prouvé que tu sais jouer.',
  },
  {
    id: 3,
    name: 'Vétéran',
    icon: '⚪',
    ball: 'Hyper Ball',
    threshold: 50000,
    color: '#CBD5E1',
    cssClass: 'rank-veteran',
    maxBet: 20000,
    maxWithdraw: 25000,
    bonusWheel: 1.2,
    description: 'Un joueur expérimenté du casino.',
  },
  {
    id: 4,
    name: 'Expert',
    icon: '🟡',
    ball: 'Première Classe',
    threshold: 150000,
    color: '#F0B429',
    cssClass: 'rank-expert',
    maxBet: 30000,
    maxWithdraw: 50000,
    bonusWheel: 1.3,
    description: 'Ton expertise est reconnue.',
  },
  {
    id: 5,
    name: 'Champion',
    icon: '🏆',
    ball: 'Badge Arène',
    threshold: 400000,
    color: '#FFD700',
    cssClass: 'rank-champion',
    maxBet: 50000,
    maxWithdraw: 100000,
    bonusWheel: 1.5,
    description: 'Tu domines les arènes du casino.',
  },
  {
    id: 6,
    name: 'Maître',
    icon: '💎',
    ball: 'Master Ball',
    threshold: 1000000,
    color: '#A78BFA',
    cssClass: 'rank-maitre',
    maxBet: 75000,
    maxWithdraw: 200000,
    bonusWheel: 1.75,
    description: 'Un maître parmi les joueurs.',
  },
  {
    id: 7,
    name: 'Champion d\'Élite',
    icon: '⚡',
    ball: 'Rune Légendaire',
    threshold: 3000000,
    color: '#F472B6',
    cssClass: 'rank-elite',
    maxBet: 100000,
    maxWithdraw: 500000,
    bonusWheel: 2.0,
    description: 'L\'élite des joueurs de CobbleMoon.',
  },
  {
    id: 8,
    name: 'CobbleMoon Legend',
    icon: '🌙',
    ball: 'Lune',
    threshold: 10000000,
    color: '#FFD700',
    cssClass: 'rank-legend',
    maxBet: 999999,
    maxWithdraw: 999999,
    bonusWheel: 3.0,
    description: 'Une légende du CobbleMoon Casino.',
  },
]

export function getRankFromWagered(totalWagered) {
  let rank = RANKS[0]
  for (const r of RANKS) {
    if (totalWagered >= r.threshold) rank = r
    else break
  }
  return rank
}

export function getNextRank(currentRankId) {
  return RANKS.find(r => r.id === currentRankId + 1) || null
}

export function getXPProgress(totalWagered, currentRank, nextRank) {
  if (!nextRank) return 100
  const base = currentRank.threshold
  const target = nextRank.threshold
  const progress = ((totalWagered - base) / (target - base)) * 100
  return Math.min(100, Math.max(0, progress))
}

export function formatWagered(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}
