import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [socket,       setSocket]       = useState(null)  // ← state réactif au lieu de ref
  const [liveFeed,     setLiveFeed]     = useState([])
  const [connected,    setConnected]    = useState(false)
  const [lastBet,      setLastBet]      = useState(0)  // s'incrémente à chaque mise du joueur
  const [gameSettings, setGameSettings] = useState({
    slots: true, roulette: true, crash: true,
    blackjack: true, mines: true, plinko: true, fishing: true,
  })

  useEffect(() => {
    const sock = io(import.meta.env.VITE_API_URL, { transports: ['websocket'] })
    socketRef.current = sock
    setSocket(sock)  // ← déclenche un re-render, Admin.jsx reçoit le vrai socket

    sock.on('connect',    () => setConnected(true))
    sock.on('disconnect', () => setConnected(false))
    sock.on('live_feed', (event) => {
      setLiveFeed(prev => [event, ...prev].slice(0, 30))
    })
    sock.on('game_settings_update', ({ game, enabled }) => {
      setGameSettings(prev => ({ ...prev, [game]: enabled }))
    })
    sock.on('balance_update', () => {
      setLastBet(n => n + 1)  // incrémente → déclenche useEffect dans les composants abonnés
    })

    return () => sock.disconnect()
  }, [])

  // Rejoindre les rooms
  useEffect(() => {
    if (socket && user) {
      socket.emit('join_user', user.id)
      if (user.is_admin) socket.emit('join_admin')
    }
  }, [socket, user])

  // Charger les settings initiaux
  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/admin/game-settings')
      .then(r => r.json())
      .then(data => setGameSettings(prev => ({ ...prev, ...data })))
      .catch(() => {})
  }, [])

  return (
    <SocketContext.Provider value={{
      socket,
      liveFeed, setLiveFeed,
      connected,
      lastBet,
      gameSettings,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}