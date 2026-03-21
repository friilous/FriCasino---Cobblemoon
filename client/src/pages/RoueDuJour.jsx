import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}

const SEGMENTS_FALLBACK = [
  { label:'50 jetons',    value:50,    color:'#6890f0' },
  { label:'100 jetons',   value:100,   color:'#78c850' },
  { label:'200 jetons',   value:200,   color:'#f0b429' },
  { label:'500 jetons',   value:500,   color:'#f85888' },
  { label:'1 000 jetons', value:1000,  color:'#a855f7' },
  { label:'2 000 jetons', value:2000,  color:'#f0b429' },
  { label:'5 000 jetons', value:5000,  color:'#f0c040' },
  { label:'10 000 jetons',value:10000, color:'#ff4444' },
]

const TOTAL = SEGMENTS_FALLBACK.length
const SLICE = (2 * Math.PI) / TOTAL

// ── Canvas roue ───────────────────────────────────────────────────────────────
function drawWheel(ctx, rotation, segments, winIdx) {
  const CW = ctx.canvas.width, CH = ctx.canvas.height
  const CX = CW / 2, CY = CH / 2, R = CW / 2 - 10

  ctx.clearRect(0, 0, CW, CH)

  // Fond
  ctx.fillStyle = '#05050e'
  ctx.beginPath(); ctx.arc(CX, CY, R + 12, 0, Math.PI * 2); ctx.fillStyle = '#05050e'; ctx.fill()

  ctx.save()
  ctx.translate(CX, CY)
  ctx.rotate(rotation)

  segments.forEach((seg, i) => {
    const a0 = SLICE * i - Math.PI / 2
    const a1 = a0 + SLICE
    const isWin = winIdx === i

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, R, a0, a1)
    ctx.closePath()
    ctx.fillStyle = isWin ? seg.color : seg.color + '60'
    if (isWin) { ctx.shadowColor = seg.color; ctx.shadowBlur = 24 }
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#06060f'; ctx.lineWidth = 2; ctx.stroke()

    // Texte
    const midA = a0 + SLICE / 2
    ctx.save()
    ctx.rotate(midA)
    ctx.translate(R * 0.65, 0)
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = isWin ? '#fff' : '#ffffffbb'
    ctx.font = `bold ${seg.value >= 1000 ? 10 : 12}px monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(seg.label, 0, 0)
    ctx.restore()
  })

  ctx.restore()

  // Hub central
  ctx.beginPath(); ctx.arc(CX, CY, 22, 0, Math.PI * 2)
  ctx.fillStyle = '#0c0c1e'; ctx.fill()
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.stroke()
  ctx.font = 'bold 16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.gold; ctx.fillText('🎡', CX, CY)

  // Flèche indicatrice (en haut)
  ctx.fillStyle = C.gold
  ctx.shadowColor = C.gold; ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(CX, CY - R - 6)
  ctx.lineTo(CX - 8, CY - R + 12)
  ctx.lineTo(CX + 8, CY - R + 12)
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
}

export default function RoueDuJour() {
  const { user, updateBalance } = useAuth()
  const cvs = useRef(null)

  const [status,   setStatus]   = useState(null)  // { can_spin, next_spin, segments }
  const [spinning, setSpinning] = useState(false)
  const [result,   setResult]   = useState(null)
  const [err,      setErr]      = useState('')
  const [rotation, setRotation] = useState(0)
  const [winIdx,   setWinIdx]   = useState(null)
  const rafRef = useRef(null)

  const segments = status?.segments || SEGMENTS_FALLBACK

  useEffect(() => {
    if (!user) return
    axios.get('/api/wheel').then(r => setStatus(r.data)).catch(() => {})
  }, [user])

  // Dessiner la roue
  useEffect(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawWheel(ctx, rotation, segments, result ? winIdx : null)
  }, [rotation, winIdx, segments, result])

  // Compte à rebours prochain spin
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
    update(); const t = setInterval(update, 1000); return () => clearInterval(t)
  }, [status?.next_spin])

  async function handleSpin() {
    if (!user || spinning || !status?.can_spin) return
    setSpinning(true); setResult(null); setErr(''); setWinIdx(null)
    try {
      const { data } = await axios.post('/api/wheel/spin')
      const seg = data.segment

      // Trouver l'index du segment gagné
      const idx = segments.findIndex(s => s.value === seg.value)

      // Calculer la rotation cible : le segment gagné doit finir en haut (à -π/2)
      // La flèche est en haut. Pour que seg[idx] soit en haut :
      // On veut que rotation = -(idx * SLICE + SLICE/2) + beaucoup de tours
      const spins = 6  // 6 tours complets
      const targetAngle = -(idx * SLICE + SLICE / 2 - Math.PI / 2)
      const target = rotation + spins * Math.PI * 2 + ((targetAngle - rotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)

      const startRot = rotation
      const dur = 4000
      const t0 = performance.now()
      const ease = t => 1 - Math.pow(1 - t, 4)

      const animate = now => {
        const p = Math.min((now - t0) / dur, 1)
        const r = startRot + (target - startRot) * ease(p)
        setRotation(r)
        if (p < 1) { rafRef.current = requestAnimationFrame(animate) }
        else {
          setRotation(target)
          setWinIdx(idx)
          setResult({ segment: seg, balance: data.balance, next_spin: data.next_spin })
          setStatus(s => ({ ...s, can_spin: false, next_spin: data.next_spin }))
          updateBalance(data.balance)
          setSpinning(false)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    } catch (e) {
      setErr(e.response?.data?.error || 'Erreur')
      setSpinning(false)
    }
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 28px', boxSizing:'border-box' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <Link to="/casino" style={{ fontSize:11, color:C.muted, textDecoration:'none' }}>← Accueil</Link>
        <span style={{ color:C.dim }}>/</span>
        <span style={{ fontSize:11, color:'#9898b8' }}>🎡 Roue du jour</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, maxWidth:860 }}>

        {/* Roue */}
        <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:18, padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.gold, letterSpacing:3 }}>ROUE DU JOUR</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>1 spin gratuit toutes les 24h</div>
          </div>

          <canvas ref={cvs} width={340} height={340} style={{ display:'block' }}/>

          {/* Résultat */}
          {result && (
            <div style={{ background:`${C.green}0e`, border:`1px solid ${C.green}28`, borderRadius:12, padding:'14px 20px', textAlign:'center', width:'100%' }}>
              <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>🎉 Tu as gagné</div>
              <div style={{ fontSize:28, fontWeight:900, color:result.segment.color, fontFamily:'monospace' }}>
                +{result.segment.value.toLocaleString()}
              </div>
              <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>jetons · {result.segment.label}</div>
            </div>
          )}

          {/* Bouton */}
          <button onClick={handleSpin} disabled={spinning || !status?.can_spin || !user}
            style={{ width:'100%', maxWidth:300, padding:'14px', background:spinning||!status?.can_spin||!user?C.dim:C.gold, color:spinning||!status?.can_spin||!user?C.muted:'#06060f', fontWeight:800, fontSize:15, borderRadius:10, border:'none', cursor:spinning||!status?.can_spin||!user?'not-allowed':'pointer', boxShadow:status?.can_spin&&user?`0 0 20px ${C.gold}44`:'none', transition:'all .15s' }}>
            {!user ? 'Connecte-toi' : spinning ? '⏳ En cours…' : !status?.can_spin ? `Reviens dans ${countdown}` : '🎡 Faire tourner !'}
          </button>

          {err && <div style={{ fontSize:11, color:'#ef4444' }}>⚠ {err}</div>}
        </div>

        {/* Panneau droit */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Stats joueur */}
          {status && user && (
            <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Mes stats</div>
              {[['Total gagné', `${status.total_won?.toLocaleString() ?? 0} jetons`], ['Spins effectués', status.spins ?? 0], ['Prochain spin', status.can_spin ? '✅ Disponible !' : countdown]].map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'6px 0', borderBottom:`1px solid ${C.dim}` }}>
                  <span style={{ color:C.muted }}>{l}</span>
                  <span style={{ fontWeight:700, color:C.txt }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table des gains */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Gains possibles</div>
            {segments.map((seg, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:`1px solid ${C.dim}`, background:winIdx===i?seg.color+'12':'transparent', transition:'background .3s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:seg.color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:C.txt }}>{seg.label}</span>
                </div>
                <div style={{ fontSize:9, color:C.muted, fontFamily:'monospace' }}>
                  {/* Afficher la probabilité relative */}
                  {i === 0 ? 'fréquent' : i >= 6 ? 'rare' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Règle */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Comment ça marche</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.8 }}>
              <div>🎡 1 spin <span style={{ color:C.txt, fontWeight:700 }}>totalement gratuit</span> par jour</div>
              <div>⏰ Disponible toutes les <span style={{ color:C.txt }}>24 heures</span></div>
              <div>💰 Minimum <span style={{ color:C.green, fontWeight:700 }}>50 jetons</span> garanti</div>
              <div>🔥 Maximum <span style={{ color:'#ff4444', fontWeight:700 }}>10 000 jetons</span> possible</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
