import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const C = {
  bg: '#06060f', surf: '#0c0c1e', border: '#1e1e3a',
  gold: '#f0b429', green: '#22c55e', txt: '#e2e2f0',
  muted: '#44446a', dim: '#12121f',
}

// Segments avec couleurs et raretés
const SEGMENTS = [
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '100 jetons',    value: 100,   color: '#78c850', rarity: 'Commun',     rarityColor: '#78c850' },
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '200 jetons',    value: 200,   color: '#f0b429', rarity: 'Peu commun', rarityColor: '#f0b429' },
  { label: '100 jetons',    value: 100,   color: '#78c850', rarity: 'Commun',     rarityColor: '#78c850' },
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '500 jetons',    value: 500,   color: '#f85888', rarity: 'Rare',       rarityColor: '#f85888' },
  { label: '100 jetons',    value: 100,   color: '#78c850', rarity: 'Commun',     rarityColor: '#78c850' },
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '200 jetons',    value: 200,   color: '#f0b429', rarity: 'Peu commun', rarityColor: '#f0b429' },
  { label: '1 000 jetons',  value: 1000,  color: '#a855f7', rarity: 'Épique',     rarityColor: '#a855f7' },
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '100 jetons',    value: 100,   color: '#78c850', rarity: 'Commun',     rarityColor: '#78c850' },
  { label: '2 000 jetons',  value: 2000,  color: '#f0b429', rarity: 'Épique',     rarityColor: '#f0c040' },
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '500 jetons',    value: 500,   color: '#f85888', rarity: 'Rare',       rarityColor: '#f85888' },
  { label: '100 jetons',    value: 100,   color: '#78c850', rarity: 'Commun',     rarityColor: '#78c850' },
  { label: '10 000 jetons', value: 10000, color: '#ff4444', rarity: 'Légendaire', rarityColor: '#ff4444' },
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '200 jetons',    value: 200,   color: '#f0b429', rarity: 'Peu commun', rarityColor: '#f0b429' },
  { label: '5 000 jetons',  value: 5000,  color: '#f0c040', rarity: 'Très rare',  rarityColor: '#f0c040' },
  { label: '100 jetons',    value: 100,   color: '#78c850', rarity: 'Commun',     rarityColor: '#78c850' },
  { label: '50 jetons',     value: 50,    color: '#6890f0', rarity: 'Commun',     rarityColor: '#6890f0' },
  { label: '1 000 jetons',  value: 1000,  color: '#a855f7', rarity: 'Épique',     rarityColor: '#a855f7' },
]

const ITEM_W  = 120  // largeur d'un segment en px
const ITEM_GAP = 6   // gap entre segments
const ITEM_FULL = ITEM_W + ITEM_GAP
const VISIBLE   = 7  // nb de segments visibles (impair pour avoir un centre)
const STRIP_W   = VISIBLE * ITEM_FULL

// Générer une longue bande de segments (répétés pour l'animation)
function buildStrip(winIndex, segList) {
  // On crée ~60 items, le segment gagnant atterrit à l'index ~50
  const PRE  = 45
  const strip = []
  for (let i = 0; i < PRE; i++) {
    strip.push({ ...segList[i % segList.length], _idx: i })
  }
  // Insérer le gagnant à la position cible
  strip.push({ ...segList[winIndex], _idx: PRE, _winner: true })
  // Quelques items après
  for (let i = 0; i < 10; i++) {
    strip.push({ ...segList[(PRE + i + 1) % segList.length], _idx: PRE + 1 + i })
  }
  return strip
}

export default function RoueDuJour() {
  const { user, updateBalance } = useAuth()

  const [status,   setStatus]   = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [result,   setResult]   = useState(null)
  const [err,      setErr]      = useState('')
  const [offset,   setOffset]   = useState(0)       // translateX courant
  const [strip,    setStrip]    = useState(() => SEGMENTS.map((s, i) => ({ ...s, _idx: i })))
  const [winnerIdx,setWinnerIdx]= useState(null)    // index dans strip du gagnant
  const [glowing,  setGlowing]  = useState(false)
  const rafRef    = useRef(null)
  const offsetRef = useRef(0)

  useEffect(() => {
    if (!user) return
    axios.get('/api/wheel').then(r => setStatus(r.data)).catch(() => {})
  }, [user])

  // Compte à rebours
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!status?.next_spin) { setCountdown(''); return }
    const update = () => {
      const diff = new Date(status.next_spin) - new Date()
      if (diff <= 0) { setCountdown('Disponible !'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [status?.next_spin])

  async function handleSpin() {
    if (!user || spinning || !status?.can_spin) return
    setSpinning(true)
    setResult(null)
    setErr('')
    setGlowing(false)
    setWinnerIdx(null)

    try {
      const { data } = await axios.post('/api/wheel/spin')
      const seg = data.segment

      // Trouver l'index du segment gagnant dans SEGMENTS
      const segIdx = SEGMENTS.findIndex(s => s.value === seg.value)
      const newStrip = buildStrip(segIdx >= 0 ? segIdx : 0, SEGMENTS)
      setStrip(newStrip)

      // L'item gagnant est à la position PRE = 45 dans newStrip
      const winPos    = 45
      // On veut que l'item gagnant soit centré dans la fenêtre
      // Le centre de la fenêtre = STRIP_W / 2
      // Position du centre de l'item gagnant dans le strip = winPos * ITEM_FULL + ITEM_W / 2
      const targetCenter = winPos * ITEM_FULL + ITEM_W / 2
      const centerOffset = STRIP_W / 2
      const targetX      = -(targetCenter - centerOffset)

      // On repart de 0 à chaque spin
      offsetRef.current = 0
      setOffset(0)

      const dur   = 5000
      const t0    = performance.now()

      // Ease-out cubique (comme CS:GO)
      const easeOut = t => 1 - Math.pow(1 - t, 4)

      const animate = now => {
        const p = Math.min((now - t0) / dur, 1)
        const x = targetX * easeOut(p)
        offsetRef.current = x
        setOffset(x)

        if (p < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setOffset(targetX)
          setWinnerIdx(winPos)
          setGlowing(true)
          setResult({ segment: seg, balance: data.balance, next_spin: data.next_spin })
          setStatus(s => ({ ...s, can_spin: false, next_spin: data.next_spin }))
          updateBalance(data.balance)
          setSpinning(false)
        }
      }

      // Petit délai pour que React re-render le strip avant l'animation
      setTimeout(() => {
        rafRef.current = requestAnimationFrame(animate)
      }, 50)

    } catch (e) {
      setErr(e.response?.data?.error || 'Erreur')
      setSpinning(false)
    }
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const canSpin = status?.can_spin && user && !spinning

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 28px', boxSizing: 'border-box' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link to="/casino" style={{ fontSize: 11, color: C.muted, textDecoration: 'none' }}>← Accueil</Link>
        <span style={{ color: C.dim }}>/</span>
        <span style={{ fontSize: 11, color: '#9898b8' }}>🎡 Roue du jour</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, maxWidth: 900 }}>

        {/* Zone principale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header */}
          <div style={{
            background: C.surf, border: `1px solid ${C.border}`,
            borderRadius: 18, padding: '22px 24px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.gold, letterSpacing: 3 }}>
                OUVERTURE DU JOUR
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                1 ouverture gratuite toutes les 24h
              </div>
            </div>

            {/* ── Bande CS:GO ── */}
            <div style={{ position: 'relative', margin: '0 auto', width: STRIP_W }}>

              {/* Flèche indicatrice (haut) */}
              <div style={{
                position: 'absolute', top: -12, left: '50%',
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `12px solid ${C.gold}`,
                zIndex: 10,
                filter: `drop-shadow(0 0 6px ${C.gold})`,
              }} />

              {/* Flèche indicatrice (bas) */}
              <div style={{
                position: 'absolute', bottom: -12, left: '50%',
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: `12px solid ${C.gold}`,
                zIndex: 10,
                filter: `drop-shadow(0 0 6px ${C.gold})`,
              }} />

              {/* Ligne centrale */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: '50%', transform: 'translateX(-50%)',
                width: ITEM_W + 4,
                border: `2px solid ${C.gold}`,
                borderRadius: 8,
                zIndex: 5,
                pointerEvents: 'none',
                boxShadow: `0 0 16px ${C.gold}50`,
              }} />

              {/* Fenêtre de défilement */}
              <div style={{
                width: STRIP_W,
                height: 160,
                overflow: 'hidden',
                borderRadius: 10,
                background: C.dim,
                border: `1px solid ${C.border}`,
                position: 'relative',
              }}>
                {/* Dégradés latéraux */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: 80,
                  background: `linear-gradient(90deg, ${C.dim}, transparent)`,
                  zIndex: 4, pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0, width: 80,
                  background: `linear-gradient(270deg, ${C.dim}, transparent)`,
                  zIndex: 4, pointerEvents: 'none',
                }} />

                {/* Strip animé */}
                <div style={{
                  display: 'flex',
                  gap: ITEM_GAP,
                  position: 'absolute',
                  top: 0, left: 0,
                  height: '100%',
                  transform: `translateX(${offset}px)`,
                  willChange: 'transform',
                }}>
                  {strip.map((seg, i) => {
                    const isWinner = winnerIdx !== null && i === winnerIdx
                    return (
                      <div key={i} style={{
                        width: ITEM_W,
                        height: '100%',
                        flexShrink: 0,
                        borderRadius: 8,
                        background: isWinner && glowing
                          ? `linear-gradient(180deg, ${seg.color}30, ${seg.color}15)`
                          : '#0a0a1e',
                        border: isWinner && glowing
                          ? `2px solid ${seg.color}`
                          : `1px solid ${C.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: isWinner ? 'border .3s, background .3s' : 'none',
                        boxShadow: isWinner && glowing ? `0 0 20px ${seg.color}50` : 'none',
                      }}>
                        {/* Icône colorée */}
                        <div style={{
                          width: 44, height: 44, borderRadius: 10,
                          background: `${seg.color}25`,
                          border: `2px solid ${seg.color}60`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}>
                          💎
                        </div>
                        {/* Valeur */}
                        <div style={{
                          fontSize: seg.value >= 1000 ? 11 : 13,
                          fontWeight: 800,
                          color: seg.color,
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}>
                          {seg.label}
                        </div>
                        {/* Rareté */}
                        <div style={{
                          fontSize: 9,
                          color: seg.rarityColor,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          opacity: 0.8,
                        }}>
                          {seg.rarity}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Résultat */}
            {result && (
              <div style={{
                marginTop: 20,
                background: `${result.segment.color}10`,
                border: `1px solid ${result.segment.color}30`,
                borderRadius: 12, padding: '16px 20px', textAlign: 'center',
                animation: 'slideIn .4s ease',
              }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                  🎉 Félicitations ! Tu as gagné
                </div>
                <div style={{
                  fontSize: 36, fontWeight: 900,
                  color: result.segment.color,
                  fontFamily: 'monospace',
                  textShadow: `0 0 20px ${result.segment.color}80`,
                }}>
                  +{result.segment.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  jetons · {result.segment.rarity}
                </div>
              </div>
            )}

            {/* Bouton */}
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              style={{
                display: 'block', width: '100%', maxWidth: 360,
                margin: '20px auto 0',
                padding: '15px',
                background: canSpin
                  ? `linear-gradient(135deg, ${C.gold}, #fbbf24)`
                  : C.dim,
                color: canSpin ? '#06060f' : C.muted,
                fontWeight: 900, fontSize: 15, borderRadius: 12, border: 'none',
                cursor: canSpin ? 'pointer' : 'not-allowed',
                boxShadow: canSpin ? `0 0 24px ${C.gold}50` : 'none',
                transition: 'all .2s',
                letterSpacing: 1,
              }}
            >
              {!user
                ? 'Connecte-toi pour jouer'
                : spinning
                  ? '⏳ Ouverture en cours…'
                  : !status?.can_spin
                    ? `⏰ Reviens dans ${countdown}`
                    : '🎁 Ouvrir la caisse du jour !'}
            </button>

            {err && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#ef4444' }}>⚠ {err}</div>
            )}
          </div>
        </div>

        {/* Panneau droit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Stats joueur */}
          {status && user && (
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Mes stats
              </div>
              {[
                ['Total gagné',    `${(status.total_won ?? 0).toLocaleString()} jetons`],
                ['Ouvertures',     status.spins ?? 0],
                ['Prochain spin',  status.can_spin ? '✅ Disponible !' : countdown],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '7px 0', borderBottom: `1px solid ${C.dim}` }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ fontWeight: 700, color: C.txt }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gains possibles */}
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Gains possibles
            </div>
            {[
              { label: '50 jetons',     color: '#6890f0', rarity: 'Commun',     nb: 8 },
              { label: '100 jetons',    color: '#78c850', rarity: 'Commun',     nb: 6 },
              { label: '200 jetons',    color: '#f0b429', rarity: 'Peu commun', nb: 3 },
              { label: '500 jetons',    color: '#f85888', rarity: 'Rare',       nb: 2 },
              { label: '1 000 jetons',  color: '#a855f7', rarity: 'Épique',     nb: 2 },
              { label: '2 000 jetons',  color: '#f0c040', rarity: 'Épique',     nb: 1 },
              { label: '5 000 jetons',  color: '#f0c040', rarity: 'Très rare',  nb: 1 },
              { label: '10 000 jetons', color: '#ff4444', rarity: 'Légendaire', nb: 1 },
            ].map(seg => (
              <div key={seg.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: `1px solid ${C.dim}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.txt }}>{seg.label}</span>
                </div>
                <span style={{ fontSize: 10, color: seg.color, fontWeight: 600 }}>{seg.rarity}</span>
              </div>
            ))}
          </div>

          {/* Règles */}
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Règles
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.9 }}>
              <div>🎁 1 ouverture <span style={{ color: C.txt, fontWeight: 700 }}>totalement gratuite</span> par jour</div>
              <div>⏰ Disponible toutes les <span style={{ color: C.txt }}>24 heures</span></div>
              <div>💰 Minimum <span style={{ color: C.green, fontWeight: 700 }}>50 jetons</span> garanti</div>
              <div>🔥 Maximum <span style={{ color: '#ff4444', fontWeight: 700 }}>10 000 jetons</span> possible</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
