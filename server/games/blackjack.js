// ── Blackjack — RTP ~96.5% ────────────────────────────────────────────────────
// Règles standard casino :
// - Dealer tire jusqu'à 17
// - Blackjack naturel paie ×2.5
// - Victoire normale paie ×2
// - Égalité = remboursement mise (×1)
// - Défaite = ×0

// Pokémon associés à chaque valeur de carte
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

const SUITS   = ['♠', '♥', '♦', '♣']
const VALUES  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ value, suit, dex: CARD_POKEMONS[value].dex, name: CARD_POKEMONS[value].name })
    }
  }
  // Mélanger (6 decks)
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

function play(betAmount, action, gameState) {

  // ── Nouvelle partie ──────────────────────────────────────────────────────────
  if (action === 'deal') {
    const deck = createDeck()
    const player = [deck.pop(), deck.pop()]
    const dealer = [deck.pop(), { ...deck.pop(), hidden: true }]

    const playerBJ = isBlackjack(player)
    const dealerBJ = isBlackjack([dealer[0], { ...dealer[1], hidden: false }])

    // Blackjack immédiat
    if (playerBJ || dealerBJ) {
      const dealerFull = [dealer[0], { ...dealer[1], hidden: false }]
      let status, multiplier, payout
      if (playerBJ && dealerBJ) {
        status = 'push'; multiplier = 1; payout = betAmount
      } else if (playerBJ) {
        status = 'blackjack'; multiplier = 2.5; payout = Math.floor(betAmount * 2.5)
      } else {
        status = 'dealer_blackjack'; multiplier = 0; payout = 0
      }
      return {
        status, multiplier, payout,
        player, dealer: dealerFull,
        playerValue: handValue(player),
        dealerValue: handValue(dealerFull),
        done: true,
      }
    }

    return {
      status:      'playing',
      player,
      dealer,
      deck:        deck.slice(0, 20), // garder un sous-deck pour les coups suivants
      playerValue: handValue(player),
      dealerValue: cardValue(dealer[0]),
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
        multiplier:  0,
        payout:      0,
        player:      newPlayer,
        dealer:      dealerFull,
        playerValue: val,
        dealerValue: handValue(dealerFull),
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
      done:        false,
    }
  }

  // ── Rester (Stand) ───────────────────────────────────────────────────────────
  if (action === 'stand') {
    const { player, dealer, deck } = gameState
    let dealerHand = dealer.map(c => ({ ...c, hidden: false }))
    let deckCopy   = [...deck]

    // Dealer tire jusqu'à 17
    while (handValue(dealerHand) < 17) {
      dealerHand.push(deckCopy.pop())
    }

    const pVal = handValue(player)
    const dVal = handValue(dealerHand)

    let status, multiplier, payout
    if (dVal > 21 || pVal > dVal) {
      status = 'win'; multiplier = 2; payout = betAmount * 2
    } else if (pVal === dVal) {
      status = 'push'; multiplier = 1; payout = betAmount
    } else {
      status = 'lose'; multiplier = 0; payout = 0
    }

    return {
      status,
      multiplier,
      payout,
      player,
      dealer:      dealerHand,
      playerValue: pVal,
      dealerValue: dVal,
      done:        true,
    }
  }

  return { error: 'Action invalide' }
}

module.exports = { play, handValue, isBlackjack }
