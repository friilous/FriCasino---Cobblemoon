// ── Crash — RTP ~92% ─────────────────────────────────────────────────────────
// Formule : crash = floor(92 / (1 - random)) / 100
// - Avantage maison : 8% (réduit depuis 6%)
// - Crash à 1.00x : ~8% des parties
// - Multiplicateur plafonné à 150x (réduit depuis 200x)

function generateCrashPoint() {
  const r = Math.random()
  if (r >= 0.92) return 1.00
  const crash = Math.floor(92 / (1 - r)) / 100
  return Math.min(crash, 150)
}

function play(betAmount, cashoutAt) {
  const crashPoint = generateCrashPoint()
  const cashedOut  = cashoutAt && cashoutAt <= crashPoint

  const multiplier = cashedOut ? cashoutAt : crashPoint
  const payout     = cashedOut ? Math.floor(betAmount * cashoutAt) : 0
  const isWin      = cashedOut

  return {
    crashPoint,
    multiplier: parseFloat(multiplier.toFixed(2)),
    payout,
    isWin,
  }
}

module.exports = { play, generateCrashPoint }
