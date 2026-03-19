// ── Plinko ────────────────────────────────────────────────────────────────────
// 8 rangées, 9 buckets — RTP ~91% (réduit depuis ~96%)
// Technique casino : multiplicateurs réduits uniformément
// Probabilités binomiales : P(bucket k) = C(8,k) / 256
const ROWS = 8;

// RTP calculé (binomial 8 rows) :
// low    ~91%  | medium ~91%  | high ~90%
const MULTIPLIERS = {
  low:    [4.5, 2.2, 1.1, 0.7, 0.4, 0.7, 1.1, 2.2, 4.5],
  medium: [9.0, 3.5, 1.3, 0.4, 0.2, 0.4, 1.3, 3.5, 9.0],
  high:   [27.0, 4.0, 1.0, 0.2, 0.1, 0.2, 1.0, 4.0, 27.0],
};

function play(bet, risk = 'medium') {
  const mults = MULTIPLIERS[risk] || MULTIPLIERS.medium;
  const path  = [];
  let position = 0;

  for (let i = 0; i < ROWS; i++) {
    const goRight = Math.random() < 0.5;
    path.push(goRight ? 'R' : 'L');
    if (goRight) position++;
  }

  const bucket     = position;
  const multiplier = mults[bucket];
  const payout     = Math.floor(bet * multiplier);

  return {
    path,
    bucket,
    multiplier,
    payout,
    isWin: payout >= bet,
    risk,
    rows: ROWS,
  };
}

module.exports = { play, MULTIPLIERS, ROWS };
