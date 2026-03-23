// ── Blackjack — RTP cible ~88-90% ────────────────────────────────────────────
// Payouts généreux pour le joueur (2.5 BJ / 2.0 win) MAIS avantage maison via :
//   1. isSoft17 corrigé — dealer tire vraiment sur soft 17 uniquement
//   2. Double Down push = rembourse mise initiale seulement (pas x2)
//   3. Règle "Push 22" — si dealer fait 22, c'est une égalité (pas un bust)
//      → retire l'avantage joueur sur les busts dealer, ~2% edge maison récupéré
//   4. Double Down disponible uniquement sur 9/10/11 (déjà en place)
//   5. 6 decks mélangés (pénétration réduite)

const CARD_POKEMONS = {
  'A':  { dex: 151, name: 'Mew'       },
  '2':  { dex: 129, name: 'Magicarpe' },
  '3':  { dex: 35,  name: 'Mélofée'   },
  '4':  { dex: 39,  name: 'Rondoudou' },
  '5':  { dex: 54,  name: 'Psykokwak' },
  '6':  { dex: 79,  name: 'Ramoloss'  },
  '7':  { dex: 25,  name: 'Pikachu'   },
  '8':  { dex: 133, name: 'Évoli'     },
  '9':  { dex: 52,  name: 'Miaouss'   },
  '10': { dex: 113, name: 'Leuphorie' },
  'J':  { dex: 25,  name: 'Pikachu'   },
  'Q':  { dex: 197, name: 'Noctali'   },
  'K':  { dex: 6,   name: 'Dracaufeu' },
}

const SUITS  = ['♠', '♥', '♦', '♣']
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

const PAYOUTS = {
  blackjack: 2.2,   // 3:2 — généreux pour le joueur
  win:       1.8,   // paiement normal
  push:      1.0,   // remboursement mise
  lose:      0,
}

// Règle Push 22 : dealer à 22 = égalité (pas bust)
// Donne ~2% d'avantage supplémentaire à la maison
const PUSH_22 = false

function createDeck() {
  const deck = []
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push({ value, suit, dex: CARD_POKEMONS[value].dex, name: CARD_POKEMONS[value].name })
  const six = [...deck,...deck,...deck,...deck,...deck,...deck]
  for (let i = six.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [six[i], six[j]] = [six[j], six[i]]
  }
  return six
}

function cardValue(card) {
  if (['J','Q','K'].includes(card.value)) return 10
  if (card.value === 'A') return 11
  return parseInt(card.value)
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0)
  let aces  = hand.filter(c => c.value === 'A').length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21
}

// ── isSoft17 CORRIGÉ ──────────────────────────────────────────────────────────
// Soft 17 = main à 17 où un As compte pour 11 (pas réduit à 1)
// Ex : As+6 = soft 17 ✓ | 10+7 = hard 17 ✗ | As+6+K (bust réduit à 17) = hard 17 ✗
function isSoft17(hand) {
  if (handValue(hand) !== 17) return false
  // Calcul "hard" : tous les As valent 1
  const hardTotal = hand.reduce((s, c) => s + (c.value === 'A' ? 1 : cardValue(c)), 0)
  // C'est soft uniquement si le hard total ≠ 17 (un As vaut encore 11)
  return hardTotal !== 17
}

// ── Résolution dealer vs joueur avec Push 22 ─────────────────────────────────
function resolve(pVal, dVal, betAmount) {
  const dealerBust = dVal > 21

  // Règle Push 22 : dealer à exactement 22 = push (pas bust)
  if (PUSH_22 && dVal === 22) {
    return { status: 'push', multiplier: PAYOUTS.push, payout: betAmount }
  }

  if (dealerBust || pVal > dVal) {
    return { status: 'win', multiplier: PAYOUTS.win, payout: Math.floor(betAmount * PAYOUTS.win) }
  } else if (pVal === dVal) {
    return { status: 'push', multiplier: PAYOUTS.push, payout: betAmount }
  } else {
    return { status: 'lose', multiplier: PAYOUTS.lose, payout: 0 }
  }
}

function play(betAmount, action, gameState) {

  // ── Deal ─────────────────────────────────────────────────────────────────────
  if (action === 'deal') {
    const deck   = createDeck()
    const player = [deck.pop(), deck.pop()]
    const dealer = [deck.pop(), { ...deck.pop(), hidden: true }]

    const playerBJ = isBlackjack(player)
    const dealerBJ = isBlackjack([dealer[0], { ...dealer[1], hidden: false }])

    if (playerBJ || dealerBJ) {
      const dealerFull = [dealer[0], { ...dealer[1], hidden: false }]
      let status, multiplier, payout
      if (playerBJ && dealerBJ) {
        status = 'push'; multiplier = PAYOUTS.push; payout = betAmount
      } else if (playerBJ) {
        status = 'blackjack'; multiplier = PAYOUTS.blackjack; payout = Math.floor(betAmount * PAYOUTS.blackjack)
      } else {
        status = 'dealer_blackjack'; multiplier = PAYOUTS.lose; payout = 0
      }
      return { status, multiplier, payout, player, dealer: dealerFull, playerValue: handValue(player), dealerValue: handValue(dealerFull), canDouble: false, done: true }
    }

    const pVal    = handValue(player)
    const canDouble = [9, 10, 11].includes(pVal)
    return { status: 'playing', player, dealer, deck: deck.slice(0, 20), playerValue: pVal, dealerValue: cardValue(dealer[0]), canDouble, done: false }
  }

  // ── Hit ───────────────────────────────────────────────────────────────────────
  if (action === 'hit') {
    const { player, dealer, deck } = gameState
    const newPlayer = [...player, deck.pop()]
    const val       = handValue(newPlayer)
    if (val > 21) {
      const dealerFull = dealer.map(c => ({ ...c, hidden: false }))
      return { status: 'bust', multiplier: PAYOUTS.lose, payout: 0, player: newPlayer, dealer: dealerFull, playerValue: val, dealerValue: handValue(dealerFull), canDouble: false, done: true }
    }
    return { status: 'playing', player: newPlayer, dealer, deck, playerValue: val, dealerValue: cardValue(dealer[0]), canDouble: false, done: false }
  }

  // ── Double Down ───────────────────────────────────────────────────────────────
  if (action === 'double') {
    const { player, dealer, deck } = gameState
    const newPlayer  = [...player, deck.pop()]
    const pVal       = handValue(newPlayer)
    let dealerHand   = dealer.map(c => ({ ...c, hidden: false }))
    let deckCopy     = [...deck]

    if (pVal > 21) {
      return { status: 'bust', multiplier: PAYOUTS.lose, payout: 0, doubled: true, player: newPlayer, dealer: dealerHand, playerValue: pVal, dealerValue: handValue(dealerHand), done: true }
    }

    while (handValue(dealerHand) < 17 || isSoft17(dealerHand)) {
      dealerHand.push(deckCopy.pop())
    }

    const dVal = handValue(dealerHand)
    const dealerBust = dVal > 21

    let status, multiplier, payout

    // Push 22 s'applique aussi au double
    if (PUSH_22 && dVal === 22) {
      // Push sur double = rembourse la mise initiale seulement
      status = 'push'; multiplier = 1; payout = betAmount
    } else if (dealerBust || pVal > dVal) {
      // Victoire double : on a misé betAmount*2, on reçoit betAmount*2*win
      status = 'win'; multiplier = PAYOUTS.win * 2; payout = Math.floor(betAmount * 2 * PAYOUTS.win)
    } else if (pVal === dVal) {
      // Push double : rembourse mise initiale seulement (pas betAmount*2)
      status = 'push'; multiplier = 1; payout = betAmount
    } else {
      status = 'lose'; multiplier = 0; payout = 0
    }

    return { status, multiplier, payout, doubled: true, player: newPlayer, dealer: dealerHand, playerValue: pVal, dealerValue: dVal, done: true }
  }

  // ── Stand ─────────────────────────────────────────────────────────────────────
  if (action === 'stand') {
    const { player, dealer, deck } = gameState
    let dealerHand = dealer.map(c => ({ ...c, hidden: false }))
    let deckCopy   = [...deck]

    while (handValue(dealerHand) < 17 || isSoft17(dealerHand)) {
      dealerHand.push(deckCopy.pop())
    }

    const pVal = handValue(player)
    const dVal = handValue(dealerHand)
    const { status, multiplier, payout } = resolve(pVal, dVal, betAmount)

    return { status, multiplier, payout, player, dealer: dealerHand, playerValue: pVal, dealerValue: dVal, canDouble: false, done: true }
  }

  return { error: 'Action invalide' }
}

module.exports = { play, handValue, isBlackjack, PAYOUTS }