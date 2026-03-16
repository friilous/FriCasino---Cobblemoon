// ── Mines — RTP 94% ───────────────────────────────────────────────────────────
// Grille 5×5 = 25 cases
// Le joueur choisit le nombre de Voltorbe (mines)
// Multiplicateur calculé à chaque case safe retournée
// RTP 94%

const GRID_SIZE = 25

// Calcule le multiplicateur attendu après avoir retourné N cases safe
// avec M mines sur 25 cases — RTP 94%
function calcMultiplier(minesCount, safeTurned) {
  if (safeTurned === 0) return 1.00
  const totalSafe = GRID_SIZE - minesCount
  let mult = 0.94
  for (let i = 0; i < safeTurned; i++) {
    mult *= (GRID_SIZE - minesCount - i) / (GRID_SIZE - i)
    mult = 1 / mult * 0.94
  }
  // Formule propre : produit des probabilités inverses × RTP
  let result = 1
  for (let i = 0; i < safeTurned; i++) {
    result *= (GRID_SIZE - i) / (GRID_SIZE - minesCount - i)
  }
  return parseFloat((result * 0.94).toFixed(2))
}

// Générer les positions des mines aléatoirement
function generateMines(count) {
  const positions = new Set()
  while (positions.size < count) {
    positions.add(Math.floor(Math.random() * GRID_SIZE))
  }
  return [...positions]
}

function play(betAmount, minesCount, revealedCells, action, existingMines) {

  // ── Nouvelle partie ──────────────────────────────────────────────────────────
  if (action === 'start') {
    const mines = generateMines(minesCount)
    return {
      mines,
      status: 'playing',
      payout: 0,
      multiplier: 1.00,
    }
  }

  // ── Révéler une case ─────────────────────────────────────────────────────────
  if (action === 'reveal') {
    const isMine = existingMines.includes(revealedCells[revealedCells.length - 1])
    if (isMine) {
      return {
        mines: existingMines,
        status: 'exploded',
        payout: 0,
        multiplier: 0,
      }
    }
    const safeTurned  = revealedCells.length
    const multiplier  = calcMultiplier(minesCount, safeTurned)
    const payout      = Math.floor(betAmount * multiplier)
    const totalSafe   = GRID_SIZE - minesCount
    const isComplete  = safeTurned >= totalSafe

    return {
      mines:      isComplete ? existingMines : null,
      status:     isComplete ? 'won' : 'playing',
      payout:     isComplete ? payout : payout,
      multiplier,
    }
  }

  // ── Encaisser ────────────────────────────────────────────────────────────────
  if (action === 'cashout') {
    const safeTurned = revealedCells.length
    const multiplier = calcMultiplier(minesCount, safeTurned)
    const payout     = Math.floor(betAmount * multiplier)
    return {
      mines: existingMines,
      status: 'cashed',
      payout,
      multiplier,
    }
  }

  return { error: 'Action invalide' }
}

// Multiplicateurs par défaut pour affichage (1 mine, progression)
function getMultiplierTable(minesCount) {
  const table = []
  const totalSafe = GRID_SIZE - minesCount
  for (let i = 1; i <= Math.min(totalSafe, 10); i++) {
    table.push({ safe: i, mult: calcMultiplier(minesCount, i) })
  }
  return table
}

module.exports = { play, calcMultiplier, generateMines, getMultiplierTable, GRID_SIZE }
