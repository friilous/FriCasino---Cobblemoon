// ── Plinko ────────────────────────────────────────────────────────────────────
// 8 rangées, 9 buckets — RTP ~90%
// Probabilités binomiales : P(bucket k) = C(8,k) / 256
const ROWS = 8;

// RTP calculé (binomial 8 rows) :
// low    ~90%  | medium ~90%  | high ~90%
const MULTIPLIERS = {
  low:    [5.0, 4.5, 1.0, 0.5, 0.5, 0.5, 1.0, 4.5, 5.0],
  medium: [9.0, 4.0, 1.0, 0.5, 0.5, 0.5, 1.0, 4.0, 9.0],
  high:   [37.5, 4.5, 1.5, 0.0, 0.0, 0.0, 1.5, 4.5, 37.5],
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
