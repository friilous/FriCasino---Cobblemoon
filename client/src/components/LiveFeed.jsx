import { useSocket } from '../contexts/SocketContext'
import { useEffect } from 'react'
import axios from 'axios'

const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎡' }
const GAME_NAMES = { slots: 'Slots', plinko: 'Plinko', roulette: 'Roulette' }

export default function LiveFeed({ compact = false }) {
  const { liveFeed, setLiveFeed } = useSocket()

  useEffect(() => {
    axios.get('/api/games/live-feed')
      .then(r => setLiveFeed(r.data.map(e => ({ ...e, timestamp: e.created_at }))))
      .catch(() => {})
  }, [])

  if (compact) {
    // Version compacte pour les pages de jeux
    return (
      <div className="card p-3">
        <h4 className="text-casino-gold font-semibold text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
          Live
        </h4>
        {liveFeed.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-2">Aucune activité récente</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {liveFeed.slice(0, 8).map((event, i) => {
              const mult = event.multiplier || (event.bet > 0 ? event.payout / event.bet : 0)
              return (
                <div key={`${event.timestamp}-${i}`}
                  className={`flex items-center justify-between text-xs py-1
                    ${i === 0 ? 'animate-slide-in' : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span>{GAME_ICONS[event.game]}</span>
                    <span className="text-gray-400 truncate">{event.username}</span>
                  </div>
                  <span className={`font-bold shrink-0 ml-2 ${event.payout > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    {event.payout > 0 ? `+${event.payout.toLocaleString()}` : `-${event.bet?.toLocaleString()}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Version complète pour la Home et le Lobby
  return (
    <div className="card overflow-hidden">
      <h3 className="text-casino-gold font-casino font-bold text-lg mb-4 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Activité en direct
      </h3>
      {liveFeed.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">Aucune activité — sois le premier à jouer ! 🎲</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {liveFeed.map((event, i) => (
            <FeedItem key={`${event.timestamp}-${i}`} event={event} isNew={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeedItem({ event, isNew }) {
  const multiplier = event.multiplier || (event.bet > 0 ? event.payout / event.bet : 0)
  const isJackpot  = multiplier >= 10

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg transition-all
      ${isNew ? 'animate-slide-in bg-casino-gold/10 border border-casino-gold/20' : 'bg-casino-bg/60'}
      ${isJackpot ? 'border border-yellow-400/40' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{GAME_ICONS[event.game] || '🎲'}</span>
        <div>
          <span className="text-white text-sm font-medium">{event.username}</span>
          <span className="text-gray-500 text-xs ml-1">sur {GAME_NAMES[event.game]}</span>
        </div>
      </div>
      <div className="text-right">
        {event.payout > 0 ? (
          <>
            <div className={`text-sm font-bold ${isJackpot ? 'text-yellow-400' : 'text-green-400'}`}>
              +{event.payout.toLocaleString()} {isJackpot ? '🏆' : ''}
            </div>
            <div className="text-xs text-gray-500">x{multiplier.toFixed(1)}</div>
          </>
        ) : (
          <div className="text-sm text-gray-600">-{event.bet?.toLocaleString()}</div>
        )}
      </div>
    </div>
  )
}
