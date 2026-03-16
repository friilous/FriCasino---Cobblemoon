import { useSocket } from '../contexts/SocketContext'
import { useEffect, useState } from 'react'
import axios from 'axios'

const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }
const GAME_NAMES = { slots: 'Slots', plinko: 'Plinko', roulette: 'Roulette', crash: 'Crash', blackjack: 'Blackjack', mines: 'Mines' }

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60)  return `il y a ${seconds}s`
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`
  return 'il y a plus de 24h'
}

// Hook pour forcer un re-render toutes les 10 secondes (mise à jour des timers)
function useTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])
}

export default function LiveFeed({ compact = false }) {
  const { liveFeed, setLiveFeed } = useSocket()
  useTick()

  useEffect(() => {
    axios.get('/api/games/live-feed')
      .then(r => setLiveFeed(r.data.map(e => ({ ...e, timestamp: e.created_at }))))
      .catch(() => {})
  }, [])

  if (compact) {
    return (
      <div style={{
        background: '#0c0c22', border: '1px solid #1e1e40',
        borderRadius: 10, padding: 12,
      }}>
        <div style={{
          fontSize: 9, color: '#2e2e55', textTransform: 'uppercase',
          letterSpacing: 1, marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%', background: '#40f080',
            animation: 'pulse-dot 1.4s ease-in-out infinite',
          }} />
          Live
        </div>
        {liveFeed.length === 0 ? (
          <p style={{ fontSize: 10, color: '#2e2e50', textAlign: 'center', padding: '8px 0' }}>
            Aucune activité
          </p>
        ) : (
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {liveFeed.slice(0, 8).map((e, i) => {
              const mult = e.multiplier || (e.bet > 0 ? e.payout / e.bet : 0)
              return (
                <div key={i} style={{
                  padding: '5px 0', borderBottom: '1px solid #0f0f28', fontSize: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>{GAME_ICONS[e.game] || '🎲'}</span>
                      <span style={{ color: '#7777a0' }}>{e.username}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: e.payout > 0 ? '#40f080' : '#555577' }}>
                        {e.payout > 0 ? `+${e.payout.toLocaleString()}` : `-${e.bet?.toLocaleString()}`}
                      </span>
                      {e.payout > 0 && mult > 0 && (
                        <span style={{ fontSize: 9, color: '#44446a', marginLeft: 4 }}>
                          ×{mult.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: '#2e2e50', marginTop: 2 }}>
                    {timeAgo(e.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: '#0c0c22', border: '1px solid #1e1e40',
      borderRadius: 10, padding: 16,
    }}>
      <h3 style={{
        fontSize: 11, color: '#44446a', textTransform: 'uppercase',
        letterSpacing: 1, margin: '0 0 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: '#40f080',
          animation: 'pulse-dot 1.4s ease-in-out infinite',
        }} />
        Activité en direct
      </h3>

      {liveFeed.length === 0 ? (
        <p style={{ fontSize: 11, color: '#2e2e50', textAlign: 'center', padding: '20px 0' }}>
          Aucune activité — sois le premier à jouer ! 🎲
        </p>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {liveFeed.map((e, i) => {
            const mult      = e.multiplier || (e.bet > 0 ? e.payout / e.bet : 0)
            const isJackpot = mult >= 10
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px',
                background: i === 0 ? 'rgba(240,192,64,0.05)' : 'transparent',
                borderBottom: '1px solid #0f0f28',
                borderRadius: i === 0 ? 6 : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{GAME_ICONS[e.game] || '🎲'}</span>
                  <div>
                    <div>
                      <span style={{ color: '#c8c8e8', fontWeight: 600, fontSize: 12 }}>{e.username}</span>
                      <span style={{ color: '#44446a', fontSize: 10, marginLeft: 6 }}>
                        sur {GAME_NAMES[e.game] || e.game}
                      </span>
                    </div>
                    <div style={{ fontSize: 9, color: '#2e2e50', marginTop: 2 }}>
                      {timeAgo(e.timestamp)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {e.payout > 0 ? (
                    <>
                      <div style={{
                        fontWeight: 700, fontSize: 12,
                        color: isJackpot ? '#f0c040' : '#40f080',
                      }}>
                        +{e.payout.toLocaleString()} {isJackpot ? '🏆' : ''}
                      </div>
                      {mult > 0 && (
                        <div style={{ fontSize: 10, color: '#44446a' }}>
                          ×{mult.toFixed(1)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#444466', fontWeight: 700, fontSize: 12 }}>
                      -{e.bet?.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}