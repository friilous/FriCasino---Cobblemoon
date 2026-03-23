import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [socket,       setSocket]       = useState(null)
  const [liveFeed,     setLiveFeed]     = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [connected,    setConnected]    = useState(false)
  const [lastBet,      setLastBet]      = useState(0)
  const [gameSettings, setGameSettings] = useState({
    slots: true, roulette: true, blackjack: true, mines: true, plinko: true,
  })

  useEffect(() => {
    const sock = io(import.meta.env.VITE_API_URL, { transports: ['websocket'] })
    socketRef.current = sock
    setSocket(sock)

    sock.on('connect',    () => setConnected(true))
    sock.on('disconnect', () => setConnected(false))

    sock.on('live_feed', (event) => {
      setLiveFeed(prev => [event, ...prev].slice(0, 50))
    })

    sock.on('chat_message', (msg) => {
      setChatMessages(prev => [...prev, msg].slice(-100))
    })

    sock.on('game_settings_update', ({ game, enabled }) => {
      setGameSettings(prev => ({ ...prev, [game]: enabled }))
    })

    sock.on('balance_update', () => {
      setLastBet(n => n + 1)
    })

    return () => sock.disconnect()
  }, [])

  useEffect(() => {
    if (socket && user) {
      socket.emit('join_user', user.id)
      if (user.is_admin) socket.emit('join_admin')
    }
  }, [socket, user])

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/admin/game-settings')
      .then(r => r.json())
      .then(data => setGameSettings(prev => ({ ...prev, ...data })))
      .catch(() => {})
  }, [])

  function sendChatMessage(text) {
    if (socket && text.trim()) {
      socket.emit('chat_send', { text: text.trim() })
    }
  }

  return (
    <SocketContext.Provider value={{
      socket,
      liveFeed, setLiveFeed,
      chatMessages,
      sendChatMessage,
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
