// ── Plinko ────────────────────────────────────────────────────────────────────
// 8 rangées, 9 buckets — RTP ~90%
// Probabilités binomiales : P(bucket k) = C(8,k) / 256
const ROWS = 8;

// RTP calculé (binomial 8 rows) :
// low    ~90%  | medium ~90%  | high ~90%
const MULTIPLIERS = {
  low:    [5.0, 2.5, 1.2, 0.7, 0.5, 0.7, 1.2, 2.5, 5.0],
  medium: [9.0, 3.9, 1.5, 0.4, 0.3, 0.4, 1.5, 3.9, 9.0],
  high:   [31.0, 4.5, 1.2, 0.2, 0.1, 0.2, 1.2, 4.5, 31.0],
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
