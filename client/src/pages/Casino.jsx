import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { getRankFromWagered, getNextRank, getXPProgress } from '../utils/ranks'

const GAMES = [
  {
    id: 'slots', path: '/casino/slots',
    name: 'Slot Machine', icon: '🎰',
    tagline: 'Aligne les Pokémon légendaires',
    sub: 'Jackpot jusqu\'à ×261 ta mise',
    color: '#F0B429', glow: 'rgba(240,180,41,0.2)',
    rtp: 88, hot: true,
  },
  {
    id: 'blackjack', path: '/casino/blackjack',
    name: 'Blackjack', icon: '🃏',
    tagline: 'Bats le dealer sans dépasser 21',
    sub: 'Blackjack naturel ×2.2',
    color: '#60A5FA', glow: 'rgba(96,165,250,0.2)',
    rtp: 90,
  },
  {
    id: 'mines', path: '/casino/mines',
    name: 'Mines', icon: '💣',
    tagline: 'Évite les Voltorbe, encaisse quand tu veux',
    sub: 'Multiplicateur jusqu\'à ×100+',
    color: '#22C55E', glow: 'rgba(34,197,94,0.2)',
    rtp: 92,
  },
  {
    id: 'roulette', path: '/casino/roulette',
    name: 'Roulette Pokémon', icon: '🎡',
    tagline: 'Mise sur un type, tente le Légendaire',
    sub: 'Mew Légendaire = ×14',
    color: '#A78BFA', glow: 'rgba(167,139,250,0.2)',
    rtp: 89,
  },
  {
    id: 'plinko', path: '/casino/plinko',
    name: 'Plinko', icon: '⚪',
    tagline: 'Lâche la Poké Ball et espère',
    sub: 'Risque élevé : jackpot ×37.5',
    color: '#F472B6', glow: 'rgba(244,114,182,0.2)',
    rtp: 90,
  },
]

export default function Casino() {
  const { user } = useAuth()
  const { gameSettings } = useSocket()
  const [bonusAvailable, setBonusAvailable] = useState(false)
  const [jackpot, setJackpot] = useState(null)

  const rank     = user?.total_wagered !== undefined ? getRankFromWagered(user.total_wagered) : null
  const nextRank = rank ? getNextRank(rank.id) : null
  const xp       = rank && nextRank ? getXPProgress(user?.total_wagered || 0, rank, nextRank) : 100

  useEffect(() => {
    if (!user) return
    axios.get('/api/wheel').then(r => setBonusAvailable(r.data.can_spin)).catch(() => {})
    axios.get('/api/superjackpot').then(r => setJackpot(r.data.amount)).catch(() => {})
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 6)  return 'Bonne nuit'
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', boxSizing: 'border-box' }}>

      {/* ── Welcome ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 15, color: 'rgba(245,230,200,0.4)', marginBottom: 4 }}>
          {greeting()},
        </div>
        <h1 style={{
          fontFamily: 'Cinzel Decorative, serif',
          fontSize: 26, fontWeight: 900,
          color: '#F5E6C8',
          marginBottom: 6,
        }}>
          <span style={{ color: '#FFD700' }}>{user?.username}</span> 👋
        </h1>
        <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 14, color: 'rgba(245,230,200,0.35)', margin: 0 }}>
          Bienvenue au CobbleMoon Casino — {rank && <span style={{ color: rank.color }}>{rank.icon} {rank.name}</span>}
        </p>
      </div>

      {/* ── Bonus disponible ── */}
      {bonusAvailable && (
        <Link to="/roue-du-jour" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(244,114,182,0.08))',
            border: '1px solid rgba(167,139,250,0.35)',
            borderRadius: 14, padding: '16px 22px',
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 0 30px rgba(167,139,250,0.1)',
            animation: 'pulseGold 3s ease-in-out infinite',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: 'rgba(167,139,250,0.2)',
              border: '1px solid rgba(167,139,250,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, animation: 'float 2.5s ease-in-out infinite',
            }}>🎁</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: '#A78BFA', marginBottom: 2 }}>
                Ton Coffre du Jour est disponible !
              </div>
              <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.5)' }}>
                Récupère jusqu'à <span style={{ color: '#FFD700', fontWeight: 700 }}>50 000 jetons</span> gratuitement — offre valable jusqu'à minuit
              </div>
            </div>
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
              color: '#1A0A00',
              background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
              borderRadius: 8, padding: '8px 16px', flexShrink: 0,
            }}>
              Ouvrir →
            </div>
          </div>
        </Link>
      )}

      {/* ── Stats rapides ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        <StatCard
          icon="✦"
          label="Ton solde"
          value={`${(user?.balance || 0).toLocaleString('fr-FR')} jetons`}
          color="#F0B429"
        />
        <StatCard
          icon="💎"
          label="SuperJackpot"
          value={jackpot !== null ? `${jackpot.toLocaleString('fr-FR')} jetons` : '…'}
          color="#E8556A"
          link="/superjackpot"
        />
        <StatCard
          icon={rank?.icon || '🔴'}
          label="Ton rang"
          value={rank?.name || 'Rookie'}
          color={rank?.color || '#9CA3AF'}
          sub={nextRank ? `→ ${nextRank.name}` : '✦ Rang max'}
        />
      </div>

      {/* ── Barre XP ── */}
      {nextRank && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(240,180,41,0.1)',
          borderRadius: 12, padding: '14px 20px',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'rgba(240,180,41,0.5)' }}>
              Progression vers {nextRank.icon} {nextRank.name}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(245,230,200,0.4)' }}>
              {(user?.total_wagered || 0).toLocaleString('fr-FR')} / {nextRank.threshold.toLocaleString('fr-FR')} ✦
            </div>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${xp}%`,
              background: `linear-gradient(90deg, ${rank?.color || '#F0B429'}88, ${rank?.color || '#FFD700'})`,
              borderRadius: 3,
              boxShadow: `0 0 10px ${rank?.color || '#F0B429'}60`,
              transition: 'width 1.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Jeux ── */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 14, fontWeight: 700,
          color: 'rgba(245,230,200,0.5)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Les Machines
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {GAMES.map(game => {
            const enabled = gameSettings[game.id] !== false
            const card = <GameCard key={game.id} game={game} enabled={enabled} />
            if (!enabled) return <div key={game.id}>{card}</div>
            return <Link key={game.id} to={game.path} style={{ textDecoration: 'none' }}>{card}</Link>
          })}
        </div>
      </div>

      {/* ── Infos ── */}
      <div style={{
        marginTop: 32,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12, padding: '20px 22px',
      }}>
        <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'rgba(245,230,200,0.4)', marginBottom: 14, letterSpacing: '0.1em' }}>
          Comment ça marche ?
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { icon: '🎮', title: 'Gagne des Pokédollars', desc: 'En jouant sur le serveur CobbleMoon.' },
            { icon: '💬', title: 'Échange avec Frilous', desc: 'Envoie tes Pokédollars à Frilous. 1 jeton = 1 ₽.' },
            { icon: '🎰', title: 'Joue au casino', desc: 'Mise tes jetons. Min 10, max selon ton rang.' },
            { icon: '💸', title: 'Retire tes gains', desc: 'Demande un retrait, Frilous te verse en jeu.' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 10, padding: '14px 12px',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700, color: 'rgba(245,230,200,0.7)', marginBottom: 4 }}>
                {s.title}
              </div>
              <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 12, color: 'rgba(245,230,200,0.35)', lineHeight: 1.5 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: 'rgba(240,180,41,0.04)',
          border: '1px solid rgba(240,180,41,0.1)',
          borderRadius: 8, fontFamily: 'Crimson Pro, serif',
          fontSize: 12, color: 'rgba(245,230,200,0.25)', lineHeight: 1.6,
        }}>
          ⚠ Projet indépendant de Frilous — sans lien avec le staff CobbleMoon. Contact : <span style={{ color: 'rgba(240,180,41,0.5)' }}>Frilous</span> sur Discord (<span style={{ color: 'rgba(240,180,41,0.5)' }}>.Frilous</span>)
        </div>
      </div>
    </div>
  )
}

function GameCard({ game, enabled }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        background: hovered && enabled
          ? `linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`
          : `linear-gradient(160deg, #1E1015, #150D10)`,
        border: `1px solid ${hovered && enabled ? game.color + '55' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        opacity: enabled ? 1 : 0.4,
        cursor: enabled ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        transform: hovered && enabled ? 'translateY(-4px)' : 'none',
        boxShadow: hovered && enabled ? `0 12px 40px ${game.glow}` : 'none',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Barre couleur top */}
      <div style={{
        height: 3,
        background: enabled
          ? `linear-gradient(90deg, transparent, ${game.color}, transparent)`
          : 'rgba(255,255,255,0.05)',
      }} />

      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{
            fontSize: 40,
            filter: enabled ? `drop-shadow(0 0 12px ${game.color}60)` : 'grayscale(1)',
            transition: 'filter 0.2s',
          }}>
            {game.icon}
          </div>
          <div style={{ textAlign: 'right' }}>
            {!enabled && (
              <div style={{
                fontFamily: 'Cinzel, serif', fontSize: 9,
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(245,230,200,0.3)',
                padding: '3px 8px', borderRadius: 4,
                letterSpacing: '0.1em',
              }}>
                MAINTENANCE
              </div>
            )}
            {enabled && game.hot && (
              <div style={{
                fontFamily: 'Cinzel, serif', fontSize: 9,
                background: 'rgba(240,180,41,0.15)',
                color: '#F0B429',
                padding: '3px 8px', borderRadius: 4,
                letterSpacing: '0.1em',
                border: '1px solid rgba(240,180,41,0.3)',
              }}>
                🔥 CHAUD
              </div>
            )}
          </div>
        </div>

        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 700, color: '#F5E6C8', marginBottom: 4 }}>
          {game.name}
        </div>
        <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.5)', marginBottom: 10, lineHeight: 1.4 }}>
          {game.tagline}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 12, color: game.color, fontWeight: 600 }}>
            {game.sub}
          </div>
          {enabled && (
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
              color: game.color,
              opacity: hovered ? 1 : 0.5,
              transition: 'opacity 0.2s',
            }}>
              Jouer →
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, sub, link }) {
  const content = (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${color}18`,
      borderRadius: 12, padding: '16px 18px',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { if (link) { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.background = `${color}08` } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}18`; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14, color }}>{icon}</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(245,230,200,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
  if (link) return <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link>
  return content
}
