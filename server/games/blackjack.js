// ── Blackjack — RTP ~91% ──────────────────────────────────────────────────────
// Règles casino défavorables au joueur (techniques vraies casinos) :
// - Dealer tire jusqu'à 17 (soft 17 inclus)
// - Blackjack naturel paie ×2.2  (au lieu de ×2.5 — technique casino 6:5)
// - Victoire normale paie ×1.9   (au lieu de ×2 — maison garde 5% sur les wins)
// - Égalité = remboursement mise (×1)
// - Défaite = ×0
// - Double Down disponible (mise doublée, une seule carte)
// - Split non disponible (simplifie le jeu)

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

// Multiplicateurs de paiement (réglage RTP)
const PAYOUTS = {
  blackjack: 2.2,   // 6:5 — technique casino (vrai casino: 3:2 = 2.5)
  win:       1.9,   // maison garde 5% sur chaque victoire normale
  push:      1.0,   // remboursement
  lose:      0,
}

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ value, suit, dex: CARD_POKEMONS[value].dex, name: CARD_POKEMONS[value].name })
    }
  }
  // 6 decks mélangés
  const sixDecks = [...deck, ...deck, ...deck, ...deck, ...deck, ...deck]
  for (let i = sixDecks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sixDecks[i], sixDecks[j]] = [sixDecks[j], sixDecks[i]]
  }
  return sixDecks
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10
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

// Soft 17 : as + 6 (dealer tire sur soft 17)
function isSoft17(hand) {
  if (handValue(hand) !== 17) return false
  return hand.some(c => c.value === 'A')
}

function play(betAmount, action, gameState) {

  // ── Nouvelle partie ──────────────────────────────────────────────────────────
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
      return {
        status, multiplier, payout,
        player, dealer: dealerFull,
        playerValue: handValue(player),
        dealerValue: handValue(dealerFull),
        canDouble: false,
        done: true,
      }
    }

    const pVal = handValue(player)
    // Double down disponible si le joueur a 9, 10 ou 11
    const canDouble = [9, 10, 11].includes(pVal)

    return {
      status:      'playing',
      player,
      dealer,
      deck:        deck.slice(0, 20),
      playerValue: pVal,
      dealerValue: cardValue(dealer[0]),
      canDouble,
      done:        false,
    }
  }

  // ── Tirer une carte (Hit) ────────────────────────────────────────────────────
  if (action === 'hit') {
    const { player, dealer, deck } = gameState
    const newCard   = deck.pop()
    const newPlayer = [...player, newCard]
    const val       = handValue(newPlayer)

    if (val > 21) {
      const dealerFull = dealer.map(c => ({ ...c, hidden: false }))
      return {
        status:      'bust',
        multiplier:  PAYOUTS.lose,
        payout:      0,
        player:      newPlayer,
        dealer:      dealerFull,
        playerValue: val,
        dealerValue: handValue(dealerFull),
        canDouble:   false,
        done:        true,
      }
    }

    return {
      status:      'playing',
      player:      newPlayer,
      dealer,
      deck,
      playerValue: val,
      dealerValue: cardValue(dealer[0]),
      canDouble:   false, // plus de double après le premier hit
      done:        false,
    }
  }

  // ── Double Down ───────────────────────────────────────────────────────────────
  if (action === 'double') {
    const { player, dealer, deck } = gameState
    const newCard   = deck.pop()
    const newPlayer = [...player, newCard]
    const pVal      = handValue(newPlayer)

    // Révéler le dealer et jouer
    let dealerHand = dealer.map(c => ({ ...c, hidden: false }))
    let deckCopy   = [...deck]

    // Si bust immédiat après double
    if (pVal > 21) {
      return {
        status:      'bust',
        multiplier:  PAYOUTS.lose,
        payout:      0,
        doubled:     true,
        player:      newPlayer,
        dealer:      dealerHand,
        playerValue: pVal,
        dealerValue: handValue(dealerHand),
        done:        true,
      }
    }

    // Dealer joue (avec règle soft 17)
    while (handValue(dealerHand) < 17 || isSoft17(dealerHand)) {
      dealerHand.push(deckCopy.pop())
    }

    const dVal = handValue(dealerHand)
    let status, multiplier, payout
    if (dVal > 21 || pVal > dVal) {
      // Victoire double = mise × 2 × PAYOUTS.win, mais payout inclut la mise doublée
      status = 'win'; multiplier = PAYOUTS.win * 2; payout = Math.floor(betAmount * 2 * PAYOUTS.win)
    } else if (pVal === dVal) {
      status = 'push'; multiplier = 2; payout = betAmount * 2 // remboursement de la mise doublée
    } else {
      status = 'lose'; multiplier = 0; payout = 0
    }

    return {
      status, multiplier, payout,
      doubled: true,
      player:      newPlayer,
      dealer:      dealerHand,
      playerValue: pVal,
      dealerValue: dVal,
      done:        true,
    }
  }

  // ── Rester (Stand) ───────────────────────────────────────────────────────────
  if (action === 'stand') {
    const { player, dealer, deck } = gameState
    let dealerHand = dealer.map(c => ({ ...c, hidden: false }))
    let deckCopy   = [...deck]

    // Dealer tire jusqu'à 17+ (soft 17 inclus — règle défavorable au joueur)
    while (handValue(dealerHand) < 17 || isSoft17(dealerHand)) {
      dealerHand.push(deckCopy.pop())
    }

    const pVal = handValue(player)
    const dVal = handValue(dealerHand)

    let status, multiplier, payout
    if (dVal > 21 || pVal > dVal) {
      status = 'win'; multiplier = PAYOUTS.win; payout = Math.floor(betAmount * PAYOUTS.win)
    } else if (pVal === dVal) {
      status = 'push'; multiplier = PAYOUTS.push; payout = betAmount
    } else {
      status = 'lose'; multiplier = PAYOUTS.lose; payout = 0
    }

    return {
      status,
      multiplier,
      payout,
      player,
      dealer:      dealerHand,
      playerValue: pVal,
      dealerValue: dVal,
      canDouble:   false,
      done:        true,
    }
  }

  return { error: 'Action invalide' }
}

module.exports = { play, handValue, isBlackjack, PAYOUTS }
