import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const SPRITE = dex =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

const SUIT_COLORS = { '♠': '#c8c8e8', '♣': '#c8c8e8', '♥': '#f06060', '♦': '#f06060' }

const STATUS_INFO = {
  blackjack:       { label: '🏆 BLACKJACK !',      color: '#f0c040', bg: 'rgba(240,192,64,0.08)'   },
  win:             { label: '✅ Gagné !',            color: '#40f080', bg: 'rgba(64,240,128,0.08)'  },
  push:            { label: '🤝 Égalité',           color: '#8888cc', bg: 'rgba(136,136,204,0.08)' },
  bust:            { label: '💥 Dépassé 21 !',      color: '#f06060', bg: 'rgba(240,96,96,0.08)'   },
  lose:            { label: '❌ Perdu',             color: '#f06060', bg: 'rgba(240,96,96,0.08)'   },
  dealer_blackjack:{ label: '😈 Blackjack dealer',  color: '#f06060', bg: 'rgba(240,96,96,0.08)'   },
}

// ── Carte ─────────────────────────────────────────────────────────────────────
function Card({ card, hidden = false, small = false }) {
  const w = small ? 56 : 72
  const h = small ? 78 : 100

  if (hidden) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 8,
        background: 'linear-gradient(135deg, #1a1a3a 25%, #2a2a5a 50%, #1a1a3a 75%)',
        border: '1px solid #3a3a6a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: small ? 20 : 28 }}>🎴</span>
      </div>
    )
  }

  const color     = SUIT_COLORS[card.suit] || '#c8c8e8'
  const fontSize  = small ? 11 : 13
  const spriteSize= small ? 28 : 38

  return (
    <div style={{
      width: w, height: h, borderRadius: 8,
      background: '#12122a',
      border: '1px solid #2a2a4a',
      display: 'flex', flexDirection: 'column',
      padding: '4px 5px',
      flexShrink: 0,
      position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    }}>
      {/* Valeur haut gauche */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize, fontWeight: 800, color }}>{card.value}</span>
        <span style={{ fontSize: fontSize - 2, color }}>{card.suit}</span>
      </div>

      {/* Sprite Pokémon au centre */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src={SPRITE(card.dex)}
          alt={card.name}
          title={card.name}
          style={{
            width: spriteSize, height: spriteSize,
            imageRendering: 'pixelated', objectFit: 'contain',
          }}
        />
      </div>

      {/* Valeur bas droite (inversée) */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1,
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize, fontWeight: 800, color }}>{card.value}</span>
        <span style={{ fontSize: fontSize - 2, color }}>{card.suit}</span>
      </div>
    </div>
  )
}

// ── Main du joueur / dealer ───────────────────────────────────────────────────
function Hand({ cards = [], value, label, isDealer = false }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, color: '#5a5a8a', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </span>
        {value > 0 && (
          <span style={{
            fontSize: 13, fontWeight: 800,
            color: value > 21 ? '#f06060' : value === 21 ? '#f0c040' : '#d8d8f0',
            background: '#1a1a35', padding: '2px 10px', borderRadius: 20,
            border: '1px solid #2a2a4a',
          }}>
            {value > 21 ? `${value} 💥` : value === 21 ? '21 ✨' : value}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cards.map((card, i) => (
          <Card key={i} card={card} hidden={card.hidden} />
        ))}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Blackjack() {
  const { user, updateBalance } = useAuth()

  const [bet,     setBet]     = useState(100)
  const [phase,   setPhase]   = useState('idle')  // idle | playing | done
  const [game,    setGame]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [history, setHistory] = useState([])

  async function sendAction(action, betAmount) {
    setLoading(true)
    setError('')
    try {
      const payload = action === 'deal' ? { action, bet: betAmount } : { action }
      const { data } = await axios.post('/api/games/blackjack', payload)

      setGame(data)
      updateBalance(data.balance)

      if (data.done) {
        setPhase('done')
        setHistory(prev => [{
          status:     data.status,
          bet:        action === 'deal' ? betAmount : game?.bet,
          payout:     data.payout,
          multiplier: data.multiplier,
        }, ...prev].slice(0, 10))
      } else {
        setPhase('playing')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  function handleDeal() {
    if (bet < 10 || bet > (user?.balance || 0)) return
    sendAction('deal', bet)
  }

  const statusInfo = game?.status ? STATUS_INFO[game.status] : null

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>← Lobby</Link>
        <span style={{ color: '#2a2a4a' }}>/</span>
        <span style={{ fontSize: 11, color: '#f0c040', fontWeight: 700 }}>🃏 Blackjack</span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 8,
          background: 'rgba(240,192,64,0.1)', color: '#f0c040',
          border: '1px solid rgba(240,192,64,0.2)',
        }}>
          RTP ~96.5%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* ── Table de jeu ── */}
        <div style={{
          background: '#0a0a20',
          border: '1px solid #1e1e40',
          borderRadius: 14,
          padding: 24,
          minHeight: 420,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>

          {/* Tapis vert style casino */}
          <div style={{
            background: '#071a10',
            border: '1px solid #0f3020',
            borderRadius: 10,
            padding: '20px 24px',
            flex: 1,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            gap: 24,
          }}>

            {/* Main dealer */}
            <div>
              <Hand
                cards={game?.dealer || []}
                value={phase === 'done' ? game?.dealerValue : (game?.dealer?.[0] ? game.dealerValue : 0)}
                label="🎩 Dresseur (Dealer)"
                isDealer
              />
            </div>

            {/* Séparateur */}
            <div style={{
              borderTop: '1px dashed #0f3020',
              textAlign: 'center',
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                background: '#071a10', padding: '0 12px',
                fontSize: 18,
              }}>
                🎯
              </span>
            </div>

            {/* Main joueur */}
            <div>
              <Hand
                cards={game?.player || []}
                value={game?.playerValue || 0}
                label={`👤 ${user?.username || 'Toi'}`}
              />
            </div>
          </div>

          {/* Résultat */}
          {phase === 'done' && statusInfo && (
            <div style={{
              marginTop: 14, padding: '12px 18px',
              background: statusInfo.bg,
              border: `1px solid ${statusInfo.color}33`,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: statusInfo.color }}>
                  {statusInfo.label}
                </div>
                <div style={{ fontSize: 10, color: '#44446a', marginTop: 2 }}>
                  {game?.playerValue} vs {game?.dealerValue}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: statusInfo.color }}>
                  {game?.payout > 0
                    ? `+${(game.payout - (game.bet || bet)).toLocaleString()}`
                    : `-${(game.bet || bet).toLocaleString()}`}
                </div>
                <div style={{ fontSize: 10, color: '#44446a' }}>jetons</div>
              </div>
            </div>
          )}

          {/* Idle — message de bienvenue */}
          {phase === 'idle' && (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              fontSize: 12, color: '#2e2e50',
            }}>
              Place ta mise et lance la partie !
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.2)',
              borderRadius: 6, fontSize: 11, color: '#f06060',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Panneau de contrôle ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: '#0a0a20', border: '1px solid #1e1e40',
            borderRadius: 12, padding: 16,
          }}>

            {phase === 'idle' || phase === 'done' ? (
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading} />
                <button
                  onClick={handleDeal}
                  disabled={loading || bet < 10 || bet > (user?.balance || 0)}
                  style={{
                    width: '100%', marginTop: 16,
                    background: '#f0c040', color: '#07071a',
                    fontWeight: 800, fontSize: 15, padding: '14px',
                    borderRadius: 10, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || bet > (user?.balance || 0) ? 0.5 : 1,
                    boxShadow: '0 0 20px rgba(240,192,64,0.25)',
                  }}
                >
                  {loading ? 'Distribution...' : phase === 'done' ? '🔄 Nouvelle partie' : '🃏 Distribuer'}
                </button>
              </>
            ) : (
              // Actions en jeu
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#5a5a8a', textAlign: 'center', marginBottom: 4 }}>
                  Mise : <span style={{ color: '#f0c040', fontWeight: 700 }}>{(game?.bet || bet).toLocaleString()} jetons</span>
                </div>

                <button
                  onClick={() => sendAction('hit')}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px',
                    background: '#4080f0', color: '#fff',
                    fontWeight: 800, fontSize: 15, borderRadius: 10, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    boxShadow: '0 0 16px rgba(64,128,240,0.3)',
                  }}
                >
                  🃏 Tirer une carte
                </button>

                <button
                  onClick={() => sendAction('stand')}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px',
                    background: '#f04040', color: '#fff',
                    fontWeight: 800, fontSize: 15, borderRadius: 10, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    boxShadow: '0 0 16px rgba(240,64,64,0.3)',
                  }}
                >
                  ✋ Rester
                </button>

                <div style={{ fontSize: 10, color: '#2e2e50', textAlign: 'center', marginTop: 4 }}>
                  Ta main : <span style={{
                    color: (game?.playerValue || 0) > 21 ? '#f06060'
                      : (game?.playerValue || 0) === 21 ? '#f0c040' : '#d8d8f0',
                    fontWeight: 700,
                  }}>
                    {game?.playerValue || 0}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Règles */}
          <div style={{
            background: '#0a0a20', border: '1px solid #1e1e40',
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ fontSize: 10, color: '#44446a', lineHeight: 1.9 }}>
              <div style={{ color: '#f0c040', fontWeight: 700, marginBottom: 6, fontSize: 11 }}>
                📖 Règles
              </div>
              <div>🃏 Blackjack = <span style={{ color: '#f0c040' }}>×2.5</span></div>
              <div>✅ Victoire = <span style={{ color: '#40f080' }}>×2</span></div>
              <div>🤝 Égalité = <span style={{ color: '#8888cc' }}>mise remboursée</span></div>
              <div>💥 Dépasser 21 = <span style={{ color: '#f06060' }}>perdu</span></div>
              <div style={{ marginTop: 4, color: '#2e2e50' }}>
                Le dealer tire jusqu'à 17
              </div>
            </div>
          </div>

          {/* Historique */}
          {history.length > 0 && (
            <div style={{
              background: '#0a0a20', border: '1px solid #1e1e40',
              borderRadius: 12, padding: 14,
            }}>
              <div style={{
                fontSize: 9, color: '#2e2e50', textTransform: 'uppercase',
                letterSpacing: 1, marginBottom: 8,
              }}>
                Dernières parties
              </div>
              {history.map((h, i) => {
                const info = STATUS_INFO[h.status]
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 0', borderBottom: '1px solid #0f0f28', fontSize: 10,
                  }}>
                    <span style={{ color: info?.color }}>{info?.label}</span>
                    <span style={{ fontWeight: 700, color: h.payout > h.bet ? '#40f080' : '#f06060' }}>
                      {h.payout > h.bet ? `+${(h.payout - h.bet).toLocaleString()}` : `-${h.bet?.toLocaleString()}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <LiveFeed compact />
        </div>
      </div>
    </div>
  )
}
