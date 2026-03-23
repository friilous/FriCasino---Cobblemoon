export const RANKS = [
  { id:1, name:'Rookie',           icon:'🔴', threshold:0,        color:'#9ca3af', maxBet:10000,  maxWithdraw:5000,   bonusWheel:1.0  },
  { id:2, name:'Dresseur',         icon:'🔵', threshold:10000,    color:'#60a5fa', maxBet:15000,  maxWithdraw:10000,  bonusWheel:1.1  },
  { id:3, name:'Vétéran',          icon:'⚪', threshold:50000,    color:'#cbd5e1', maxBet:20000,  maxWithdraw:25000,  bonusWheel:1.2  },
  { id:4, name:'Expert',           icon:'🟡', threshold:150000,   color:'#f0b429', maxBet:30000,  maxWithdraw:50000,  bonusWheel:1.3  },
  { id:5, name:'Champion',         icon:'🏆', threshold:400000,   color:'#ffd700', maxBet:50000,  maxWithdraw:100000, bonusWheel:1.5  },
  { id:6, name:'Maître',           icon:'💎', threshold:1000000,  color:'#a78bfa', maxBet:75000,  maxWithdraw:200000, bonusWheel:1.75 },
  { id:7, name:"Champion d'Élite", icon:'⚡', threshold:3000000,  color:'#f472b6', maxBet:100000, maxWithdraw:500000, bonusWheel:2.0  },
  { id:8, name:'CobbleMoon Legend',icon:'🌙', threshold:10000000, color:'#ffd700', maxBet:999999, maxWithdraw:999999, bonusWheel:3.0  },
]
export function getRankFromWagered(w) {
  let r = RANKS[0]
  for (const rank of RANKS) { if (w >= rank.threshold) r = rank; else break }
  return r
}
export function getNextRank(id) { return RANKS.find(r => r.id === id + 1) || null }
export function getXPProgress(w, cur, nxt) {
  if (!nxt) return 100
  return Math.min(100, Math.max(0, ((w - cur.threshold) / (nxt.threshold - cur.threshold)) * 100))
}
