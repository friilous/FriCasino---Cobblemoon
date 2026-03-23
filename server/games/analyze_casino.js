#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// CASINO ANALYZER — Audit complet de toutes les machines
// Usage : node analyze_casino.js
// Output : casino_audit_YYYY-MM-DD.json + casino_audit_YYYY-MM-DD.txt
// ═══════════════════════════════════════════════════════════════════════════════

const fs   = require('fs')
const path = require('path')

// ── Imports des jeux ──────────────────────────────────────────────────────────
const slots     = require('./slots')
const blackjack = require('./blackjack')
const crash     = require('./crash')
const mines     = require('./mines')
const plinko    = require('./plinko')
const roulette  = require('./roulette')

const N_STANDARD = 2_000_000   // parties par jeu (standard)
const N_HEAVY    = 5_000_000 // parties pour BJ (plus de variance)
const BET        = 1000

const results = {}
const startTime = Date.now()

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES STATS
// ═══════════════════════════════════════════════════════════════════════════════

function mean(arr)   { return arr.reduce((a,b) => a+b, 0) / arr.length }
function stddev(arr) {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s,v) => s + Math.pow(v-m,2), 0) / arr.length)
}
function percentile(sorted, p) {
  const i = Math.floor(sorted.length * p / 100)
  return sorted[Math.min(i, sorted.length-1)]
}
function chiSquare(observed, expected) {
  return observed.reduce((s,o,i) => s + Math.pow(o - expected[i], 2) / expected[i], 0)
}
function autocorr(arr, lag=1) {
  const m = mean(arr), n = arr.length
  let num = 0, denom = 0
  for (let i=0; i<n-lag; i++) num += (arr[i]-m)*(arr[i+lag]-m)
  for (let i=0; i<n; i++) denom += Math.pow(arr[i]-m, 2)
  return denom > 0 ? num/denom : 0
}
function runsTest(arr) {
  const binary = arr.map(v => v > 0 ? 1 : 0)
  let runs = 1
  for (let i=1; i<binary.length; i++) if (binary[i]!==binary[i-1]) runs++
  const n1 = binary.filter(v=>v===1).length
  const n2 = binary.filter(v=>v===0).length
  const expRuns = (2*n1*n2)/(n1+n2)+1
  const varRuns = (2*n1*n2*(2*n1*n2-n1-n2))/(Math.pow(n1+n2,2)*(n1+n2-1))
  return { runs, expected: expRuns, zScore: Math.abs((runs-expRuns)/Math.sqrt(varRuns)) }
}
function streaks(arr) {
  let maxW=0, maxL=0, curW=0, curL=0
  const nonZero = arr.filter(v => v !== 0)
  for (const v of nonZero) {
    if (v > 0) { curW++; if(curL>0) maxL=Math.max(maxL,curL); curL=0 }
    else       { curL++; if(curW>0) maxW=Math.max(maxW,curW); curW=0 }
  }
  return { maxWin: Math.max(maxW,curW), maxLoss: Math.max(maxL,curL) }
}
function distribution(arr, buckets=20) {
  const min = Math.min(...arr), max = Math.max(...arr)
  const step = (max-min)/buckets
  const dist = Array(buckets).fill(0)
  for (const v of arr) {
    const i = Math.min(Math.floor((v-min)/step), buckets-1)
    dist[i]++
  }
  return { min, max, step, dist }
}

function log(msg) { process.stdout.write(msg) }
function logln(msg='') { console.log(msg) }

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SLOTS
// ═══════════════════════════════════════════════════════════════════════════════
logln('\n🎰 Simulation SLOTS...')
{
  const N = N_STANDARD
  let totalBet=0, totalPayout=0
  let wins=0, losses=0
  const payouts=[], multipliers=[]
  const symCount={}, winTypeCount={}
  let wildcardWins=0
  let jackpots=0
  const sessionPayouts=[]
  let sessionPnl=0

  for (let i=0; i<N; i++) {
    totalBet += BET
    const r = slots.play(BET)
    totalPayout += r.payout
    payouts.push(r.payout)
    sessionPnl += r.payout - BET
    if (i % 1000 === 999) { sessionPayouts.push(sessionPnl); sessionPnl=0 }

    if (r.isWin) {
      wins++
      multipliers.push(r.multiplier)
      if (r.multiplier >= 100) jackpots++
      if (r.hasWild) wildcardWins++  // CORRECTION: was wildcardWin
      symCount[r.winSymId] = (symCount[r.winSymId]||0)+1
      winTypeCount[r.winType] = (winTypeCount[r.winType]||0)+1
    } else {
      losses++
    }
  }

  const sortedP   = [...payouts].sort((a,b)=>a-b)
  const sortedM   = [...multipliers].sort((a,b)=>a-b)
  const ac1       = autocorr(payouts.slice(0,50000), 1)
  const ac2       = autocorr(payouts.slice(0,50000), 2)
  const runs      = runsTest(payouts.slice(0,50000).map(p => p-BET))
  const stk       = streaks(payouts.slice(0,50000).map(p => p-BET))
  const sessStd   = stddev(sessionPayouts)

  results.slots = {
    N, BET,
    rtp:         (totalPayout/totalBet*100).toFixed(4) + '%',
    rtp_raw:     totalPayout/totalBet*100,
    edge:        ((1 - totalPayout/totalBet)*100).toFixed(4) + '%',
    total_bet:   totalBet,
    total_payout:totalPayout,
    profit_house:totalBet-totalPayout,
    win_rate:    (wins/N*100).toFixed(3) + '%',
    loss_rate:   (losses/N*100).toFixed(3) + '%',
    wins, losses,
    jackpots,
    jackpot_rate:(jackpots/N*100).toFixed(4) + '%',
    wildcard_wins: wildcardWins || 0,
    wildcard_rate: ((wildcardWins||0)/N*100).toFixed(3) + '%',
    win_types:   winTypeCount,
    symbol_wins: symCount,
    multipliers: {
      mean:   multipliers.length ? mean(multipliers).toFixed(3) : 0,
      stddev: multipliers.length ? stddev(multipliers).toFixed(3) : 0,
      min:    multipliers.length ? multipliers.reduce((a,b)=>a<b?a:b) : 0,
      max:    multipliers.length ? multipliers.reduce((a,b)=>a>b?a:b) : 0,
      p50:    multipliers.length ? percentile([...multipliers].sort((a,b)=>a-b), 50) : 0,
      p95:    multipliers.length ? percentile([...multipliers].sort((a,b)=>a-b), 95) : 0,
      p99:    multipliers.length ? percentile([...multipliers].sort((a,b)=>a-b), 99) : 0,
    },
    payout_stats: {
      mean:   mean(payouts).toFixed(3),
      stddev: stddev(payouts).toFixed(3),
      p1:     percentile(sortedP, 1),
      p25:    percentile(sortedP, 25),
      p50:    percentile(sortedP, 50),
      p75:    percentile(sortedP, 75),
      p99:    percentile(sortedP, 99),
      max:    payouts.reduce((a,b)=>a>b?a:b),
    },
    randomness: {
      autocorr_lag1:   ac1.toFixed(6),
      autocorr_lag2:   ac2.toFixed(6),
      runs_z:          runs.zScore.toFixed(4),
      runs_ok:         runs.zScore < 1.96,
      max_win_streak:  stk.maxWin,
      max_loss_streak: stk.maxLoss,
    },
    session_variance: {
      stddev_per_1000: sessStd.toFixed(2),
      min_session:     Math.min(...sessionPayouts).toFixed(0),
      max_session:     Math.max(...sessionPayouts).toFixed(0),
    },
    anomalies: [],
  }

  // Détection anomalies
  const r = results.slots
  if (r.rtp_raw > 98) r.anomalies.push('⚠️ RTP > 98% — casino perd de l\'argent !')
  if (r.rtp_raw < 70) r.anomalies.push('⚠️ RTP < 70% — jeu trop dur, joueurs vont fuir')
  if (Math.abs(parseFloat(r.randomness.autocorr_lag1)) > 0.01) r.anomalies.push('⚠️ Autocorrélation lag1 élevée — pattern possible')
  if (!r.randomness.runs_ok) r.anomalies.push('⚠️ Runs test échoué — séquences non aléatoires (vérifier si faux positif distribution asymétrique)')
  if (r.randomness.max_loss_streak > 30) r.anomalies.push(`⚠️ Série de ${r.randomness.max_loss_streak} défaites consécutives`)
  if (r.anomalies.length === 0) r.anomalies.push('✅ Aucune anomalie détectée')

  logln(`   RTP: ${r.rtp} | Win rate: ${r.win_rate} | Jackpots: ${r.jackpots} | ${r.anomalies[0]}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BLACKJACK
// ═══════════════════════════════════════════════════════════════════════════════
logln('🃏 Simulation BLACKJACK...')
{
  const N = N_HEAVY
  let totalBet=0, totalPayout=0
  let wins=0, losses=0, pushes=0, bjs=0, dealerBjs=0, busts=0, dealerBusts=0, doubles=0
  const payouts=[], outcomes=[]
  const dealerFinal={}, playerFinal={}
  const dealerUpcardWin={}
  let gameState = null

  for (let i=0; i<N; i++) {
    totalBet += BET
    let state = blackjack.play(BET, 'deal', null)

    if (state.done) {
      totalPayout += state.payout
      payouts.push(state.payout)
      if (state.status==='blackjack') { bjs++; wins++; outcomes.push(1) }
      else if (state.status==='dealer_blackjack') { dealerBjs++; losses++; outcomes.push(-1) }
      else if (state.status==='push') { pushes++; outcomes.push(0) }
      else { losses++; outcomes.push(-1) }
      continue
    }

    // Stratégie basique : stand à 17+
    while (!state.done && state.playerValue < 17) {
      state = blackjack.play(BET, 'hit', state)
    }
    if (!state.done) state = blackjack.play(BET, 'stand', state)

    totalPayout += state.payout
    payouts.push(state.payout)

    // Upcard
    const uc = state.dealer?.[0]
    if (uc) {
      const ucv = Math.min(blackjack.handValue([uc]), 11)
      if (!dealerUpcardWin[ucv]) dealerUpcardWin[ucv] = {w:0,l:0,p:0,total:0,bust:0}
      dealerUpcardWin[ucv].total++
      if (state.status==='win')  { dealerUpcardWin[ucv].w++; }
      else if (state.status==='push') dealerUpcardWin[ucv].p++
      else dealerUpcardWin[ucv].l++
      if (state.dealerValue > 21) dealerUpcardWin[ucv].bust++
    }

    const dv = state.dealerValue > 21 ? 'bust' : state.dealerValue
    const pv = state.playerValue > 21 ? 'bust' : state.playerValue
    dealerFinal[dv] = (dealerFinal[dv]||0)+1
    playerFinal[pv] = (playerFinal[pv]||0)+1

    if (state.status==='win')  { wins++; outcomes.push(1) }
    else if (state.status==='push') { pushes++; outcomes.push(0) }
    else { losses++; if(state.status==='bust') busts++; outcomes.push(-1) }
    if (state.dealerValue>21) dealerBusts++
  }

  const partiesOuDealerJoue = N - busts
  const sortedP = [...payouts].sort((a,b)=>a-b)
  const nonPush = outcomes.filter(v=>v!==0)
  const ac1 = autocorr(nonPush.slice(0,50000), 1)
  const runs = runsTest(nonPush.slice(0,50000))
  const stk  = streaks(nonPush.slice(0,50000))

  // Transitions W/L
  let WW=0,WL=0,LW=0,LL=0
  const np = nonPush.slice(0,100000)
  for (let i=0;i<np.length-1;i++){
    if(np[i]===1&&np[i+1]===1)WW++
    if(np[i]===1&&np[i+1]===-1)WL++
    if(np[i]===-1&&np[i+1]===1)LW++
    if(np[i]===-1&&np[i+1]===-1)LL++
  }
  const pWafterW = WW/(WW+WL)
  const pWafterL = LW/(LW+LL)
  const pWglobal = wins/(wins+losses)

  // Chi-carré sur résultats
  const expW = N * (wins/N), expL = N * (losses/N), expP = N * (pushes/N)
  const chi = Math.pow(wins-expW,2)/expW + Math.pow(losses-expL,2)/expL + Math.pow(pushes-expP,2)/expP

  // Win rate par upcard formaté
  const upcardStats = {}
  for (const [uc, d] of Object.entries(dealerUpcardWin)) {
    upcardStats[uc] = {
      win_rate:  (d.w/d.total*100).toFixed(2)+'%',
      loss_rate: (d.l/d.total*100).toFixed(2)+'%',
      push_rate: (d.p/d.total*100).toFixed(2)+'%',
      bust_rate: (d.bust/d.total*100).toFixed(2)+'%',
      total:     d.total,
    }
  }

  results.blackjack = {
    N, BET,
    rtp:          (totalPayout/totalBet*100).toFixed(4)+'%',
    rtp_raw:      totalPayout/totalBet*100,
    edge:         ((1-totalPayout/totalBet)*100).toFixed(4)+'%',
    total_bet:    totalBet,
    total_payout: totalPayout,
    profit_house: totalBet-totalPayout,
    win_rate:     (wins/N*100).toFixed(3)+'%',
    loss_rate:    (losses/N*100).toFixed(3)+'%',
    push_rate:    (pushes/N*100).toFixed(3)+'%',
    wins, losses, pushes,
    blackjacks:         bjs,
    blackjack_rate:     (bjs/N*100).toFixed(3)+'%',
    blackjack_theo:     '4.75%',
    dealer_blackjacks:  dealerBjs,
    player_bust_rate:   (busts/N*100).toFixed(3)+'%',
    dealer_bust_rate_total:   (dealerBusts/N*100).toFixed(3)+'%',
    dealer_bust_rate_whenplays: (dealerBusts/partiesOuDealerJoue*100).toFixed(3)+'%',
    dealer_final_dist:  dealerFinal,
    player_final_dist:  playerFinal,
    dealer_upcard_stats: upcardStats,
    independence: {
      p_win_after_win:  (pWafterW*100).toFixed(3)+'%',
      p_win_after_loss: (pWafterL*100).toFixed(3)+'%',
      p_win_global:     (pWglobal*100).toFixed(3)+'%',
      memory_bias:      Math.abs(pWafterW-pWafterL) < 0.005 ? '✅ Aucune mémoire' : '⚠️ Biais de mémoire détecté',
    },
    randomness: {
      autocorr_lag1:   ac1.toFixed(6),
      autocorr_ok:     Math.abs(ac1) < 0.005,
      runs_z:          runs.zScore.toFixed(4),
      runs_ok:         runs.zScore < 2.5,
      chi_square:      chi.toFixed(4),
      chi_ok:          chi < 10,
      max_win_streak:  stk.maxWin,
      max_loss_streak: stk.maxLoss,
    },
    payout_stats: {
      mean:   mean(payouts).toFixed(3),
      stddev: stddev(payouts).toFixed(3),
      p1:     percentile(sortedP, 1),
      p50:    percentile(sortedP, 50),
      p99:    percentile(sortedP, 99),
      max:    payouts.reduce((a,b)=>a>b?a:b),
    },
    anomalies: [],
  }

  const r = results.blackjack
  if (r.rtp_raw > 98) r.anomalies.push('⚠️ RTP > 98% — casino perd !')
  if (r.rtp_raw < 80) r.anomalies.push('⚠️ RTP < 80% — jeu trop dur')
  if (Math.abs(parseFloat(r.randomness.autocorr_lag1)) > 0.005) r.anomalies.push('⚠️ Autocorrélation détectée')
  if (!r.randomness.runs_ok) r.anomalies.push('⚠️ Runs test échoué')
  if (!r.randomness.chi_ok) r.anomalies.push('⚠️ Chi-carré anormal')
  if (r.independence.memory_bias.startsWith('⚠️')) r.anomalies.push('⚠️ Biais mémoire W/L')
  const bjRateNum = parseFloat(r.blackjack_rate)
  if (bjRateNum < 3.5 || bjRateNum > 6) r.anomalies.push(`⚠️ Taux blackjack anormal: ${r.blackjack_rate} (théo 4.75%)`)
  if (r.anomalies.length === 0) r.anomalies.push('✅ Aucune anomalie détectée')

  logln(`   RTP: ${r.rtp} | Win: ${r.win_rate} | BJ: ${r.blackjack_rate} | ${r.anomalies[0]}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CRASH
// ═══════════════════════════════════════════════════════════════════════════════
logln('📈 Simulation CRASH...')
{
  const N = N_STANDARD
  let totalBet=0, totalPayout=0
  let wins=0, losses=0
  const crashPoints=[], payouts=[]
  const crashDist = { '1.00':0, '1.01-1.5':0, '1.5-2':0, '2-5':0, '5-10':0, '10-50':0, '50-150':0 }

  // Stratégie : cashout à ×2 automatiquement
  const CASHOUT = 2.0
  for (let i=0; i<N; i++) {
    totalBet += BET
    const r = crash.play(BET, CASHOUT)
    totalPayout += r.payout
    payouts.push(r.payout)
    crashPoints.push(r.crashPoint)
    if (r.isWin) wins++
    else losses++

    const cp = r.crashPoint
    if (cp <= 1.00) crashDist['1.00']++
    else if (cp <= 1.5) crashDist['1.01-1.5']++
    else if (cp <= 2)   crashDist['1.5-2']++
    else if (cp <= 5)   crashDist['2-5']++
    else if (cp <= 10)  crashDist['5-10']++
    else if (cp <= 50)  crashDist['10-50']++
    else                crashDist['50-150']++
  }

  const sortedCP = [...crashPoints].sort((a,b)=>a-b)
  const ac1 = autocorr(crashPoints.slice(0,50000), 1)
  const runs = runsTest(payouts.slice(0,50000).map(p => p-BET))
  const stk  = streaks(payouts.slice(0,50000).map(p => p-BET))

  // Vérifie que P(crash < 1.01) ≈ 11% (edge maison)
  const crashAt1 = crashPoints.filter(cp => cp <= 1.00).length
  const crashAt1Rate = crashAt1/N*100

  // Distribution par décile
  const cpDeciles = {}
  for (let p=10; p<=100; p+=10) {
    cpDeciles[`p${p}`] = percentile(sortedCP, p).toFixed(3)
  }

  results.crash = {
    N, BET,
    cashout_strategy: `×${CASHOUT}`,
    rtp:          (totalPayout/totalBet*100).toFixed(4)+'%',
    rtp_raw:      totalPayout/totalBet*100,
    edge:         ((1-totalPayout/totalBet)*100).toFixed(4)+'%',
    total_bet:    totalBet,
    total_payout: totalPayout,
    profit_house: totalBet-totalPayout,
    win_rate:     (wins/N*100).toFixed(3)+'%',
    loss_rate:    (losses/N*100).toFixed(3)+'%',
    wins, losses,
    crash_at_1_rate:   crashAt1Rate.toFixed(3)+'%',
    crash_at_1_theo:   '~11%',
    crash_distribution: Object.fromEntries(
      Object.entries(crashDist).map(([k,v]) => [k, { count:v, pct:(v/N*100).toFixed(3)+'%' }])
    ),
    crash_point_stats: {
      mean:   mean(crashPoints).toFixed(4),
      stddev: stddev(crashPoints).toFixed(4),
      min:    crashPoints.reduce((a,b)=>a<b?a:b).toFixed(3),
      max:    crashPoints.reduce((a,b)=>a>b?a:b).toFixed(3),
      ...cpDeciles,
    },
    randomness: {
      autocorr_lag1:   ac1.toFixed(6),
      autocorr_ok:     Math.abs(ac1) < 0.01,
      runs_z:          runs.zScore.toFixed(4),
      runs_ok:         runs.zScore < 2.5,
      max_win_streak:  stk.maxWin,
      max_loss_streak: stk.maxLoss,
    },
    anomalies: [],
  }

  const r = results.crash
  if (Math.abs(crashAt1Rate - 11) > 2) r.anomalies.push(`⚠️ Crash à ×1.00 = ${crashAt1Rate.toFixed(1)}% (théo ~11%)`)
  if (Math.abs(parseFloat(r.randomness.autocorr_lag1)) > 0.01) r.anomalies.push('⚠️ Autocorrélation crash points — pas aléatoire !')
  if (!r.randomness.runs_ok) r.anomalies.push('⚠️ Runs test échoué')
  if (r.rtp_raw > 99) r.anomalies.push('⚠️ RTP trop élevé')
  if (r.anomalies.length === 0) r.anomalies.push('✅ Aucune anomalie détectée')

  logln(`   RTP: ${r.rtp} | Win: ${r.win_rate} | Crash@1: ${crashAt1Rate.toFixed(1)}% | ${r.anomalies[0]}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MINES
// ═══════════════════════════════════════════════════════════════════════════════
logln('💣 Simulation MINES...')
{
  const N = N_STANDARD
  const MINES_COUNTS = [1, 3, 5, 10, 15, 20, 24]
  const byMinesCount = {}

  for (const minesCount of MINES_COUNTS) {
    let totalBet=0, totalPayout=0
    let explodes=0, cashouts=0
    const payouts=[], multipliers=[]
    const REVEAL_TARGET = 3 // révèle 3 cases puis cashout

    for (let i=0; i<Math.floor(N/MINES_COUNTS.length); i++) {
      totalBet += BET
      let state = mines.play(BET, minesCount, [], 'start', null)
      const minePositions = state.mines
      let revealed = [], exploded = false, payout = 0, mult = 1

      for (let step=0; step < REVEAL_TARGET; step++) {
        // Choisir une case non mine et non révélée
        const safe = []
        for (let c=0; c<25; c++) {
          if (!revealed.includes(c) && !minePositions.includes(c)) safe.push(c)
        }
        if (safe.length === 0) break
        // 30% de chance de tomber sur une mine (simuler un joueur moyen)
        const hitMine = Math.random() < (minesCount / (25 - revealed.length))
        let cellIndex
        if (hitMine) {
          cellIndex = minePositions.find(m => !revealed.includes(m))
          if (cellIndex === undefined) { cellIndex = safe[Math.floor(Math.random()*safe.length)] }
        } else {
          cellIndex = safe[Math.floor(Math.random()*safe.length)]
        }

        revealed.push(cellIndex)
        const r = mines.play(BET, minesCount, revealed, 'reveal', minePositions)

        if (r.status === 'exploded') { exploded = true; break }
        payout = r.payout; mult = r.multiplier
        if (r.status === 'won') { cashouts++; break }
      }

      if (!exploded && payout > 0) {
        const co = mines.play(BET, minesCount, revealed, 'cashout', minePositions)
        payout = co.payout; mult = co.multiplier
        totalPayout += payout
        cashouts++
        payouts.push(payout)
        multipliers.push(mult)
      } else if (exploded) {
        explodes++
        payouts.push(0)
      } else if (payout > 0) {
        totalPayout += payout
        payouts.push(payout)
        multipliers.push(mult)
      }
    }

    const n = Math.floor(N/MINES_COUNTS.length)
    byMinesCount[minesCount] = {
      n,
      rtp:          totalBet > 0 ? (totalPayout/totalBet*100).toFixed(3)+'%' : 'N/A',
      rtp_raw:      totalBet > 0 ? totalPayout/totalBet*100 : 0,
      explode_rate: (explodes/n*100).toFixed(3)+'%',
      cashout_rate: (cashouts/n*100).toFixed(3)+'%',
      avg_multiplier: multipliers.length ? mean(multipliers).toFixed(3) : 0,
      max_multiplier: multipliers.length ? multipliers.reduce((a,b)=>a>b?a:b).toFixed(3) : 0,
      avg_payout:   payouts.length ? mean(payouts).toFixed(2) : 0,
    }
  }

  // RTP théorique avec stratégie optimale (cashout après 1 case)
  const rtpTheo = {}
  for (const mc of MINES_COUNTS) {
    const mult1 = mines.calcMultiplier(mc, 1)
    rtpTheo[mc] = (mult1 * (1 - mc/25) * 100).toFixed(2) + '%'
  }

  results.mines = {
    N, BET,
    strategy: `Révèle jusqu'à ${3} cases puis cashout (ou explosion)`,
    by_mines_count: byMinesCount,
    rtp_theoretical_1reveal: rtpTheo,
    anomalies: [],
  }

  const r = results.mines
  for (const [mc, d] of Object.entries(byMinesCount)) {
    if (d.rtp_raw > 100) r.anomalies.push(`⚠️ Mines ${mc} RTP > 100%: ${d.rtp}`)
  }
  if (r.anomalies.length === 0) r.anomalies.push('✅ Aucune anomalie détectée')

  logln(`   Mines 1: RTP ${byMinesCount[1]?.rtp} | Mines 3: ${byMinesCount[3]?.rtp} | Mines 10: ${byMinesCount[10]?.rtp} | ${r.anomalies[0]}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PLINKO
// ═══════════════════════════════════════════════════════════════════════════════
logln('⚪ Simulation PLINKO...')
{
  const N = N_STANDARD
  const risks = ['low', 'medium', 'high']
  const byRisk = {}

  for (const risk of risks) {
    let totalBet=0, totalPayout=0
    const bucketHits = Array(9).fill(0)
    const payouts=[], multipliers=[]
    let wins=0, losses=0, bigWins=0

    for (let i=0; i<Math.floor(N/risks.length); i++) {
      totalBet += BET
      const r = plinko.play(BET, risk)
      totalPayout += r.payout
      payouts.push(r.payout)
      multipliers.push(r.multiplier)
      bucketHits[r.bucket]++
      if (r.payout > BET) wins++
      else if (r.payout < BET) losses++
      if (r.multiplier >= 10) bigWins++
    }

    const n = Math.floor(N/risks.length)
    const sortedP = [...payouts].sort((a,b)=>a-b)
    const ac1 = autocorr(payouts.slice(0,30000), 1)

    // Distribution théorique binomiale (8 rows)
    const theoBuckets = Array(9).fill(0)
    const C8 = [1,8,28,56,70,56,28,8,1] // combinaisons C(8,k)
    const total8 = 256
    for (let k=0; k<9; k++) theoBuckets[k] = C8[k]/total8

    // Chi-carré vs théorique
    const obs = bucketHits.map(v => v/n)
    const chiB = chiSquare(obs.map((v,i)=>v*n), theoBuckets.map(v=>v*n))

    byRisk[risk] = {
      n,
      rtp:          (totalPayout/totalBet*100).toFixed(4)+'%',
      rtp_raw:      totalPayout/totalBet*100,
      win_rate:     (wins/n*100).toFixed(3)+'%',
      loss_rate:    (losses/n*100).toFixed(3)+'%',
      big_win_rate: (bigWins/n*100).toFixed(3)+'%',
      bucket_distribution: bucketHits.map((v,i) => ({
        bucket: i,
        hits:   v,
        pct:    (v/n*100).toFixed(3)+'%',
        theo:   (theoBuckets[i]*100).toFixed(3)+'%',
        diff:   ((v/n - theoBuckets[i])*100).toFixed(3)+'%',
      })),
      chi_square_buckets: chiB.toFixed(4),
      chi_ok: chiB < 20,
      autocorr_lag1: ac1.toFixed(6),
      payout_stats: {
        mean:   mean(payouts).toFixed(3),
        stddev: stddev(payouts).toFixed(3),
        max:    payouts.reduce((a,b)=>a>b?a:b),
        p99:    percentile(sortedP, 99),
      },
    }
  }

  results.plinko = {
    N, BET,
    by_risk: byRisk,
    anomalies: [],
  }

  const r = results.plinko
  for (const [risk, d] of Object.entries(byRisk)) {
    if (!d.chi_ok) r.anomalies.push(`⚠️ Plinko ${risk} chi-carré buckets anormal: ${d.chi_square_buckets}`)
    if (Math.abs(parseFloat(d.autocorr_lag1)) > 0.01) r.anomalies.push(`⚠️ Plinko ${risk} autocorrélation élevée`)
    if (d.rtp_raw > 98) r.anomalies.push(`⚠️ Plinko ${risk} RTP > 98%`)
  }
  if (r.anomalies.length === 0) r.anomalies.push('✅ Aucune anomalie détectée')

  logln(`   Low: ${byRisk.low?.rtp} | Med: ${byRisk.medium?.rtp} | High: ${byRisk.high?.rtp} | ${r.anomalies[0]}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ROULETTE
// ═══════════════════════════════════════════════════════════════════════════════
logln('🎯 Simulation ROULETTE...')
{
  const N = N_STANDARD
  const categories = ['common','rare','epic','legendary']
  const byCategory = {}

  for (const cat of categories) {
    let totalBet=0, totalPayout=0
    let wins=0, losses=0
    const payouts=[], consecutiveWins=[], consecutiveLosses=[]
    const winningSegments={}
    let curW=0, curL=0, maxW=0, maxL=0

    for (let i=0; i<Math.floor(N/categories.length); i++) {
      totalBet += BET
      const r = roulette.play('category', cat)
      const payout = r.isWin ? Math.floor(BET * r.multiplier) : 0
      totalPayout += payout
      payouts.push(payout)
      winningSegments[r.winning.id] = (winningSegments[r.winning.id]||0)+1

      if (r.isWin) {
        wins++; curW++
        if (curL>0) { consecutiveLosses.push(curL); maxL=Math.max(maxL,curL) }
        curL=0
      } else {
        losses++; curL++
        if (curW>0) { consecutiveWins.push(curW); maxW=Math.max(maxW,curW) }
        curW=0
      }
    }

    const n = Math.floor(N/categories.length)
    const catInfo = roulette.CATEGORIES.find(c=>c.id===cat)
    const theoPct = catInfo.count / roulette.TOTAL * 100

    // Chi-carré sur les segments gagnants
    const segCounts = Object.values(winningSegments)
    const expectedPerSeg = n / roulette.TOTAL
    const chiSeg = segCounts.reduce((s,v) => s + Math.pow(v - expectedPerSeg*1, 2)/(expectedPerSeg*1), 0)

    byCategory[cat] = {
      n,
      rtp:           (totalPayout/totalBet*100).toFixed(4)+'%',
      rtp_raw:       totalPayout/totalBet*100,
      multiplier:    catInfo.payout,
      win_rate_real: (wins/n*100).toFixed(3)+'%',
      win_rate_theo: theoPct.toFixed(3)+'%',
      win_rate_diff: ((wins/n*100) - theoPct).toFixed(3)+'%',
      wins, losses,
      max_win_streak:  maxW,
      max_loss_streak: maxL,
      winning_segment_dist: Object.fromEntries(
        Object.entries(winningSegments).map(([k,v]) => [k, {count:v, pct:(v/n*100).toFixed(3)+'%'}])
      ),
    }
  }

  results.roulette = {
    N, BET,
    wheel_total_segments: roulette.TOTAL,
    by_category: byCategory,
    anomalies: [],
  }

  const r = results.roulette
  for (const [cat, d] of Object.entries(byCategory)) {
    const diff = Math.abs(parseFloat(d.win_rate_diff))
    if (diff > 0.5) r.anomalies.push(`⚠️ Roulette ${cat} win rate réel vs théo: ${d.win_rate_diff}`)
    if (d.rtp_raw > 98) r.anomalies.push(`⚠️ Roulette ${cat} RTP > 98%`)
  }
  if (r.anomalies.length === 0) r.anomalies.push('✅ Aucune anomalie détectée')

  logln(`   Common: ${byCategory.common?.rtp} | Rare: ${byCategory.rare?.rtp} | Legendary: ${byCategory.legendary?.rtp} | ${r.anomalies[0]}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÉSUMÉ GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════
const elapsed = ((Date.now()-startTime)/1000).toFixed(1)
const summary = {
  generated_at:  new Date().toISOString(),
  elapsed_s:     elapsed,
  total_simulations: N_STANDARD*5 + N_HEAVY,
  games: {}
}

const allAnomalies = []
for (const [game, data] of Object.entries(results)) {
  summary.games[game] = {
    rtp:       data.rtp || Object.values(data.by_risk||data.by_category||data.by_mines_count||{})[0]?.rtp || 'N/A',
    anomalies: data.anomalies,
    status:    data.anomalies.every(a => a.startsWith('✅')) ? '✅ OK' : '⚠️ ANOMALIE',
  }
  for (const a of data.anomalies) {
    if (a.startsWith('⚠️')) allAnomalies.push(`${game}: ${a}`)
  }
}
summary.global_anomalies = allAnomalies.length > 0 ? allAnomalies : ['✅ Aucune anomalie globale']
summary.verdict = allAnomalies.length === 0 ? '✅ TOUS LES JEUX SAINS' : `⚠️ ${allAnomalies.length} ANOMALIE(S) DÉTECTÉE(S)`

const finalOutput = { summary, details: results }

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT JSON
// ═══════════════════════════════════════════════════════════════════════════════
const date     = new Date().toISOString().slice(0,10)
const jsonFile = `casino_audit_${date}.json`
const txtFile  = `casino_audit_${date}.txt`

fs.writeFileSync(jsonFile, JSON.stringify(finalOutput, null, 2))

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT TXT lisible
// ═══════════════════════════════════════════════════════════════════════════════
let txt = ''
const line = (s='') => txt += s + '\n'

line('╔══════════════════════════════════════════════════════════════════════════╗')
line('║            CASINO AUDIT COMPLET — ' + date + '                        ║')
line('║            ' + finalOutput.summary.total_simulations.toLocaleString() + ' simulations en ' + elapsed + 's' + ' '.repeat(20) + '║')
line('╚══════════════════════════════════════════════════════════════════════════╝')
line()
line('VERDICT GLOBAL : ' + summary.verdict)
line()
if (allAnomalies.length > 0) {
  line('ANOMALIES DÉTECTÉES :')
  for (const a of allAnomalies) line('  → ' + a)
  line()
}

for (const [game, data] of Object.entries(results)) {
  line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  line(`  ${game.toUpperCase()}`)
  line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (game === 'slots') {
    line(`  RTP            : ${data.rtp}  (edge: ${data.edge})`)
    line(`  Parties        : ${data.N.toLocaleString()}`)
    line(`  Win rate       : ${data.win_rate}  |  Jackpots: ${data.jackpot_rate}`)
    line(`  Wildcard wins  : ${data.wildcard_rate}`)
    line(`  Mult moyen win : ×${data.multipliers.mean}  (max: ×${data.multipliers.max})`)
    line(`  Autocorr lag1  : ${data.randomness.autocorr_lag1}  |  Runs Z: ${data.randomness.runs_z}`)
    line(`  Série max pertes: ${data.randomness.max_loss_streak}`)
    line(`  Symboles gagnants:`)
    for (const [sym,cnt] of Object.entries(data.symbol_wins||{}).sort((a,b)=>b[1]-a[1]).slice(0,5))
      line(`    ${sym.padEnd(15)}: ${cnt} fois (${(cnt/data.wins*100).toFixed(2)}%)`)
  }

  if (game === 'blackjack') {
    line(`  RTP            : ${data.rtp}  (edge: ${data.edge})`)
    line(`  Parties        : ${data.N.toLocaleString()}`)
    line(`  Win            : ${data.win_rate}  |  Loss: ${data.loss_rate}  |  Push: ${data.push_rate}`)
    line(`  Blackjacks     : ${data.blackjack_rate}  (théo: ${data.blackjack_theo})`)
    line(`  Bust joueur    : ${data.player_bust_rate}`)
    line(`  Bust dealer/total  : ${data.dealer_bust_rate_total}`)
    line(`  Bust dealer/joué   : ${data.dealer_bust_rate_whenplays}`)
    line(`  Mémoire W/L    : ${data.independence.memory_bias}`)
    line(`  Autocorr lag1  : ${data.randomness.autocorr_lag1}  (ok: ${data.randomness.autocorr_ok})`)
    line(`  Runs Z         : ${data.randomness.runs_z}  |  Chi²: ${data.randomness.chi_square}`)
    line(`  Séries max     : Win=${data.randomness.max_win_streak}  Loss=${data.randomness.max_loss_streak}`)
    line(`  Win rate par upcard dealer:`)
    for (const [uc, d] of Object.entries(data.dealer_upcard_stats||{}).sort((a,b)=>parseInt(a)-parseInt(b)))
      line(`    Upcard ${String(uc).padEnd(3)}: win=${d.win_rate}  bust=${d.bust_rate}  (n=${d.total})`)
    line(`  Distribution finale dealer:`)
    for (const [v,c] of Object.entries(data.dealer_final_dist||{}).sort())
      line(`    ${String(v).padEnd(5)}: ${c} (${(c/data.N*100).toFixed(2)}%)`)
  }

  if (game === 'crash') {
    line(`  RTP (cashout ×${data.cashout_strategy}) : ${data.rtp}`)
    line(`  Parties        : ${data.N.toLocaleString()}`)
    line(`  Win rate       : ${data.win_rate}`)
    line(`  Crash à ×1.00  : ${data.crash_at_1_rate}  (théo: ${data.crash_at_1_theo})`)
    line(`  CrashPoint moy : ×${data.crash_point_stats.mean}  (max: ×${data.crash_point_stats.max})`)
    line(`  Autocorr lag1  : ${data.randomness.autocorr_lag1}`)
    line(`  Distribution crash points:`)
    for (const [range, d] of Object.entries(data.crash_distribution||{}))
      line(`    ${range.padEnd(12)}: ${d.count.toLocaleString()} (${d.pct})`)
  }

  if (game === 'mines') {
    line(`  Stratégie      : ${data.strategy}`)
    for (const [mc, d] of Object.entries(data.by_mines_count||{}))
      line(`  Mines ${String(mc).padEnd(3)}      : RTP=${d.rtp.padStart(8)}  Explosion=${d.explode_rate}  Mult moy=×${d.avg_multiplier}`)
    line(`  RTP théorique (1 case révélée):`)
    for (const [mc, rtp] of Object.entries(data.rtp_theoretical_1reveal||{}))
      line(`    ${mc} mines: ${rtp}`)
  }

  if (game === 'plinko') {
    for (const [risk, d] of Object.entries(data.by_risk||{})) {
      line(`  ${risk.toUpperCase()}:`)
      line(`    RTP=${d.rtp}  Win=${d.win_rate}  BigWin=${d.big_win_rate}`)
      line(`    Chi² buckets=${d.chi_square_buckets} (ok:${d.chi_ok})  Autocorr=${d.autocorr_lag1}`)
      line(`    Dist buckets: ` + d.bucket_distribution.map(b=>`[${b.bucket}]${b.pct}`).join(' '))
    }
  }

  if (game === 'roulette') {
    for (const [cat, d] of Object.entries(data.by_category||{}))
      line(`  ${cat.padEnd(12)}: RTP=${d.rtp.padStart(8)}  Win=${d.win_rate_real} (théo ${d.win_rate_theo})  diff=${d.win_rate_diff}`)
  }

  line()
  line(`  ANOMALIES:`)
  for (const a of data.anomalies) line(`    ${a}`)
  line()
}

line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
line(`Généré le ${new Date().toLocaleString('fr-FR')} en ${elapsed}s`)

fs.writeFileSync(txtFile, txt)

logln(`\n✅ Terminé en ${elapsed}s`)
logln(`📄 JSON : ${jsonFile}`)
logln(`📄 TXT  : ${txtFile}`)
logln(`\n${summary.verdict}`)
if (allAnomalies.length > 0) {
  for (const a of allAnomalies) logln(`  → ${a}`)
}
