// ── audit_casino.js ───────────────────────────────────────────────────────────
// Lance avec : node audit_casino.js
// Vérifie pour chaque jeu :
//   1. RTP réel (simulation 500 000 parties)
//   2. Cohérence multiplicateurs JS ↔ JSX (règles affichées)
//   3. Que le gain affiché = gain réellement calculé

const slots     = require('./slots.js')
const blackjack = require('./blackjack.js')
const crash     = require('./crash.js')
const mines     = require('./mines.js')
const plinko    = require('./plinko.js')
const roulette  = require('./roulette.js')

const N   = 500_000
const BET = 100

// ── Couleurs terminal ─────────────────────────────────────────────────────────
const G = s => `\x1b[32m${s}\x1b[0m`  // vert
const R = s => `\x1b[31m${s}\x1b[0m`  // rouge
const Y = s => `\x1b[33m${s}\x1b[0m`  // jaune
const B = s => `\x1b[1m${s}\x1b[0m`   // gras

// Règles affichées côté JSX (à maintenir synchronisées manuellement avec les JSX)
// Si un chiffre ici ≠ ce que le JS calcule → le joueur voit un mensonge
const JSX_RULES = {
  slots: {
    payouts3: { masterball:261.5, dragon:104.5, dark:52.5, psychic:26, electric:14, fire:6, water:6, grass:6, magikarp:0.5 },
    payouts2: { masterball:26, dragon:10.5, dark:6.5, psychic:4, electric:2.5, fire:2, water:2, grass:2, magikarp:0 },
  },
  blackjack: {
    blackjack: 2.2,
    win:       1.9,
    push:      1.0,
    lose:      0,
  },
  crash: {
    // Pas de table fixe — on vérifie juste le RTP
  },
  mines: {
    // Multiplicateur dynamique — on vérifie la formule de preview (×0.92 × 25/(25-mines))
    rtpFactor: 0.92,
  },
  plinko: {
    low:    [5.0, 4.5, 1.0, 0.5, 0.5, 0.5, 1.0, 4.5, 5.0],
    medium: [9.0, 4.0, 1.0, 0.5, 0.5, 0.5, 1.0, 4.0, 9.0],
    high:   [37.5, 4.5, 1.5, 0.0, 0.0, 0.0, 1.5, 4.5, 37.5],
  },
  roulette: {
    common:    2.4,
    rare:      2.8,
    epic:      4.7,
    legendary: 14.0,
  },
}

let allOk = true

function check(label, actual, expected, tolerance = 0.5) {
  const diff = Math.abs(actual - expected)
  const ok   = diff <= tolerance
  if (!ok) allOk = false
  const sym  = ok ? G('✓') : R('✗')
  const val  = ok ? G(actual.toFixed(2)+'%') : R(actual.toFixed(2)+'%')
  console.log(`  ${sym} ${label}: ${val} (attendu ${expected.toFixed(1)}% ±${tolerance})`)
  return ok
}

function checkExact(label, actual, expected) {
  const ok = actual === expected
  if (!ok) allOk = false
  const sym = ok ? G('✓') : R('✗')
  console.log(`  ${sym} ${label}: ${ok ? G(actual) : R(actual+' ≠ attendu '+expected)}`)
  return ok
}

// ═══════════════════════════════════════════════════════════════════════════════
console.log(B('\n══ AUDIT CASINO COBBLEMON ══════════════════════════════'))
console.log(`  Simulation : ${(N/1000).toFixed(0)}k parties par jeu · mise ${BET}\n`)

// ── SLOTS ─────────────────────────────────────────────────────────────────────
console.log(B('🎰 SLOTS'))
{
  let totalBet = 0, totalPayout = 0
  for (let i = 0; i < N * 4; i++) {  // 2M pour slots (jackpots rares = haute variance)
    const r = slots.play(BET)
    totalBet    += BET
    totalPayout += r.payout
  }
  const rtp = (totalPayout / totalBet) * 100
  check('RTP simulé (2M parties)', rtp, 88, 2)

  // Vérif cohérence JS ↔ JSX
  console.log('  Multiplicateurs 3× (JS vs JSX affiché) :')
  let mismatch = false
  for (const [id, jsxVal] of Object.entries(JSX_RULES.slots.payouts3)) {
    const jsVal = slots.PAYOUTS_3[id] ?? 0
    if (jsVal !== jsxVal) {
      console.log(`    ${R('✗')} ${id}: JS=${jsVal}  JSX affiche=${jsxVal}  ${R('← MENSONGE')}`)
      mismatch = true; allOk = false
    }
  }
  if (!mismatch) console.log(`    ${G('✓ Tous les multiplicateurs 3× sont synchronisés')}`)

  console.log('  Multiplicateurs 2× (JS vs JSX affiché) :')
  mismatch = false
  for (const [id, jsxVal] of Object.entries(JSX_RULES.slots.payouts2)) {
    const jsVal = slots.PAYOUTS_2[id] ?? 0
    if (jsVal !== jsxVal) {
      console.log(`    ${R('✗')} ${id}: JS=${jsVal}  JSX affiche=${jsxVal}  ${R('← MENSONGE')}`)
      mismatch = true; allOk = false
    }
  }
  if (!mismatch) console.log(`    ${G('✓ Tous les multiplicateurs 2× sont synchronisés')}`)
}

// ── BLACKJACK ──────────────────────────────────────────────────────────────────
console.log(B('\n🃏 BLACKJACK'))
{
  let totalBet = 0, totalPayout = 0

  for (let i = 0; i < N; i++) {
    const deal = blackjack.play(BET, 'deal', {})
    totalBet += BET
    if (deal.done) { totalPayout += deal.payout; continue }

    // Stratégie de base simplifiée : hit si < 17, stand sinon
    let state = deal
    while (!state.done) {
      const action = state.playerValue < 17 ? 'hit' : 'stand'
      state = blackjack.play(BET, action, state)
    }
    totalPayout += state.payout
  }
  const rtp = (totalPayout / totalBet) * 100
  check('RTP simulé (stratégie hit<17)', rtp, 91, 4)

  // Vérif payouts JS ↔ JSX
  console.log('  Payouts (JS vs JSX règles) :')
  let ok = true
  for (const [key, jsxVal] of Object.entries(JSX_RULES.blackjack)) {
    const jsVal = blackjack.PAYOUTS[key]
    if (jsVal !== jsxVal) {
      console.log(`    ${R('✗')} ${key}: JS=${jsVal}  JSX affiche=${jsxVal}  ${R('← MENSONGE')}`)
      ok = false; allOk = false
    }
  }
  if (ok) console.log(`    ${G('✓ Tous les payouts Blackjack sont synchronisés')}`)
}

// ── CRASH ──────────────────────────────────────────────────────────────────────
console.log(B('\n📈 CRASH'))
{
  // La formule crash = min(max(floor(89/(1-r))/100, 1.00), 150)
  // garantit RTP = M × P(crash >= M) = M × 89/(100M) = 89% pour TOUT cashout fixe M
  let totalBet = 0, totalPayout = 0
  for (let i = 0; i < N; i++) {
    const r = crash.play(BET, 2.0)
    totalBet    += BET
    totalPayout += r.payout
  }
  const rtp = (totalPayout / totalBet) * 100
  check('RTP cashout fixe ×2.0', rtp, 89, 2)

  // Vérif : crash à 1.00× ne doit JAMAIS être < 1.00x (bug corrigé)
  let below1 = 0
  for (let i = 0; i < N; i++) {
    if (crash.generateCrashPoint() < 1.00) below1++
  }
  if (below1 > 0) {
    console.log(`  ${R('✗')} Crash en dessous de ×1.00 détecté : ${below1} fois ${R('← BUG CRITIQUE')}`)
    allOk = false
  } else {
    console.log(`  ${G('✓')} Crash toujours >= ×1.00`)
  }

  // Fréquence crash à exactement 1.00×
  let crashAt1 = 0
  for (let i = 0; i < N; i++) {
    if (crash.generateCrashPoint() <= 1.00) crashAt1++
  }
  const pct = (crashAt1 / N) * 100
  check('Fréquence crash à 1.00×', pct, 11, 1.5)
}

// ── MINES ─────────────────────────────────────────────────────────────────────
console.log(B('\n💣 MINES'))
{
  // Simulation réaliste : inclut les explosions sur première case
  let totalBet = 0, totalPayout = 0
  const MINES = 3
  for (let i = 0; i < N; i++) {
    const start = mines.play(BET, MINES, [], 'start', [])
    const minesList = start.mines
    totalBet += BET
    // Choisir une case aléatoire (pas forcément safe)
    const cell = Math.floor(Math.random() * 25)
    const reveal = mines.play(BET, MINES, [cell], 'reveal', minesList)
    if (reveal.status === 'exploded') {
      // payout = 0, perte sèche
    } else {
      const co = mines.play(BET, MINES, [cell], 'cashout', minesList)
      totalPayout += co.payout
    }
  }
  const rtp = (totalPayout / totalBet) * 100
  check('RTP simulé (3 mines, 1 case aléatoire, cashout)', rtp, 92, 1.5)

  // Vérif multiplicateur affiché "1ère case safe"
  const previewMult = parseFloat((JSX_RULES.mines.rtpFactor * (25 / (25 - MINES))).toFixed(2))
  const realMult    = mines.calcMultiplier(MINES, 1)
  console.log(`  Preview JSX "1ère case (${MINES} mines)": ×${previewMult}`)
  console.log(`  Multiplicateur JS réel             : ×${realMult}`)
  if (Math.abs(previewMult - realMult) > 0.05) {
    console.log(`  ${R('✗ ÉCART TROP GRAND — le joueur voit un chiffre faux')}`)
    allOk = false
  } else {
    console.log(`  ${G('✓ Preview cohérente avec le JS')}`)
  }
}

// ── PLINKO ────────────────────────────────────────────────────────────────────
console.log(B('\n⚪ PLINKO'))
{
  for (const risk of ['low', 'medium', 'high']) {
    let totalBet = 0, totalPayout = 0
    for (let i = 0; i < N; i++) {
      const r = plinko.play(BET, risk)
      totalBet    += BET
      totalPayout += r.payout
    }
    const rtp = (totalPayout / totalBet) * 100
    check(`RTP ${risk}`, rtp, 90, 1.5)
  }

  // Vérif multiplicateurs JS ↔ JSX
  console.log('  Multiplicateurs (JS vs JSX affiché) :')
  let ok = true
  for (const risk of ['low', 'medium', 'high']) {
    const jsArr  = plinko.MULTIPLIERS[risk]
    const jsxArr = JSX_RULES.plinko[risk]
    for (let i = 0; i < jsArr.length; i++) {
      if (jsArr[i] !== jsxArr[i]) {
        console.log(`    ${R('✗')} ${risk}[${i}]: JS=${jsArr[i]}  JSX affiche=${jsxArr[i]}  ${R('← MENSONGE')}`)
        ok = false; allOk = false
      }
    }
  }
  if (ok) console.log(`    ${G('✓ Tous les multiplicateurs Plinko sont synchronisés')}`)
}

// ── ROULETTE ──────────────────────────────────────────────────────────────────
console.log(B('\n🎡 ROULETTE'))
{
  let totalBet = 0, totalPayout = 0
  for (let i = 0; i < N; i++) {
    const r = roulette.play('category', 'common') // catégorie la plus probable
    totalBet += BET
    if (r.isWin) totalPayout += Math.floor(BET * r.multiplier)
  }
  const rtp = (totalPayout / totalBet) * 100
  check('RTP simulé (mise sur Commun)', rtp, 89, 2)

  // Vérif payouts JS ↔ JSX pour chaque catégorie
  console.log('  Payouts catégories (JS vs JSX affiché) :')
  let ok = true
  for (const cat of roulette.CATEGORIES) {
    const jsxVal = JSX_RULES.roulette[cat.id]
    if (cat.payout !== jsxVal) {
      console.log(`    ${R('✗')} ${cat.label}: JS=${cat.payout}  JSX affiche=${jsxVal}  ${R('← MENSONGE')}`)
      ok = false; allOk = false
    }
  }
  if (ok) console.log(`    ${G('✓ Tous les payouts Roulette sont synchronisés')}`)

  // Vérif exemple concret : mise 100 sur Rare → gain attendu
  const jsMultRare = roulette.CATEGORIES.find(c => c.id === 'rare').payout
  const expectedWin = Math.floor(100 * jsMultRare)
  const jsxMultRare = JSX_RULES.roulette.rare
  console.log(`\n  Exemple Rare mise 100 :`)
  console.log(`    Règle JSX affiche : ×${jsxMultRare}`)
  console.log(`    Gain JS calculé   : ${expectedWin} jetons (×${jsMultRare})`)
  if (expectedWin !== Math.floor(100 * jsxMultRare)) {
    console.log(`    ${R('✗ INCOHÉRENCE — le joueur voit ×'+jsxMultRare+' mais reçoit '+expectedWin)}`)
    allOk = false
  } else {
    console.log(`    ${G('✓ Cohérent')}`)
  }
}

// ── RÉSUMÉ ────────────────────────────────────────────────────────────────────
console.log(B('\n══ RÉSUMÉ ══════════════════════════════════════════════'))
if (allOk) {
  console.log(G('✓ Tout est cohérent — aucun mensonge au joueur détecté'))
} else {
  console.log(R('✗ Des incohérences ont été détectées (voir ci-dessus)'))
  console.log(Y('  → Corrige les fichiers signalés et relance : node audit_casino.js'))
}
console.log('')
