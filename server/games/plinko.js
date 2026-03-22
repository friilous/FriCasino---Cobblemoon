// ── Plinko ────────────────────────────────────────────────────────────────────
// Le bucket est déterminé par la physique côté client et envoyé ici.
// Le serveur calcule uniquement le payout en fonction du bucket reçu.
const ROWS = 8

const MULTIPLIERS = {
  low:    [5.0, 4.5, 1.0, 0.5, 0.5, 0.5, 1.0, 4.5, 5.0],
  medium: [9.0, 4.0, 1.0, 0.5, 0.5, 0.5, 1.0, 4.0, 9.0],
  high:   [37.5, 4.5, 1.5, 0.0, 0.0, 0.0, 1.5, 4.5, 37.5],
}

/**
 * @param {number} bet    - mise du joueur
 * @param {string} risk   - 'low' | 'medium' | 'high'
 * @param {number} bucket - index du bucket (0-8) envoyé par la physique client
 */
function play(bet, risk = 'medium', bucket) {
  const mults = MULTIPLIERS[risk] ?? MULTIPLIERS.medium
  const nBuckets = mults.length  // 9

  // Sécurité : si le bucket reçu est invalide, on refuse
  if (bucket === undefined || bucket === null || bucket < 0 || bucket >= nBuckets || !Number.isInteger(bucket)) {
    throw new Error(`Bucket invalide : ${bucket}`)
  }

  const multiplier = mults[bucket]
  const payout     = Math.floor(bet * multiplier)

  return {
    bucket,
    multiplier,
    payout,
    isWin: payout >= bet,
    risk,
    rows: ROWS,
  }
}

module.exports = { play, MULTIPLIERS, ROWS }
