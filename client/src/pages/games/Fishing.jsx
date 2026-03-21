import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C = {
  bg:'#04080f', surf:'#080f1a', border:'#0d2035',
  gold:'#f0b429', green:'#22c55e', red:'#ef4444',
  txt:'#e2e2f0', muted:'#44556a', dim:'#060d15',
  water:'#0a4a6e', waterLight:'#1a7aae', waterDark:'#052030',
  blue:'#38bdf8', teal:'#2dd4bf',
}

const SPRITE     = dex  => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const SPRITE_SH  = dex  => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${dex}.png`

const RARITY_GLOW = {
  trash:     '#6b728060',
  common:    '#6890f080',
  uncommon:  '#78c85080',
  rare:      '#f8588880',
  epic:      '#a855f7cc',
  legendary: '#f0b429cc',
  shiny:     '#ff80ffcc',
}

// Points d'eau — positions relatives dans le canvas (5 spots)
const WATER_SPOTS = [
  { x: 12, label: 'A' },
  { x: 28, label: 'B' },
  { x: 50, label: 'C' },
  { x: 72, label: 'D' },
  { x: 88, label: 'E' },
]

// ── Composant point d'eau animé ───────────────────────────────────────────────
function WaterSpot({ spot, active, phase, result, bet, index }) {
  const [ripple, setRipple] = useState(false)

  useEffect(() => {
    if (phase === 'bite') {
      setTimeout(() => setRipple(true), index * 150)
      setTimeout(() => setRipple(false), index * 150 + 800)
    }
  }, [phase])

  const isTrash    = result?.isTrash
  const isShiny    = result?.isShiny
  const glowColor  = result ? RARITY_GLOW[result.id] || '#ffffff20' : 'transparent'
  const payout     = result ? Math.floor(bet * result.multiplier) : 0

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1,
    }}>
      {/* Résultat flottant au-dessus */}
      {result && phase === 'reveal' && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'floatUp .5s cubic-bezier(.34,1.56,.64,1)',
        }}>
          {/* Sprite Pokémon */}
          <div style={{
            width: 72, height: 72,
            background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isShiny ? 'shinePulse 1s ease-in-out infinite alternate' : 'none',
          }}>
            <img
              src={isShiny ? SPRITE_SH(result.dex) : SPRITE(result.dex)}
              alt={result.label}
              style={{
                width: 64, height: 64,
                imageRendering: 'pixelated',
                filter: isTrash
                  ? 'grayscale(.8) brightness(.6)'
                  : isShiny
                    ? `drop-shadow(0 0 8px #ff80ff) drop-shadow(0 0 16px #ff40ff) brightness(1.2)`
                    : result.id === 'legendary'
                      ? `drop-shadow(0 0 10px #f0b429) brightness(1.15)`
                      : result.id === 'epic'
                        ? `drop-shadow(0 0 8px #a855f7) brightness(1.1)`
                        : 'brightness(1.05)',
                animation: isShiny ? 'none' : result.id === 'legendary' ? 'legendFloat 1.5s ease-in-out infinite alternate' : 'none',
              }}
            />
          </div>

          {/* Nom + rareté */}
          <div style={{
            fontSize: 11, fontWeight: 800, color: result.rarityColor,
            textShadow: `0 0 8px ${result.rarityColor}`,
            textAlign: 'center', whiteSpace: 'nowrap',
          }}>
            {isShiny && '✨ '}{result.label}
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{result.rarity}</div>

          {/* Payout */}
          <div style={{
            marginTop: 4, fontSize: 14, fontWeight: 900,
            color: payout > 0 ? C.green : C.red,
            textShadow: payout > 0 ? `0 0 10px ${C.green}80` : 'none',
          }}>
            {payout > 0 ? `+${payout.toLocaleString('fr-FR')}` : '−' + bet.toLocaleString('fr-FR')}
          </div>
        </div>
      )}

      {/* Ligne de pêche */}
      {active && phase !== 'idle' && phase !== 'reveal' && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%',
          width: 1, height: phase === 'cast' ? 40 : phase === 'wait' ? 60 : 50,
          background: phase === 'bite' ? C.gold : '#aaaaaa80',
          transform: 'translateX(-50%)',
          transition: 'height .4s ease, background .2s',
          transformOrigin: 'top',
        }} />
      )}

      {/* Point d'eau */}
      <div style={{
        width: '100%', height: 56,
        background: active
          ? `linear-gradient(180deg, ${C.waterLight}80, ${C.water})`
          : `linear-gradient(180deg, ${C.waterDark}60, ${C.waterDark})`,
        borderRadius: 12,
        border: `1px solid ${active ? C.blue + '60' : C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        transition: 'all .3s',
        boxShadow: active ? `0 0 20px ${C.blue}30` : 'none',
        cursor: 'default',
      }}>
        {/* Ondulations */}
        {(active || ripple) && (
          <>
            <div style={{
              position: 'absolute', width: '60%', height: 2,
              background: `${C.blue}40`, borderRadius: 2,
              top: '35%',
              animation: 'waterWave 2s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', width: '40%', height: 2,
              background: `${C.blue}30`, borderRadius: 2,
              top: '55%',
              animation: 'waterWave 2.5s ease-in-out infinite .4s',
            }} />
          </>
        )}

        {/* Flotteur si en attente */}
        {active && phase === 'wait' && (
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: C.red, border: '2px solid #fff',
            boxShadow: `0 0 8px ${C.red}80`,
            animation: 'bobFloat 0.8s ease-in-out infinite alternate',
          }} />
        )}

        {/* Splash si touche */}
        {active && phase === 'bite' && (
          <div style={{
            fontSize: 20,
            animation: 'splashPop .3s cubic-bezier(.34,1.56,.64,1)',
          }}>💦</div>
        )}

        {/* Label spot */}
        <div style={{
          position: 'absolute', bottom: 4,
          fontSize: 9, color: active ? C.blue + 'aa' : C.muted,
          fontWeight: 700,
        }}>
          {spot.label}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Fishing() {
  const { user, updateBalance } = useAuth()

  const [bet,     setBet]     = useState(100)
  const [lines,   setLines]   = useState(1)      // 1, 2 ou 3
  const [phase,   setPhase]   = useState('idle') // idle | cast | wait | bite | reveal
  const [results, setResults] = useState([])     // résultats par ligne
  const [activeSpots, setActiveSpots] = useState([]) // indices des spots actifs
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')
  const [history, setHistory] = useState([])
  const [stats,   setStats]   = useState({ casts: 0, totalPayout: 0, totalBet: 0 })

  // Choisir des spots aléatoires parmi les 5
  function pickSpots(n) {
    const shuffled = [...WATER_SPOTS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, n).map(s => WATER_SPOTS.indexOf(s))
  }

  async function cast() {
    if (loading || !user) return
    const totalBet = bet * lines
    if (totalBet > (user?.balance || 0)) return

    setLoading(true); setErr(''); setResults([]); setPhase('idle')

    // Choisir les spots
    const spots = pickSpots(lines)
    setActiveSpots(spots)

    // Animation : lancer
    setPhase('cast')
    await sleep(400)

    // Animation : attente
    setPhase('wait')
    await sleep(1200)

    // Appel API
    let data
    try {
      const res = await axios.post('/api/fishing/cast', { bet, lines })
      data = res.data
    } catch (e) {
      setErr(e.response?.data?.error || 'Erreur réseau')
      setPhase('idle'); setActiveSpots([]); setLoading(false)
      return
    }

    // Animation : touche !
    setPhase('bite')
    await sleep(600)

    // Révélation
    setResults(data.lines)
    setPhase('reveal')
    updateBalance(data.balance)

    setStats(s => ({
      casts:       s.casts + 1,
      totalBet:    s.totalBet + data.totalBet,
      totalPayout: s.totalPayout + data.totalPayout,
    }))

    setHistory(h => [data, ...h].slice(0, 8))
    setLoading(false)
  }

  function reset() {
    setPhase('idle'); setResults([]); setActiveSpots([])
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const totalBet = bet * lines
  const canCast  = !loading && user && totalBet <= (user?.balance || 0)

  // Meilleur résultat de la session
  const bestResult = results.length > 0
    ? results.reduce((best, r) => r.multiplier > best.multiplier ? r : best, results[0])
    : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/casino" style={{ fontSize: 11, color: C.muted, textDecoration: 'none' }}>← Lobby</Link>
        <span style={{ color: C.dim }}>/</span>
        <span style={{ fontSize: 13, color: C.blue, fontWeight: 700 }}>🎣 Shiny Hunt</span>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'start', flex: 1 }}>

        {/* ── GAUCHE — Contrôles ── */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Mise + lignes */}
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
            <BetInput bet={bet} setBet={setBet} disabled={loading} />

            {/* Nombre de lignes */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Lignes simultanées
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => !loading && setLines(n)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                    border: `2px solid ${lines === n ? C.blue : C.border}`,
                    background: lines === n ? `${C.blue}20` : 'transparent',
                    color: lines === n ? C.blue : C.muted,
                    transition: 'all .15s',
                  }}>
                    {n}×
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textAlign: 'center' }}>
                Total : <span style={{ color: totalBet > (user?.balance || 0) ? C.red : C.txt, fontWeight: 700 }}>
                  {totalBet.toLocaleString('fr-FR')} jetons
                </span>
              </div>
            </div>

            {err && (
              <div style={{ marginTop: 8, fontSize: 11, color: C.red, background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 8, padding: '7px 10px' }}>
                ⚠ {err}
              </div>
            )}

            <button
              onClick={phase === 'idle' ? cast : reset}
              disabled={phase === 'idle' ? !canCast : loading}
              style={{
                width: '100%', marginTop: 14, padding: '14px',
                background: loading ? C.dim : phase !== 'idle' ? `${C.blue}15` : C.blue,
                color: loading ? C.muted : phase !== 'idle' ? C.blue : '#04080f',
                fontWeight: 900, fontSize: 15, borderRadius: 10,
                border: phase !== 'idle' ? `1px solid ${C.blue}40` : 'none',
                cursor: (!canCast && phase === 'idle') || loading ? 'not-allowed' : 'pointer',
                boxShadow: canCast && phase === 'idle' ? `0 0 20px ${C.blue}50` : 'none',
                transition: 'all .2s', letterSpacing: 0.5,
              }}
            >
              {loading
                ? phase === 'cast' ? '🎣 Lancer…'
                : phase === 'wait' ? '⏳ En attente…'
                : phase === 'bite' ? '💦 Touche !'
                : '⏳…'
                : phase === 'reveal' ? '🔄 Relancer'
                : '🎣 Lancer !'}
            </button>
          </div>

          {/* Résultat session */}
          {results.length > 0 && phase === 'reveal' && (
            <div style={{
              background: C.surf, border: `1px solid ${bestResult?.multiplier > 1 ? C.green + '40' : C.border}`,
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Ce lancer
              </div>
              {results.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0', borderBottom: `1px solid ${C.dim}`, fontSize: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={r.isShiny ? SPRITE_SH(r.dex) : SPRITE(r.dex)} alt="" style={{ width: 22, height: 22, imageRendering: 'pixelated' }} />
                    <span style={{ color: r.rarityColor, fontWeight: 700, fontSize: 11 }}>{r.label}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: r.payout > 0 ? C.green : C.red }}>
                    {r.payout > 0 ? `+${r.payout.toLocaleString('fr-FR')}` : `−${bet.toLocaleString('fr-FR')}`}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, fontWeight: 900 }}>
                <span style={{ color: C.muted }}>Total</span>
                <span style={{ color: results.reduce((s, r) => s + r.payout, 0) > 0 ? C.green : C.red }}>
                  {results.reduce((s, r) => s + r.payout, 0) > 0
                    ? `+${results.reduce((s, r) => s + r.payout, 0).toLocaleString('fr-FR')}`
                    : `−${totalBet.toLocaleString('fr-FR')}`}
                </span>
              </div>
            </div>
          )}

          {/* Stats session */}
          {stats.casts > 0 && (
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Session</div>
              {[
                ['Lancers', stats.casts, C.txt],
                ['Misé', stats.totalBet.toLocaleString('fr-FR'), C.muted],
                ['P&L', `${stats.totalPayout - stats.totalBet >= 0 ? '+' : ''}${(stats.totalPayout - stats.totalBet).toLocaleString('fr-FR')}`, stats.totalPayout >= stats.totalBet ? C.green : C.red],
              ].map(([l, v, col]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ fontWeight: 700, color: col }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CENTRE — Zone de pêche ── */}
        <div style={{
          flex: 1, background: C.surf, border: `1px solid ${C.border}`,
          borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
          minHeight: 420,
        }}>
          {/* Titre */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.blue, letterSpacing: 3, textShadow: `0 0 30px ${C.blue}60` }}>
              SHINY HUNT
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              Pêche Pokémon · {lines} ligne{lines > 1 ? 's' : ''} · 5 points d'eau
            </div>
          </div>

          {/* Zone eau + lignes */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 0 }}>

            {/* Résultats flottants + spots d'eau */}
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              padding: '0 8px',
              paddingTop: results.length > 0 && phase === 'reveal' ? 100 : 20,
              transition: 'padding .3s',
            }}>
              {WATER_SPOTS.map((spot, i) => {
                const spotIdx = activeSpots.indexOf(i)
                const isActive = spotIdx !== -1
                const result   = isActive && results[spotIdx] ? results[spotIdx] : null
                return (
                  <WaterSpot
                    key={i}
                    spot={spot}
                    active={isActive}
                    phase={isActive ? phase : 'idle'}
                    result={result}
                    bet={bet}
                    index={spotIdx}
                  />
                )
              })}
            </div>

            {/* Fond de l'eau */}
            <div style={{
              height: 40, marginTop: 8,
              background: `linear-gradient(180deg, ${C.waterDark}, ${C.bg})`,
              borderRadius: '0 0 12px 12px',
              borderTop: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 10, color: C.muted }}>
                {phase === 'idle' && '🎣 Choisis ta mise et lance !'}
                {phase === 'cast' && '🎣 Lignes en cours de lancer…'}
                {phase === 'wait' && '⏳ En attente d\'une touche…'}
                {phase === 'bite' && '💦 Touche ! Remontez !'}
                {phase === 'reveal' && '✅ Prise terminée — relance quand tu veux !'}
              </div>
            </div>
          </div>
        </div>

        {/* ── DROITE — Table des gains ── */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Pokémon pêchables
            </div>
            {[
              { id:'trash',     label:'Vieille Chaussure', rarity:'Déchet',      color:'#6b7280', prob:'35.2%', multi:'×0',   dex:568,  shiny:false },
              { id:'common',    label:'Magicarpe',         rarity:'Commun',      color:'#6890f0', prob:'30%',   multi:'×1.8', dex:129,  shiny:false },
              { id:'uncommon',  label:'Poissoroy',         rarity:'Peu commun',  color:'#78c850', prob:'18%',   multi:'×3',   dex:119,  shiny:false },
              { id:'rare',      label:'Clamiral',          rarity:'Rare',        color:'#f85888', prob:'10%',   multi:'×6',   dex:91,   shiny:false },
              { id:'epic',      label:'Léviator',          rarity:'Épique',      color:'#a855f7', prob:'5%',    multi:'×15',  dex:130,  shiny:false },
              { id:'legendary', label:'Kyogre',            rarity:'Légendaire',  color:'#f0b429', prob:'1.5%',  multi:'×30',  dex:382,  shiny:false },
              { id:'shiny',     label:'Shiny ✨',          rarity:'Shiny',       color:'#ff80ff', prob:'0.3%',  multi:'×75',  dex:129,  shiny:true  },
            ].map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 0', borderBottom: `1px solid ${C.dim}`,
              }}>
                <img
                  src={r.shiny ? SPRITE_SH(r.dex) : SPRITE(r.dex)}
                  alt=""
                  style={{
                    width: 24, height: 24, imageRendering: 'pixelated', flexShrink: 0,
                    filter: r.id === 'trash' ? 'grayscale(.8) brightness(.5)' : r.id === 'shiny' ? 'drop-shadow(0 0 4px #ff80ff)' : 'none',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: r.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted }}>{r.prob}</div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 900, color: r.multi === '×0' ? C.red : r.color,
                  fontFamily: 'monospace', flexShrink: 0,
                }}>
                  {r.multi}
                </div>
              </div>
            ))}
          </div>

          {/* Règles */}
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Règles
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.9 }}>
              <div>🎣 Lance 1, 2 ou 3 lignes</div>
              <div>🎯 Chaque ligne = <span style={{ color: C.txt }}>1 mise</span></div>
              <div>🌊 5 spots d'eau aléatoires</div>
              <div>✨ Shiny = sprite coloré unique</div>
              <div>🗑️ Vieille chaussure = perte</div>
            </div>
          </div>
        </div>
      </div>

      <LiveFeed />

      <style>{`
        @keyframes waterWave {
          0%,100% { transform: translateX(-10%) scaleX(.8); opacity:.4; }
          50%      { transform: translateX(10%)  scaleX(1.1); opacity:.7; }
        }
        @keyframes bobFloat {
          from { transform: translateY(0px); }
          to   { transform: translateY(-5px); }
        }
        @keyframes splashPop {
          from { transform: scale(.5); opacity:0; }
          to   { transform: scale(1.2); opacity:1; }
        }
        @keyframes floatUp {
          from { transform: translateX(-50%) translateY(20px); opacity:0; }
          to   { transform: translateX(-50%) translateY(0);    opacity:1; }
        }
        @keyframes shinePulse {
          from { filter: drop-shadow(0 0 6px #ff80ff) drop-shadow(0 0 12px #ff40ff) brightness(1.1); }
          to   { filter: drop-shadow(0 0 16px #ff80ff) drop-shadow(0 0 30px #ff80ff) brightness(1.4); }
        }
        @keyframes legendFloat {
          from { transform: translateY(0px); filter: drop-shadow(0 0 8px #f0b429); }
          to   { transform: translateY(-4px); filter: drop-shadow(0 0 16px #f0b429cc); }
        }
      `}</style>
    </div>
  )
}
