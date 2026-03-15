import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [liveFeed, setLiveFeed] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = io('/', { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('live_feed', (event) => {
      setLiveFeed(prev => [event, ...prev].slice(0, 30))
    })

    return () => socket.disconnect()
  }, [])

  // Rejoindre la room utilisateur pour les mises à jour de solde
  useEffect(() => {
    if (socketRef.current && user) {
      socketRef.current.emit('join_user', user.id)
      if (user.is_admin) {
        socketRef.current.emit('join_admin')
      }
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, liveFeed, setLiveFeed, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
