// ── Crash — RTP 94% ───────────────────────────────────────────────────────────
// Formule : crash = floor(94 / (1 - random)) / 100
// - Avantage maison : 6%
// - Crash à 1.00x : ~6% des parties
// - Multiplicateur plafonné à 200x

function generateCrashPoint() {
  const r = Math.random()
  // Éviter la division par zéro
  if (r >= 0.94) return 1.00
  const crash = Math.floor(94 / (1 - r)) / 100
  return Math.min(crash, 200)
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
