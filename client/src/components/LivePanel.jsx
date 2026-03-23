import { useState, useRef, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const GAME_ICONS = { slots: '🎰', roulette: '🎡', blackjack: '🃏', mines: '💣', plinko: '⚪' }
const GAME_NAMES = { slots: 'Slots', roulette: 'Roulette', blackjack: 'Blackjack', mines: 'Mines', plinko: 'Plinko' }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}min`
  return `${Math.floor(s / 3600)}h`
}

export default function LivePanel() {
  const { liveFeed, setLiveFeed, chatMessages, sendChatMessage, connected } = useSocket()
  const { user } = useAuth()

  const [open,       setOpen]       = useState(false)
  const [tab,        setTab]        = useState('feed')   // 'feed' | 'chat'
  const [chatInput,  setChatInput]  = useState('')
  const [feedFilter, setFeedFilter] = useState('all')    // 'all' | 'wins' | 'big'
  const [hasNew,     setHasNew]     = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    axios.get('/api/games/live-feed')
      .then(r => setLiveFeed(r.data.map(e => ({ ...e, timestamp: e.created_at }))))
      .catch(() => {})
  }, [])

  // Notification point rouge si panel fermé
  useEffect(() => {
    if (!open && liveFeed.length > 0) setHasNew(true)
  }, [liveFeed])

  useEffect(() => {
    if (open) setHasNew(false)
  }, [open])

  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, tab])

  function handleSend(e) {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChatMessage(chatInput)
    setChatInput('')
  }

  const filteredFeed = liveFeed.filter(e => {
    if (feedFilter === 'wins') return e.payout > e.bet
    if (feedFilter === 'big') return e.payout >= e.bet * 3
    return true
  })

  return (
    <>
      {/* ── Bouton flottant ── */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: open ? 328 : 24,
          zIndex: 500,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1E1015, #2A1520)',
          border: `2px solid ${open ? '#F0B429' : 'rgba(240,180,41,0.4)'}`,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 ${open ? 20 : 10}px rgba(240,180,41,${open ? 0.3 : 0.1})`,
          cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}
        title={open ? 'Fermer' : 'Activité en direct'}
      >
        {open ? '✕' : (tab === 'chat' ? '💬' : '📡')}
        {hasNew && !open && (
          <div style={{
            position: 'absolute', top: 4, right: 4,
            width: 10, height: 10, borderRadius: '50%',
            background: '#22C55E',
            animation: 'pulseDot 1.4s ease-in-out infinite',
            border: '2px solid #0C0608',
          }} />
        )}
      </button>

      {/* ── Panel ── */}
      <div style={{
        position: 'fixed', right: 0, top: 60, bottom: 0,
        width: 310,
        background: 'linear-gradient(180deg, #130A0D, #0C0608)',
        borderLeft: '1px solid rgba(240,180,41,0.15)',
        zIndex: 400,
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.5)' : 'none',
      }}>

        {/* Header panel */}
        <div style={{
          padding: '14px 16px 0',
          borderBottom: '1px solid rgba(240,180,41,0.1)',
          flexShrink: 0,
        }}>
          {/* Onglets */}
          <div style={{ display: 'flex', gap: 4, paddingBottom: 12 }}>
            <TabBtn active={tab === 'feed'} onClick={() => setTab('feed')} icon="📡" label="Live" />
            <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} icon="💬" label="Chat" />
          </div>

          {/* Filtres Feed */}
          {tab === 'feed' && (
            <div style={{ display: 'flex', gap: 4, paddingBottom: 10 }}>
              {[['all','Tout'],['wins','Gains'],['big','🔥 Gros']].map(([f,l]) => (
                <button key={f} onClick={() => setFeedFilter(f)} style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 10,
                  fontFamily: 'Cinzel, serif',
                  background: feedFilter === f ? 'rgba(240,180,41,0.15)' : 'transparent',
                  border: `1px solid ${feedFilter === f ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: feedFilter === f ? '#F0B429' : 'rgba(245,230,200,0.4)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {l}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: connected ? '#22C55E' : '#EF4444',
                  animation: connected ? 'pulseDot 1.4s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: 9, color: 'rgba(245,230,200,0.3)', fontFamily: 'Cinzel, serif' }}>
                  {connected ? 'LIVE' : 'OFF'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {tab === 'feed' ? (
            <>
              {filteredFeed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(245,230,200,0.2)', fontFamily: 'Crimson Pro, serif', fontSize: 13 }}>
                  Aucune activité pour l'instant…
                </div>
              ) : (
                filteredFeed.map((e, i) => {
                  const isWin = e.payout > e.bet
                  const isBig = e.payout >= e.bet * 3
                  const mult = e.multiplier || (e.bet > 0 ? e.payout / e.bet : 0)
                  return (
                    <div key={i} style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: i === 0 ? 'rgba(240,180,41,0.04)' : isBig ? 'rgba(34,197,94,0.04)' : 'transparent',
                      transition: 'background 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{GAME_ICONS[e.game] || '🎲'}</span>
                          <div>
                            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 600, color: '#F5E6C8' }}>
                              {e.username}
                            </span>
                            <div style={{ fontSize: 9, color: 'rgba(245,230,200,0.3)', fontFamily: 'Crimson Pro, serif' }}>
                              {GAME_NAMES[e.game]} · {timeAgo(e.timestamp || e.created_at)}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 12, fontWeight: 700,
                            color: isWin ? (isBig ? '#FFD700' : '#22C55E') : 'rgba(245,230,200,0.25)',
                          }}>
                            {isWin ? `+${e.payout.toLocaleString('fr-FR')}` : `-${e.bet?.toLocaleString('fr-FR')}`}
                            {isBig && ' 🔥'}
                          </div>
                          {isWin && mult > 1.5 && (
                            <div style={{ fontSize: 9, color: 'rgba(240,180,41,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                              ×{mult.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          ) : (
            /* ── Chat ── */
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '8px 0' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(245,230,200,0.2)', fontFamily: 'Crimson Pro, serif', fontSize: 13 }}>
                  Sois le premier à écrire !
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: 700, color: msg.rankColor || '#F0B429' }}>
                        {msg.rankIcon} {msg.username}
                      </span>
                      <span style={{ fontSize: 9, color: 'rgba(245,230,200,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {timeAgo(msg.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.8)', lineHeight: 1.4 }}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input chat */}
        {tab === 'chat' && (
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(240,180,41,0.1)',
            flexShrink: 0,
          }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ton message..."
                maxLength={200}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(240,180,41,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#F5E6C8',
                  fontFamily: 'Crimson Pro, serif',
                  fontSize: 13,
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(240,180,41,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(240,180,41,0.2)'}
              />
              <button type="submit" style={{
                background: 'rgba(240,180,41,0.15)',
                border: '1px solid rgba(240,180,41,0.3)',
                borderRadius: 8, padding: '8px 12px',
                color: '#F0B429', cursor: 'pointer', fontSize: 14,
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,180,41,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,180,41,0.15)'}
              >
                ➤
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 0', borderRadius: 8,
      fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
      background: active ? 'rgba(240,180,41,0.12)' : 'transparent',
      border: `1px solid ${active ? 'rgba(240,180,41,0.35)' : 'rgba(255,255,255,0.06)'}`,
      color: active ? '#F0B429' : 'rgba(245,230,200,0.35)',
      cursor: 'pointer', transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    }}>
      {icon} {label}
    </button>
  )
}
