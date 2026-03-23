import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { getRankFromWagered } from '../utils/ranks'

const PRIZES = [
  { label: '100 ✦',    amount: 100,   color: '#9CA3AF', weight: 30 },
  { label: '250 ✦',    amount: 250,   color: '#22C55E', weight: 25 },
  { label: '500 ✦',    amount: 500,   color: '#60A5FA', weight: 18 },
  { label: '1k ✦',     amount: 1000,  color: '#A78BFA', weight: 12 },
  { label: '2.5k ✦',   amount: 2500,  color: '#F0B429', weight: 8  },
  { label: '5k ✦',     amount: 5000,  color: '#F0B429', weight: 4  },
  { label: '10k ✦',    amount: 10000, color: '#FFD700', weight: 2  },
  { label: '50k ✦',    amount: 50000, color: '#E8556A', weight: 1  },
]

const CHEST_STATES = {
  idle:    { emoji: '🎁', label: 'Coffre disponible', color: '#A78BFA' },
  opening: { emoji: '✨', label: 'Ouverture…',        color: '#FFD700' },
  won:     { emoji: '🏆', label: 'Gagné !',           color: '#22C55E' },
  empty:   { emoji: '🔒', label: 'Déjà ouvert',       color: 'rgba(245,230,200,0.25)' },
}

export default function RoueDuJour() {
  const { user, updateBalance } = useAuth()
  const [canSpin,   setCanSpin]   = useState(false)
  const [spinning,  setSpinning]  = useState(false)
  const [result,    setResult]    = useState(null)
  const [chestState,setChestState]= useState('idle')
  const [streak,    setStreak]    = useState(0)
  const [nextSpin,  setNextSpin]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [particles, setParticles] = useState([])

  const rank = user?.total_wagered !== undefined ? getRankFromWagered(user.total_wagered) : null

  useEffect(() => {
    axios.get('/api/wheel').then(r => {
      setCanSpin(r.data.can_spin)
      setStreak(r.data.streak || 0)
      setNextSpin(r.data.next_spin)
      if (!r.data.can_spin) setChestState('empty')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function openChest() {
    if (!canSpin || spinning) return
    setSpinning(true)
    setChestState('opening')

    // Animation dorée 1.5s
    await new Promise(r => setTimeout(r, 1500))

    try {
      const { data } = await axios.post('/api/wheel')
      updateBalance(data.balance)
      setResult(data)
      setCanSpin(false)
      setStreak(data.streak || 0)
      setChestState('won')

      // Particules
      setParticles(Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 40,
        size: 4 + Math.random() * 6,
        color: ['#FFD700', '#F0B429', '#22C55E', '#A78BFA', '#F472B6'][Math.floor(Math.random() * 5)],
        vx: (Math.random() - 0.5) * 200,
        vy: -(50 + Math.random() * 150),
      })))
      setTimeout(() => setParticles([]), 2000)
    } catch (err) {
      const msg = err.response?.data?.error || ''
      if (msg.includes('déjà')) { setChestState('empty'); setCanSpin(false) }
      else setChestState('idle')
    }
    setSpinning(false)
  }

  function timeUntilMidnight() {
    const now  = new Date()
    const next = new Date(now)
    next.setHours(24, 0, 0, 0)
    const diff = next - now
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}min`
  }

  const cs = CHEST_STATES[chestState] || CHEST_STATES.idle

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Crimson Pro, serif', color: 'rgba(245,230,200,0.3)', fontSize: 15 }}>
      Chargement…
    </div>
  )

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontFamily: 'Cinzel Decorative, serif', fontSize: 22, fontWeight: 900, color: '#F5E6C8', marginBottom: 6 }}>
        Coffre du Jour
      </h1>
      <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 15, color: 'rgba(245,230,200,0.4)', marginBottom: 28 }}>
        Un coffre gratuit chaque jour — jusqu'à 50 000 jetons à gagner
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Coffre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(160deg, #1A0F1A, #110D16)',
            border: `2px solid ${canSpin ? cs.color + '60' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 20, padding: '40px 30px', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
            boxShadow: canSpin ? `0 0 40px ${cs.color}20` : 'none',
            transition: 'all 0.5s',
          }}>
            {/* Particules */}
            {particles.map(p => (
              <div key={p.id} style={{
                position: 'absolute',
                left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                borderRadius: '50%',
                background: p.color,
                animation: 'confettiFall 1.8s ease forwards',
                pointerEvents: 'none', zIndex: 10,
              }} />
            ))}

            {/* Streak */}
            {streak > 0 && (
              <div style={{
                position: 'absolute', top: 14, right: 14,
                fontFamily: 'Cinzel, serif', fontSize: 10,
                background: 'rgba(240,180,41,0.15)',
                border: '1px solid rgba(240,180,41,0.3)',
                color: '#F0B429', borderRadius: 20,
                padding: '3px 10px',
              }}>
                🔥 {streak} jour{streak > 1 ? 's' : ''} d'affilée
              </div>
            )}

            {/* Coffre emoji */}
            <div style={{
              fontSize: 80, marginBottom: 16,
              filter: `drop-shadow(0 0 ${chestState === 'opening' || chestState === 'won' ? 30 : 10}px ${cs.color}60)`,
              animation: chestState === 'opening' ? 'float 0.3s ease-in-out infinite' : chestState === 'idle' && canSpin ? 'float 3s ease-in-out infinite' : 'none',
              transition: 'all 0.4s',
            }}>
              {cs.emoji}
            </div>

            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 700,
              color: cs.color, marginBottom: 8,
            }}>
              {cs.label}
            </div>

            {/* Résultat */}
            {chestState === 'won' && result && (
              <div style={{ marginBottom: 16, animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 36, fontWeight: 900, color: '#FFD700', textShadow: '0 0 30px rgba(255,215,0,0.6)' }}>
                  +{(result.won * (rank?.bonusWheel || 1)).toFixed(0) === result.won.toString()
                    ? result.won.toLocaleString('fr-FR')
                    : result.won.toLocaleString('fr-FR')}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'rgba(240,180,41,0.5)', marginTop: 4 }}>jetons</div>
                {rank && rank.bonusWheel > 1 && (
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: rank.color, marginTop: 6, background: `${rank.color}15`, border: `1px solid ${rank.color}30`, padding: '3px 12px', borderRadius: 20, display: 'inline-block' }}>
                    {rank.icon} Bonus rang ×{rank.bonusWheel}
                  </div>
                )}
              </div>
            )}

            {/* Bouton */}
            <button
              onClick={openChest}
              disabled={!canSpin || spinning}
              style={{
                padding: '16px 36px',
                background: !canSpin
                  ? 'rgba(255,255,255,0.04)'
                  : spinning
                  ? 'rgba(167,139,250,0.2)'
                  : 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                color: !canSpin ? 'rgba(245,230,200,0.2)' : spinning ? '#A78BFA' : '#fff',
                fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 14,
                borderRadius: 12, border: 'none',
                cursor: !canSpin || spinning ? 'not-allowed' : 'pointer',
                boxShadow: canSpin && !spinning ? '0 4px 20px rgba(139,92,246,0.4)' : 'none',
                transition: 'all 0.2s',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
            >
              {spinning ? '✨ Ouverture…' : !canSpin ? '🔒 Déjà ouvert' : '🎁 Ouvrir le coffre'}
            </button>

            {!canSpin && (
              <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.3)', marginTop: 14 }}>
                Prochain coffre dans <span style={{ color: '#A78BFA', fontWeight: 600 }}>{timeUntilMidnight()}</span>
              </div>
            )}
          </div>

          {/* Streak bonus */}
          {streak >= 2 && (
            <div style={{ background: 'rgba(240,180,41,0.06)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: '#F0B429', marginBottom: 8 }}>🔥 Streak en cours</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i < streak ? 'rgba(240,180,41,0.3)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${i < streak ? '#F0B429' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>
                    {i < streak ? '🔥' : ''}
                  </div>
                ))}
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)' }}>→ 🎁 bonus</span>
              </div>
            </div>
          )}
        </div>

        {/* Droite — Prizes + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Rang bonus */}
          {rank && rank.bonusWheel > 1 && (
            <div style={{ background: `${rank.color}0a`, border: `1px solid ${rank.color}25`, borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: rank.color, marginBottom: 4 }}>
                {rank.icon} Bonus {rank.name}
              </div>
              <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.5)' }}>
                Ton rang multiplie tous tes gains par <span style={{ color: rank.color, fontWeight: 700 }}>×{rank.bonusWheel}</span>
              </div>
            </div>
          )}

          {/* Table des prix */}
          <div style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: 'rgba(245,230,200,0.5)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Récompenses possibles
            </div>
            {PRIZES.map((p, i) => {
              const barW = (p.weight / PRIZES[0].weight) * 100
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 60, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: p.color, flexShrink: 0 }}>
                    {p.label}
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(90deg, ${p.color}80, ${p.color})`, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(245,230,200,0.25)', width: 30, textAlign: 'right', flexShrink: 0 }}>
                    {p.weight}%
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: 'rgba(245,230,200,0.4)', marginBottom: 10 }}>Avantages par rang</div>
            {[
              { name: 'Champion+', icon: '🏆', bonus: '×1.5 tous les gains' },
              { name: 'Maître+',   icon: '💎', bonus: '×1.75 · 2× par jour' },
              { name: 'Legend',    icon: '🌙', bonus: '×3 · Illimité' },
            ].map(({ name, icon, bonus }) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 12, color: 'rgba(245,230,200,0.4)' }}>{icon} {name}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#F0B429', fontWeight: 700 }}>{bonus}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
