import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [liveFeed,     setLiveFeed]     = useState([])
  const [connected,    setConnected]    = useState(false)
  const [gameSettings, setGameSettings] = useState({
    slots: true, roulette: true, crash: true,
    blackjack: true, mines: true, plinko: true,
  })

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('live_feed', (event) => {
      setLiveFeed(prev => [event, ...prev].slice(0, 30))
    })

    // Mise à jour en temps réel des paramètres de jeux
    socket.on('game_settings_update', ({ game, enabled }) => {
      setGameSettings(prev => ({ ...prev, [game]: enabled }))
    })

    return () => socket.disconnect()
  }, [])

  // Rejoindre les rooms
  useEffect(() => {
    if (socketRef.current && user) {
      socketRef.current.emit('join_user', user.id)
      if (user.is_admin) socketRef.current.emit('join_admin')
    }
  }, [user])

  // Charger les settings initiaux
  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/admin/game-settings')
      .then(r => r.json())
      .then(data => setGameSettings(prev => ({ ...prev, ...data })))
      .catch(() => {})
  }, [])

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      liveFeed, setLiveFeed,
      connected,
      gameSettings,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
