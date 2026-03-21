// ── Crash — RTP ~89% ─────────────────────────────────────────────────────────
// Formule : crash = floor(89 / (1 - random)) / 100
// - Avantage maison : 11%
// - Crash à 1.00x : ~11% des parties
// - Multiplicateur plafonné à 150x

function generateCrashPoint() {
  const r = Math.random()
  if (r >= 0.89) return 1.00
  const crash = Math.floor(89 / (1 - r)) / 100
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
