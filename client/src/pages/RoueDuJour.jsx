import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const C = { bg:'#06060f', surf:'#0c0c1e', border:'#1e1e3a', gold:'#f0b429', green:'#22c55e', txt:'#e2e2f0', muted:'#44446a', dim:'#12121f' }

// ── Segments avec raretés ─────────────────────────────────────────────────────
// La case mystère (❓) révèle au moment du résultat : 20k, 30k ou 50k (très rare)
const SEGMENTS = [
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'1 000 jetons',  value:1000,  color:'#78c850', rarity:'Commun',     icon:'💚' },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'2 000 jetons',  value:2000,  color:'#f0b429', rarity:'Peu commun', icon:'💛' },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'1 000 jetons',  value:1000,  color:'#78c850', rarity:'Commun',     icon:'💚' },
  { label:'3 000 jetons',  value:3000,  color:'#f85888', rarity:'Rare',       icon:'❤️' },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'1 000 jetons',  value:1000,  color:'#78c850', rarity:'Commun',     icon:'💚' },
  { label:'2 000 jetons',  value:2000,  color:'#f0b429', rarity:'Peu commun', icon:'💛' },
  { label:'5 000 jetons',  value:5000,  color:'#a855f7', rarity:'Épique',     icon:'💜' },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'1 000 jetons',  value:1000,  color:'#78c850', rarity:'Commun',     icon:'💚' },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'3 000 jetons',  value:3000,  color:'#f85888', rarity:'Rare',       icon:'❤️' },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'2 000 jetons',  value:2000,  color:'#f0b429', rarity:'Peu commun', icon:'💛' },
  { label:'10 000 jetons', value:10000, color:'#ff4444', rarity:'Légendaire', icon:'🔴' },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'1 000 jetons',  value:1000,  color:'#78c850', rarity:'Commun',     icon:'💚' },
  { label:'❓ Mystère',    value:-1,    color:'#ffd700', rarity:'Mystère ✨',  icon:'❓', mystery:true },
  { label:'500 jetons',    value:500,   color:'#6890f0', rarity:'Commun',     icon:'💙' },
  { label:'1 000 jetons',  value:1000,  color:'#78c850', rarity:'Commun',     icon:'💚' },
  { label:'5 000 jetons',  value:5000,  color:'#a855f7', rarity:'Épique',     icon:'💜' },
]

const ITEM_W    = 118
const ITEM_GAP  = 6
const ITEM_FULL = ITEM_W + ITEM_GAP
const VISIBLE   = 7
const STRIP_W   = VISIBLE * ITEM_FULL
const PRE_ITEMS = 46   // items avant le gagnant dans le strip

function buildStrip(winIndex) {
  const strip = []
  for (let i = 0; i < PRE_ITEMS; i++) strip.push({ ...SEGMENTS[i % SEGMENTS.length], _i: i })
  strip.push({ ...SEGMENTS[winIndex], _i: PRE_ITEMS, _winner: true })
  for (let i = 0; i < 12; i++) strip.push({ ...SEGMENTS[(PRE_ITEMS + i + 1) % SEGMENTS.length], _i: PRE_ITEMS + 1 + i })
  return strip
}

export default function RoueDuJour() {
  const { user, updateBalance } = useAuth()

  const [status,    setStatus]    = useState(null)
  const [spinning,  setSpinning]  = useState(false)
  const [result,    setResult]    = useState(null)    // { segment, balance, next_spin, mysteryValue? }
  const [err,       setErr]       = useState('')
  const [offset,    setOffset]    = useState(0)
  const [strip,     setStrip]     = useState(() => SEGMENTS.map((s, i) => ({ ...s, _i: i })))
  const [winnerIdx, setWinnerIdx] = useState(null)
  const [glowing,   setGlowing]   = useState(false)
  const [revealed,  setRevealed]  = useState(false)  // animation reveal mystère
  const rafRef = useRef(null)

  // Compte à rebours
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!status?.next_spin) { setCountdown(''); return }
    const upd = () => {
      const diff = new Date(status.next_spin) - new Date()
      if (diff <= 0) { setCountdown('Disponible !'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    upd(); const t = setInterval(upd, 1000); return () => clearInterval(t)
  }, [status?.next_spin])

  useEffect(() => {
    if (!user) return
    axios.get('/api/wheel').then(r => setStatus(r.data)).catch(() => {})
  }, [user])

  async function handleSpin() {
    if (!user || spinning || !status?.can_spin) return
    setSpinning(true); setResult(null); setErr(''); setGlowing(false); setWinnerIdx(null); setRevealed(false)
    try {
      const { data } = await axios.post('/api/wheel/spin')
      const seg = data.segment

      // Cas mystère : le serveur renvoie la vraie valeur dans data.mystery_value
      // Si le serveur ne supporte pas encore mystery_value, on la génère côté client
      let mysteryValue = null
      let displaySeg   = seg

      if (seg.mystery || seg.value === -1) {
        // Tirage mystère côté client si le serveur ne le fait pas
        mysteryValue = data.mystery_value || pickMysteryValue()
        displaySeg   = { ...seg, mysteryValue }
      }

      // Trouver index dans SEGMENTS — pour le mystère on cherche la case mystère
      let segIdx = SEGMENTS.findIndex(s => seg.mystery ? s.mystery : s.value === seg.value)
      if (segIdx < 0) segIdx = 0

      const newStrip = buildStrip(segIdx)
      setStrip(newStrip)

      // Calcul offset cible
      const targetCenter = PRE_ITEMS * ITEM_FULL + ITEM_W / 2
      const centerOffset = STRIP_W / 2
      const targetX      = -(targetCenter - centerOffset)

      setOffset(0)
      const t0  = performance.now()
      const dur = 5200
      const easeOut = t => 1 - Math.pow(1 - t, 4)

      const animate = now => {
        const p = Math.min((now - t0) / dur, 1)
        setOffset(targetX * easeOut(p))
        if (p < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setOffset(targetX)
          setWinnerIdx(PRE_ITEMS)
          setGlowing(true)
          setResult({ segment: displaySeg, balance: data.balance, next_spin: data.next_spin, mysteryValue })
          setStatus(s => ({ ...s, can_spin: false, next_spin: data.next_spin }))
          updateBalance(data.balance)
          setSpinning(false)
          // Délai avant révélation mystère
          if (seg.mystery || seg.value === -1) {
            setTimeout(() => setRevealed(true), 800)
          }
        }
      }
      setTimeout(() => { rafRef.current = requestAnimationFrame(animate) }, 60)
    } catch (e) {
      setErr(e.response?.data?.error || 'Erreur')
      setSpinning(false)
    }
  }

  function pickMysteryValue() {
    const r = Math.random()
    if (r < 0.005) return 50000  // 0.5% — ultra rare
    if (r < 0.05)  return 30000  // 4.5% — très rare
    return 20000                  // 95% du mystère
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const canSpin = status?.can_spin && user && !spinning

  // Couleur & texte du résultat selon si mystère révélé ou non
  const resultColor = result?.mysteryValue
    ? (result.mysteryValue >= 50000 ? '#ff4444' : result.mysteryValue >= 30000 ? '#a855f7' : '#f0b429')
    : result?.segment?.color
  const resultValue = result?.mysteryValue ?? result?.segment?.value

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 28px', boxSizing:'border-box' }}>

      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <Link to="/casino" style={{ fontSize:11, color:C.muted, textDecoration:'none' }}>← Accueil</Link>
        <span style={{ color:C.dim }}>/</span>
        <span style={{ fontSize:11, color:'#9898b8' }}>🎁 Caisse du jour</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, maxWidth:920 }}>

        {/* Zone principale */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:18, padding:'24px 24px 28px' }}>

            {/* Titre */}
            <div style={{ textAlign:'center', marginBottom:22 }}>
              <div style={{ fontSize:24, fontWeight:900, color:C.gold, letterSpacing:3, textShadow:`0 0 20px ${C.gold}60` }}>
                CAISSE DU JOUR
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>
                Une ouverture <span style={{ color:C.txt, fontWeight:700 }}>gratuite</span> toutes les 24h · min{' '}
                <span style={{ color:C.green, fontWeight:700 }}>500</span> jetons garantis
              </div>
            </div>

            {/* ── Strip CS:GO ── */}
            <div style={{ position:'relative', margin:'0 auto', width:STRIP_W }}>

              {/* Flèches */}
              <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderTop:`13px solid ${C.gold}`, zIndex:10, filter:`drop-shadow(0 0 8px ${C.gold})` }} />
              <div style={{ position:'absolute', bottom:-13, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderBottom:`13px solid ${C.gold}`, zIndex:10, filter:`drop-shadow(0 0 8px ${C.gold})` }} />

              {/* Encadré central */}
              <div style={{ position:'absolute', top:0, bottom:0, left:'50%', transform:'translateX(-50%)', width:ITEM_W+6, border:`2px solid ${C.gold}`, borderRadius:10, zIndex:5, pointerEvents:'none', boxShadow:`0 0 20px ${C.gold}45, inset 0 0 10px ${C.gold}10` }} />

              {/* Fenêtre */}
              <div style={{ width:STRIP_W, height:165, overflow:'hidden', borderRadius:12, background:C.dim, border:`1px solid ${C.border}`, position:'relative' }}>
                {/* Dégradés latéraux */}
                <div style={{ position:'absolute', top:0, left:0, bottom:0, width:90, background:`linear-gradient(90deg,${C.dim},transparent)`, zIndex:4, pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:0, right:0, bottom:0, width:90, background:`linear-gradient(270deg,${C.dim},transparent)`, zIndex:4, pointerEvents:'none' }} />

                {/* Bande animée */}
                <div style={{ display:'flex', gap:ITEM_GAP, position:'absolute', top:0, left:0, height:'100%', transform:`translateX(${offset}px)`, willChange:'transform' }}>
                  {strip.map((seg, i) => {
                    const isWin = winnerIdx !== null && i === winnerIdx
                    const isMystery = seg.mystery
                    return (
                      <div key={i} style={{
                        width:ITEM_W, height:'100%', flexShrink:0, borderRadius:8,
                        background: isWin && glowing ? `linear-gradient(180deg,${seg.color}35,${seg.color}15)` : '#08081a',
                        border: isWin && glowing ? `2px solid ${seg.color}` : `1px solid ${C.border}`,
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:7,
                        boxShadow: isWin && glowing ? `0 0 24px ${seg.color}55` : 'none',
                        transition: isWin ? 'all .4s' : 'none',
                        animation: isMystery && isWin && glowing ? 'mysteryPulse 1.2s ease-in-out infinite' : 'none',
                      }}>
                        {/* Icône */}
                        <div style={{
                          width:46, height:46, borderRadius:12,
                          background:`${seg.color}20`, border:`2px solid ${seg.color}50`,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
                        }}>
                          {isMystery && isWin && revealed ? '✨' : seg.icon}
                        </div>
                        {/* Label */}
                        <div style={{ fontSize: seg.value >= 5000 ? 10 : 12, fontWeight:800, color:seg.color, textAlign:'center', lineHeight:1.2, padding:'0 6px' }}>
                          {isMystery && isWin && revealed
                            ? `${result.mysteryValue?.toLocaleString('fr-FR')} jetons`
                            : seg.label}
                        </div>
                        {/* Rareté */}
                        <div style={{ fontSize:9, color:seg.color, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, opacity:0.75 }}>
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
                marginTop:22,
                background:`${resultColor}10`, border:`1px solid ${resultColor}30`,
                borderRadius:14, padding:'18px 22px', textAlign:'center',
                animation:'slideIn .4s ease',
              }}>
                {result.mysteryValue && !revealed ? (
                  <div style={{ fontSize:13, color:C.muted }}>⏳ Révélation en cours…</div>
                ) : (
                  <>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>
                      {result.mysteryValue ? '✨ La case mystère révèle…' : '🎉 Tu as gagné'}
                    </div>
                    <div style={{ fontSize:42, fontWeight:900, color:resultColor, fontFamily:'monospace', textShadow:`0 0 24px ${resultColor}80` }}>
                      +{resultValue?.toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>
                      jetons · {result.mysteryValue
                        ? (result.mysteryValue >= 50000 ? '🌟 ULTRA RARE' : result.mysteryValue >= 30000 ? '💜 Très rare' : '💛 Rare')
                        : result.segment.rarity}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bouton */}
            <button onClick={handleSpin} disabled={!canSpin} style={{
              display:'block', width:'100%', maxWidth:360, margin:'20px auto 0',
              padding:'15px', fontSize:15, fontWeight:900, border:'none', borderRadius:12,
              background: canSpin ? `linear-gradient(135deg,${C.gold},#fbbf24)` : C.dim,
              color: canSpin ? '#06060f' : C.muted,
              cursor: canSpin ? 'pointer' : 'not-allowed',
              boxShadow: canSpin ? `0 0 28px ${C.gold}55` : 'none',
              transition:'all .2s', letterSpacing:1,
            }}>
              {!user ? 'Connecte-toi pour jouer'
                : spinning ? '⏳ Ouverture en cours…'
                : !status?.can_spin ? `⏰ Reviens dans ${countdown}`
                : '🎁 Ouvrir la caisse du jour !'}
            </button>
            {err && <div style={{ textAlign:'center', marginTop:10, fontSize:11, color:'#ef4444' }}>⚠ {err}</div>}
          </div>
        </div>

        {/* Panneau droit */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Stats joueur */}
          {status && user && (
            <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Mes stats</div>
              {[
                ['Total gagné',   `${(status.total_won ?? 0).toLocaleString('fr-FR')} jetons`],
                ['Ouvertures',    status.spins ?? 0],
                ['Prochain spin', status.can_spin ? '✅ Disponible !' : countdown],
              ].map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'7px 0', borderBottom:`1px solid ${C.dim}` }}>
                  <span style={{ color:C.muted }}>{l}</span>
                  <span style={{ fontWeight:700, color:C.txt }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gains possibles */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Gains possibles</div>
            {[
              { label:'500 jetons',      color:'#6890f0', rarity:'Commun' },
              { label:'1 000 jetons',    color:'#78c850', rarity:'Commun' },
              { label:'2 000 jetons',    color:'#f0b429', rarity:'Peu commun' },
              { label:'3 000 jetons',    color:'#f85888', rarity:'Rare' },
              { label:'5 000 jetons',    color:'#a855f7', rarity:'Épique' },
              { label:'10 000 jetons',   color:'#ff4444', rarity:'Légendaire' },
              { label:'❓ Mystère',      color:'#ffd700', rarity:'Mystère ✨' },
              { label:'  → 20 000',      color:'#f0b429', rarity:'Rare' },
              { label:'  → 30 000',      color:'#a855f7', rarity:'Très rare' },
              { label:'  → 50 000',      color:'#ff4444', rarity:'Ultra rare 🌟' },
            ].map((seg, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${C.dim}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:9, height:9, borderRadius:2, background:seg.color, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:C.txt }}>{seg.label}</span>
                </div>
                <span style={{ fontSize:9, color:seg.color, fontWeight:600 }}>{seg.rarity}</span>
              </div>
            ))}
          </div>

          {/* Règles */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Règles</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.9 }}>
              <div>🎁 <span style={{ color:C.txt, fontWeight:700 }}>Gratuit</span> — 1 ouverture par jour</div>
              <div>⏰ Disponible toutes les <span style={{ color:C.txt }}>24 heures</span></div>
              <div>💚 Minimum garanti : <span style={{ color:C.green, fontWeight:700 }}>500 jetons</span></div>
              <div>🔴 Maximum standard : <span style={{ color:'#ff4444', fontWeight:700 }}>10 000 jetons</span></div>
              <div>✨ Case mystère : jusqu'à <span style={{ color:'#ffd700', fontWeight:700 }}>50 000 jetons</span> !</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mysteryPulse {
          0%,100% { box-shadow: 0 0 20px #ffd70070; }
          50%      { box-shadow: 0 0 40px #ffd700cc; }
        }
        @keyframes slideIn {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}
