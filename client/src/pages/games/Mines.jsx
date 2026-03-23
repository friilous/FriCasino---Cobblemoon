import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'

const SPRITE = dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

// Voltorbe = 100, Electrode = 101
const MINE_IMG  = SPRITE(100)
const TOKEN_IMG = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/coin.png'

function Cell({ idx, state, onClick, disabled }) {
  const [hov, setHov] = useState(false)

  const styles = {
    hidden: {
      background: hov && !disabled ? 'rgba(109,40,217,.15)' : 'rgba(109,40,217,.06)',
      border: `1px solid ${hov && !disabled ? 'rgba(124,58,237,.5)' : 'rgba(109,40,217,.15)'}`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transform: hov && !disabled ? 'scale(1.04)' : 'scale(1)',
    },
    token: {
      background: 'rgba(16,185,129,.12)',
      border: '1px solid rgba(16,185,129,.4)',
      boxShadow: '0 0 12px rgba(16,185,129,.2)',
      cursor: 'default',
    },
    mine: {
      background: 'rgba(239,68,68,.25)',
      border: '2px solid rgba(239,68,68,.7)',
      boxShadow: '0 0 20px rgba(239,68,68,.4)',
      animation: 'shakeX .3s ease',
      cursor: 'default',
    },
    mine_other: {
      background: 'rgba(239,68,68,.06)',
      border: '1px solid rgba(239,68,68,.15)',
      opacity: .5,
      cursor: 'default',
    },
  }

  const st = styles[state] || styles.hidden

  return (
    <div
      style={{ ...st, borderRadius:8, aspectRatio:1, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .12s', position:'relative', overflow:'hidden' }}
      onClick={() => state === 'hidden' && !disabled && onClick(idx)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {state === 'hidden' && (
        <span style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, color: hov && !disabled ? 'rgba(124,58,237,.8)' : 'rgba(109,40,217,.3)' }}>?</span>
      )}
      {state === 'token' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow:'0 0 8px rgba(251,191,36,.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>✦</div>
        </div>
      )}
      {(state === 'mine' || state === 'mine_other') && (
        <img src={MINE_IMG} alt="Voltorbe" style={{ width:32, height:32, imageRendering:'pixelated', filter: state === 'mine' ? 'drop-shadow(0 0 8px rgba(239,68,68,.8))' : 'grayscale(.5)' }} onError={e => { e.target.textContent = '💣'; e.target.style.fontSize = '20px' }} />
      )}
    </div>
  )
}

export default function Mines() {
  const { user, updateBalance } = useAuth()
  const [bet,      setBet]     = useState(100)
  const [nMines,   setNMines]  = useState(3)
  const [phase,    setPhase]   = useState('idle') // idle | playing | done
  const [revealed, setRevealed]= useState([])
  const [minePos,  setMinePos] = useState([])
  const [hitCell,  setHitCell] = useState(null)
  const [mult,     setMult]    = useState(1)
  const [payout,   setPayout]  = useState(0)
  const [loading,  setLoading] = useState(false)
  const [err,      setErr]     = useState('')
  const [outcome,  setOutcome] = useState(null) // 'win'|'lose'|'cashout'
  const [history,  setHistory] = useState([])

  function cellState(i) {
    if (phase === 'done' || phase === 'idle') {
      if (i === hitCell) return 'mine'
      if (minePos.includes(i)) return 'mine_other'
      if (revealed.includes(i)) return 'token'
      return 'hidden'
    }
    if (revealed.includes(i)) return 'token'
    return 'hidden'
  }

  async function start() {
    if (bet < 10 || bet > (user?.balance||0)) return
    setLoading(true); setErr('')
    try {
      const { data } = await axios.post('/api/games/mines', { action:'start', bet, minesCount:nMines })
      updateBalance(data.balance)
      setPhase('playing'); setRevealed([]); setMinePos([]); setHitCell(null); setMult(1); setPayout(0); setOutcome(null)
    } catch(e) { setErr(e.response?.data?.error || 'Erreur') }
    setLoading(false)
  }

  async function reveal(idx) {
    if (phase !== 'playing' || loading || revealed.includes(idx)) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/games/mines', { action:'reveal', cellIndex:idx })
      if (data.status === 'exploded') {
        setHitCell(idx); setRevealed(p=>[...p,idx]); setMinePos(data.mines||[])
        setPhase('done'); setMult(0); setPayout(0); setOutcome('lose')
        setHistory(h=>[{lose:true,bet},...h].slice(0,8))
      } else {
        setRevealed(p=>[...p,idx]); setMult(data.multiplier); setPayout(data.payout)
        if (data.status === 'won') {
          setMinePos(data.mines||[]); setPhase('done'); setOutcome('win')
          updateBalance(data.balance)
          setHistory(h=>[{lose:false,payout:data.payout},...h].slice(0,8))
        }
      }
    } catch(e) { setErr(e.response?.data?.error || 'Erreur') }
    setLoading(false)
  }

  async function cashout() {
    if (phase !== 'playing' || !revealed.length || loading) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/games/mines', { action:'cashout' })
      setMinePos(data.mines||[]); setPhase('done'); setOutcome('cashout')
      setMult(data.multiplier); setPayout(data.payout)
      updateBalance(data.balance)
      setHistory(h=>[{lose:false,payout:data.payout},...h].slice(0,8))
    } catch(e) { setErr(e.response?.data?.error || 'Erreur') }
    setLoading(false)
  }

  const playing = phase === 'playing'
  const canCashout = playing && revealed.length > 0 && !loading
  const firstMult = parseFloat(((25/(25-nMines))*0.92).toFixed(2))

  return (
    <div className="game-page">
      <div className="game-breadcrumb">
        <Link to="/machines" className="breadcrumb-link">← Machines</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">💣 Mines</span>
      </div>

      <div className="game-body">
        {/* ── Contrôles ── */}
        <div className="game-controls-panel">
          <div className="card">
            {phase === 'idle' || phase === 'done' ? (
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading} />
                <hr className="sep" />
                <div className="field-label">Voltorbe (mines)</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <input type="range" min={1} max={24} value={nMines} onChange={e=>setNMines(parseInt(e.target.value))} style={{ flex:1, accentColor:'#ef4444' }} disabled={loading} />
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:16, fontWeight:700, color:'#ef4444', minWidth:28, textAlign:'right' }}>{nMines}</div>
                </div>
                <div style={{ padding:'7px 10px', background:'rgba(109,40,217,.06)', border:'1px solid rgba(109,40,217,.12)', borderRadius:7, display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:11, color:'#5b3fa0', fontFamily:'Rajdhani,sans-serif' }}>1ère case sûre</span>
                  <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, color:'#fbbf24', fontWeight:700 }}>×{firstMult}</span>
                </div>
                {err && <div style={{ marginBottom:8, padding:'7px 10px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:7, fontSize:11, color:'#f87171', fontFamily:'Exo 2,sans-serif' }}>⚠ {err}</div>}
                <button className="btn btn-gold btn-xl" onClick={start} disabled={loading || bet<10 || bet>(user?.balance||0)}>
                  {loading ? '⏳ DÉMARRAGE…' : phase === 'done' ? '↺ REJOUER' : '💣 COMMENCER'}
                </button>
              </>
            ) : (
              <>
                {/* En cours */}
                <div className="mult-display">
                  <div className="mult-lbl">Multiplicateur</div>
                  <div className="mult-val">×{mult}</div>
                  {revealed.length > 0 && <div className="mult-payout">+{payout.toLocaleString('fr-FR')} ✦</div>}
                </div>
                <div style={{ fontSize:11, color:'#5b3fa0', textAlign:'center', marginBottom:8, fontFamily:'Exo 2,sans-serif' }}>
                  Mise : <span style={{ color:'#fbbf24', fontFamily:'Orbitron,monospace', fontWeight:700 }}>{bet.toLocaleString('fr-FR')}</span> · <span style={{ color:'#ef4444' }}>{nMines} 💣</span>
                </div>
                <button
                  className={`btn btn-xl${canCashout ? ' btn-win' : ' btn-ghost'}`}
                  style={{ marginBottom:6 }}
                  onClick={cashout}
                  disabled={!canCashout}
                >
                  {revealed.length === 0 ? 'Retourne une case…' : `💰 ENCAISSER ${payout.toLocaleString('fr-FR')} ✦`}
                </button>
                {err && <div style={{ fontSize:11, color:'#f87171', padding:'6px 10px', background:'rgba(239,68,68,.08)', borderRadius:7, fontFamily:'Exo 2,sans-serif' }}>⚠ {err}</div>}
              </>
            )}
          </div>

          {/* Résultat */}
          {outcome && (
            <div className={`game-result${outcome==='lose'?' lose':' win'} anim-scale`} key={outcome+payout}>
              <div className={`result-label${outcome==='lose'?' lose':' win'}`}>
                {outcome==='lose' ? '💥 Voltorbe !' : outcome==='won' ? '🏆 Complet !' : '✅ Encaissé !'}
              </div>
              <div className={outcome==='lose' ? 'result-lose-amt' : 'result-win-amt'}>
                {outcome==='lose' ? `−${bet.toLocaleString('fr-FR')}` : `+${payout.toLocaleString('fr-FR')}`}
              </div>
              {outcome !== 'lose' && <div className="result-mult">×{mult} · {revealed.length} case{revealed.length>1?'s':''}</div>}
            </div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {history.map((h,i) => (
                <div key={i} className={`chip${h.lose?' chip-lose':' chip-win'}`}>
                  {h.lose ? `−${bet.toLocaleString('fr-FR')}` : `+${h.payout?.toLocaleString('fr-FR')}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Grille ── */}
        <div className="game-arena-panel">
          <div style={{ textAlign:'center', marginBottom:10 }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:18, fontWeight:900, color:'#10b981', letterSpacing:4 }}>MINES</div>
            <div style={{ fontSize:11, color:'#5b3fa0', fontFamily:'Rajdhani,sans-serif' }}>Grille 5×5 · Évite les Voltorbe · Encaisse quand tu veux</div>
          </div>

          <div className="mines-grid" style={{ flex:1 }}>
            {Array.from({length:25},(_,i) => (
              <Cell
                key={i} idx={i} state={cellState(i)}
                onClick={reveal}
                disabled={phase !== 'playing' || loading}
              />
            ))}
          </div>

          {playing && revealed.length > 0 && (
            <div style={{ marginTop:10, textAlign:'center' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:14, padding:'8px 20px', background:'rgba(251,191,36,.06)', border:'1px solid rgba(251,191,36,.2)', borderRadius:10 }}>
                <span style={{ fontSize:12, color:'#5b3fa0', fontFamily:'Exo 2,sans-serif' }}>{revealed.length} case{revealed.length>1?'s':''}</span>
                <span style={{ fontFamily:'Orbitron,monospace', fontSize:22, fontWeight:900, color:'#fbbf24' }}>×{mult}</span>
                <span style={{ fontFamily:'Orbitron,monospace', fontSize:16, fontWeight:700, color:'#10b981' }}>{payout.toLocaleString('fr-FR')} ✦</span>
              </div>
            </div>
          )}

          {phase === 'idle' && (
            <div style={{ textAlign:'center', color:'#5b3fa0', fontSize:13, fontFamily:'Exo 2,sans-serif', marginTop:10 }}>
              Configure ta mise et appuie sur Commencer !
            </div>
          )}
        </div>

        {/* ── Règles ── */}
        <div className="game-rules-panel">
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'#5b3fa0', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
            Comment jouer
          </div>
          {[
            { icon:'🪙', title:'Retourne des cases', desc:'pour trouver des jetons' },
            { icon:'💰', title:'Encaisse quand tu veux', desc:'le gain est sécurisé' },
            { icon:'💥', title:'Un Voltorbe touché', desc:'= tout est perdu' },
            { icon:'📈', title:'Plus de mines', desc:'= meilleur multiplicateur' },
            { icon:'🏆', title:'Toutes les cases sûres', desc:'= victoire totale' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'7px 0', borderBottom:'1px solid rgba(109,40,217,.08)' }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
              <div>
                <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:12, fontWeight:700, color:'#c4b5fd', marginBottom:2 }}>{title}</div>
                <div style={{ fontFamily:'Exo 2,sans-serif', fontSize:10, color:'#5b3fa0', lineHeight:1.4 }}>{desc}</div>
              </div>
            </div>
          ))}

          <hr className="sep" />
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'#5b3fa0', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
            Multiplicateurs
          </div>
          {[1,3,5,10,15,20].map(m => {
            const calcMult = (n) => parseFloat((Math.pow(25/(25-n), m > 20 ? 20 : m) * 0.92).toFixed(2))
            return (
              <div key={m} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'4px 0', borderBottom:'1px solid rgba(109,40,217,.06)' }}>
                <span style={{ color:'#5b3fa0', fontFamily:'Rajdhani,sans-serif' }}>{m} mines, {m} cases</span>
                <span style={{ fontFamily:'Orbitron,monospace', color:'#fbbf24', fontWeight:700, fontSize:10 }}>×{calcMult(m)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
