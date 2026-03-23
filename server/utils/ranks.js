const RANKS = [
  { id: 1, name: 'Rookie',            threshold: 0,        maxBet: 10000,  maxWithdraw: 5000   },
  { id: 2, name: 'Dresseur',          threshold: 10000,    maxBet: 15000,  maxWithdraw: 10000  },
  { id: 3, name: 'Vétéran',           threshold: 50000,    maxBet: 20000,  maxWithdraw: 25000  },
  { id: 4, name: 'Expert',            threshold: 150000,   maxBet: 30000,  maxWithdraw: 50000  },
  { id: 5, name: 'Champion',          threshold: 400000,   maxBet: 50000,  maxWithdraw: 100000 },
  { id: 6, name: 'Maître',            threshold: 1000000,  maxBet: 75000,  maxWithdraw: 200000 },
  { id: 7, name: "Champion d'Élite",  threshold: 3000000,  maxBet: 100000, maxWithdraw: 500000 },
  { id: 8, name: 'CobbleMoon Legend', threshold: 10000000, maxBet: 999999, maxWithdraw: 999999 },
]

function getRankFromWagered(totalWagered) {
  let rank = RANKS[0]
  for (const r of RANKS) {
    if (totalWagered >= r.threshold) rank = r
    else break
  }
  return rank
}

module.exports = { RANKS, getRankFromWagered }
