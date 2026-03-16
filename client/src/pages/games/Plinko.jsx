import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const ROWS = 8
const COLS = ROWS + 1
const CW   = 560
const CH   = 480
const PAD_TOP    = 40
const PAD_BOTTOM = 70
const PAD_SIDE   = 40

const MULTIPLIERS = {
  low:    [5.1, 2.5, 1.3, 0.8, 0.5, 0.8, 1.3, 2.5, 5.1],
  medium: [10.1, 4, 1.5, 0.5, 0.3, 0.5, 1.5, 4, 10.1],
  high:   [30.6, 4.3, 1.2, 0.3, 0.2, 0.3, 1.2, 4.3, 30.6],
}

const BUCKET_COLORS = [
  '#f0c040','#f0a030','#e08030','#c06030','#a04020',
  '#c06030','#e08030','#f0a030','#f0c040',
]

function pegPos(row, col) {
  const usableW  = CW - PAD_SIDE * 2
  const usableH  = CH - PAD_TOP - PAD_BOTTOM
  const rowCount = row + 2
  const spacing  = usableW / (rowCount + 1)
  return {
    x: PAD_SIDE + spacing * (col + 1),
    y: PAD_TOP + (usableH / (ROWS + 1)) * (row + 1),
  }
}

function bucketPos(col) {
  const usableW = CW - PAD_SIDE * 2
  const spacing = usableW / COLS
  return {
    x: PAD_SIDE + spacing * col + spacing / 2,
    y: CH - PAD_BOTTOM / 2,
  }
}

function drawPlinko(ctx, ballPos, activePegs, winBucket, mults) {
  ctx.clearRect(0, 0, CW, CH)
  ctx.fillStyle = '#07071a'
  ctx.fillRect(0, 0, CW, CH)

  ctx.strokeStyle = '#0f0f28'
  ctx.lineWidth = 1
  for (let x = 0; x < CW; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke()
  }

  // Buckets
  const usableW = CW - PAD_SIDE * 2
  const bWidth  = usableW / COLS - 4
  for (let i = 0; i < COLS; i++) {
    const pos   = bucketPos(i)
    const color = BUCKET_COLORS[i]
    const isWin = winBucket === i
    const bx    = pos.x - bWidth / 2

    ctx.fillStyle   = isWin ? color : color + '33'
    ctx.strokeStyle = isWin ? color : color + '66'
    ctx.lineWidth   = isWin ? 2 : 1
    ctx.beginPath()
    ctx.roundRect(bx, CH - PAD_BOTTOM + 4, bWidth, PAD_BOTTOM - 12, 4)
    ctx.fill()
    ctx.stroke()

    if (isWin) {
      ctx.shadowColor = color; ctx.shadowBlur = 16
      ctx.fill(); ctx.shadowBlur = 0
    }

    ctx.font         = `bold ${isWin ? 11 : 9}px monospace`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle    = isWin ? '#07071a' : color
    ctx.fillText(`×${mults[i]}`, pos.x, CH - PAD_BOTTOM / 2 + 2)
  }

  // Picots
  for (let row = 0; row < ROWS; row++) {
    const pegsInRow = row + 2
    for (let col = 0; col < pegsInRow; col++) {
      const pos      = pegPos(row, col)
      const isActive = activePegs.some(p => p.row === row && p.col === col)
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, isActive ? 5 : 4, 0, Math.PI * 2)
      if (isActive) {
        ctx.fillStyle = '#f0c040'; ctx.shadowColor = '#f0c040'; ctx.shadowBlur = 12
      } else {
        ctx.fillStyle = '#3a3a6a'; ctx.shadowBlur = 0
      }
      ctx.fill(); ctx.shadowBlur = 0
      ctx.strokeStyle = isActive ? '#f0c04088' : '#2a2a4a'
      ctx.lineWidth = 1; ctx.stroke()
    }
  }

  // Balle
  if (ballPos) {
    ctx.beginPath()
    ctx.arc(ballPos.x, ballPos.y, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#f0c040'; ctx.shadowColor = '#f0c040'; ctx.shadowBlur = 18
    ctx.fill(); ctx.shadowBlur = 0
    ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 2; ctx.stroke()
    ctx.beginPath()
    ctx.arc(ballPos.x, ballPos.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#07071a'; ctx.fill()
  }
}

export default function Plinko() {
  const { user, updateBalance } = useAuth()
  const [bet,      setBet]      = useState(100)
  const [risk,     setRisk]     = useState('medium')
  const [spinning, setSpinning] = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')
  const [history,  setHistory]  = useState([])

  const canvasRef     = useRef(null)
  const rafRef        = useRef(null)
  const activePegsRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) drawPlinko(canvas.getContext('2d'), null, [], null, MULTIPLIERS[risk])
  }, [risk])

  const animateBall = useCallback((path, finalBucket, onDone) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const waypoints = [{ x: CW / 2, y: PAD_TOP - 20, pegRow: -1, pegCol: -1 }]
    let col = 0
    for (let row = 0; row < ROWS; row++) {
      const dir    = path[row]
      const pegCol = col + dir
      const pos    = pegPos(row, pegCol)
      waypoints.push({ x: pos.x, y: pos.y, pegRow: row, pegCol })
      col = pegCol
    }
    const bPos = bucketPos(finalBucket)
    waypoints.push({ x: bPos.x, y: CH - PAD_BOTTOM + 4, pegRow: -1, pegCol: -1 })

    let wpIndex  = 0
    let progress = 0
    const SPEED  = 0.055
    activePegsRef.current = []

    function step() {
      if (wpIndex >= waypoints.length - 1) {
        drawPlinko(ctx, null, [], finalBucket, MULTIPLIERS[risk])
        onDone()
        return
      }
      progress += SPEED
      if (progress >= 1) {
        progress = 0
        wpIndex++
        const wp = waypoints[wpIndex]
        activePegsRef.current = wp.pegRow >= 0 ? [{ row: wp.pegRow, col: wp.pegCol }] : []
      }
      const from  = waypoints[wpIndex]
      const to    = waypoints[Math.min(wpIndex + 1, waypoints.length - 1)]
      const t     = progress
      const eased = t < 0.5 ? 2*t*t : -1+(4-2*t)*t
      drawPlinko(
        ctx,
        { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased },
        activePegsRef.current,
        null,
        MULTIPLIERS[risk]
      )
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [risk])

  async function handleDrop() {
    if (spinning || bet < 10 || bet > (user?.balance || 0)) return
    setSpinning(true); setResult(null); setError('')
    try {
      const { data } = await axios.post('/api/games/plinko', { bet, risk })
      animateBall(data.path, data.bucket, () => {
        setSpinning(false)
        setResult(data)
        updateBalance(data.balance)
        setHistory(prev => [{ bucket: data.bucket, mult: data.multiplier, payout: data.payout, bet }, ...prev].slice(0, 10))
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
      setSpinning(false)
    }
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const mults = MULTIPLIERS[risk]

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>← Lobby</Link>
        <span style={{ color: '#2a2a4a' }}>/</span>
        <span style={{ fontSize: 11, color: '#f0c040', fontWeight: 700 }}>🪀 Plinko</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 8, background: 'rgba(240,192,64,0.1)', color: '#f0c040', border: '1px solid rgba(240,192,64,0.2)' }}>
          RTP 95%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div>
          <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            <canvas ref={canvasRef} width={CW} height={CH} style={{ width: '100%', display: 'block' }} />
          </div>

          {result && !spinning && (
            <div style={{
              background: result.payout >= bet ? 'rgba(64,240,128,0.06)' : 'rgba(240,64,64,0.06)',
              border: `1px solid ${result.payout >= bet ? 'rgba(64,240,128,0.2)' : 'rgba(240,64,64,0.2)'}`,
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: result.payout >= bet ? '#40f080' : '#f06060' }}>
                  {result.payout >= bet ? '✅ Gain !' : '❌ Perdu'}
                  <span style={{ marginLeft: 10, color: BUCKET_COLORS[result.bucket] }}>×{result.multiplier}</span>
                </div>
                <div style={{ fontSize: 10, color: '#44446a', marginTop: 2 }}>Bucket {result.bucket + 1} sur 9</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: result.payout >= bet ? '#40f080' : '#f06060' }}>
                  {result.payout >= bet ? `+${(result.payout - bet).toLocaleString()}` : `-${bet.toLocaleString()}`}
                </div>
                <div style={{ fontSize: 10, color: '#44446a' }}>jetons</div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: h.payout >= h.bet ? 'rgba(64,240,128,0.1)' : 'rgba(240,64,64,0.1)',
                  color: h.payout >= h.bet ? '#40f080' : '#f06060',
                  border: `1px solid ${h.payout >= h.bet ? 'rgba(64,240,128,0.2)' : 'rgba(240,64,64,0.2)'}`,
                }}>×{h.mult}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 16 }}>
            <BetInput bet={bet} setBet={setBet} disabled={spinning} />

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 11, color: '#5a5a8a', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                Niveau de risque
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['low','medium','high'].map(r => {
                  const labels = { low:'Faible', medium:'Moyen', high:'Élevé' }
                  const colors = { low:'#40f080', medium:'#f0c040', high:'#f04040' }
                  const isActive = risk === r
                  return (
                    <button key={r} onClick={() => !spinning && setRisk(r)} disabled={spinning} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: isActive ? colors[r]+'20' : '#07071a',
                      border: `1px solid ${isActive ? colors[r] : '#2a2a4a'}`,
                      color: isActive ? colors[r] : '#5a5a8a',
                      cursor: spinning ? 'not-allowed' : 'pointer',
                    }}>
                      {labels[r]}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.2)', borderRadius: 6, fontSize: 11, color: '#f06060' }}>
                {error}
              </div>
            )}

            <button onClick={handleDrop} disabled={spinning || bet < 10 || bet > (user?.balance || 0)} style={{
              width: '100%', marginTop: 16,
              background: spinning ? '#2a2a4a' : '#f0c040',
              color: spinning ? '#5a5a8a' : '#07071a',
              fontWeight: 800, fontSize: 15, padding: '14px',
              borderRadius: 10, border: 'none',
              cursor: spinning ? 'not-allowed' : 'pointer',
              boxShadow: spinning ? 'none' : '0 0 20px rgba(240,192,64,0.25)',
            }}>
              {spinning ? '🪀 En chute...' : '🪀 Lâcher la balle'}
            </button>
          </div>

          <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 9, color: '#2e2e55', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Multiplicateurs
            </div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {mults.map((m, i) => (
                <div key={i} style={{
                  flex: 1, minWidth: 36, textAlign: 'center',
                  padding: '4px 2px', borderRadius: 5, fontSize: 9, fontWeight: 700,
                  background: BUCKET_COLORS[i]+'18', color: BUCKET_COLORS[i],
                  border: `1px solid ${BUCKET_COLORS[i]}33`,
                }}>×{m}</div>
              ))}
            </div>
          </div>

          <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, color: '#44446a', lineHeight: 1.8 }}>
              <div style={{ color: '#f0c040', fontWeight: 700, marginBottom: 6, fontSize: 11 }}>📖 Comment jouer</div>
              <div>🪀 Lâche la balle depuis le haut</div>
              <div>⚡ Elle rebondit sur les picots</div>
              <div>🎯 Le bucket final = ton gain</div>
              <div>⚠️ Risque élevé = gains extrêmes plus grands</div>
            </div>
          </div>

          <LiveFeed compact />
        </div>
      </div>
    </div>
  )
}