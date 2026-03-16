// ── Plinko — RTP ~95% ─────────────────────────────────────────────────────────
const MULTIPLIERS = {
  low:    [5.1, 2.5, 1.3, 0.8, 0.5, 0.8, 1.3, 2.5, 5.1],
  medium: [10.1, 4, 1.5, 0.5, 0.3, 0.5, 1.5, 4, 10.1],
  high:   [30.6, 4.3, 1.2, 0.3, 0.2, 0.3, 1.2, 4.3, 30.6],
}

const ROWS = 8

function play(betAmount, risk = 'medium') {
  const mults = MULTIPLIERS[risk] || MULTIPLIERS.medium
  const path  = []
  let position = 0

  for (let row = 0; row < ROWS; row++) {
    const dir = Math.random() < 0.5 ? 0 : 1
    path.push(dir)
    position += dir
  }

  const bucket     = position
  const multiplier = mults[bucket]
  const payout     = Math.floor(betAmount * multiplier)

  return { path, bucket, multiplier, payout, risk }
}

module.exports = { play, MULTIPLIERS, ROWS }