// ── Mines — RTP 94% ───────────────────────────────────────────────────────────
const GRID_SIZE = 25

// Calcule le multiplicateur après avoir retourné N cases safe
// avec M mines sur 25 cases — RTP 94%
function calcMultiplier(minesCount, safeTurned) {
  if (safeTurned === 0) return 1.00
  const totalSafe = GRID_SIZE - minesCount
  if (safeTurned > totalSafe) return 1.00

  // Produit des probabilités inverses × RTP
  let result = 1
  for (let i = 0; i < safeTurned; i++) {
    result *= (GRID_SIZE - i) / (GRID_SIZE - minesCount - i)
  }
  return parseFloat((result * 0.94).toFixed(2))
}

function generateMines(count) {
  const positions = new Set()
  while (positions.size < count) {
    positions.add(Math.floor(Math.random() * GRID_SIZE))
  }
  return [...positions]
}

function play(betAmount, minesCount, revealedCells, action, existingMines) {

  if (action === 'start') {
    const mines = generateMines(minesCount)
    return { mines, status: 'playing', payout: 0, multiplier: 1.00 }
  }

  if (action === 'reveal') {
    const lastCell = revealedCells[revealedCells.length - 1]
    const isMine   = existingMines.includes(lastCell)

    if (isMine) {
      return { mines: existingMines, status: 'exploded', payout: 0, multiplier: 0 }
    }

    const safeTurned = revealedCells.length
    const multiplier = calcMultiplier(minesCount, safeTurned)
    const payout     = Math.floor(betAmount * multiplier)
    const totalSafe  = GRID_SIZE - minesCount
    const isComplete = safeTurned >= totalSafe

    return {
      mines:      isComplete ? existingMines : null,
      status:     isComplete ? 'won' : 'playing',
      payout,
      multiplier,
    }
  }

  if (action === 'cashout') {
    const safeTurned = revealedCells.length
    const multiplier = calcMultiplier(minesCount, safeTurned)
    const payout     = Math.floor(betAmount * multiplier)
    return { mines: existingMines, status: 'cashed', payout, multiplier }
  }

  return { error: 'Action invalide' }
}

module.exports = { play, calcMultiplier, generateMines, GRID_SIZE }