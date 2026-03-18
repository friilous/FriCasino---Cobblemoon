import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const GAME_NAMES = {
  slots: 'Slot Machine', roulette: 'Roulette Pokémon',
  crash: 'Crash', blackjack: 'Blackjack', mines: 'Mines', plinko: 'Plinko',
}
const GAME_ICONS = {
  slots: '🎰', roulette: '🎯', crash: '📈',
  blackjack: '🃏', mines: '💣', plinko: '🪀',
}

export default function GameGuard({ game, children }) {
  const { gameSettings } = useSocket()
  const enabled = gameSettings[game] !== false

  if (!enabled) {
    return (
      <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>← Lobby</Link>
          <span style={{ color: '#2a2a4a' }}>/</span>
          <span style={{ fontSize: 11, color: '#5a5a8a' }}>{GAME_ICONS[game]} {GAME_NAMES[game]}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            background: '#0a0a20', border: '1px solid rgba(240,192,64,0.2)',
            borderRadius: 16, padding: '40px 48px', textAlign: 'center', maxWidth: 400,
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔧</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f0c040', margin: '0 0 10px' }}>
              Machine temporairement désactivée
            </h2>
            <p style={{ fontSize: 13, color: '#5a5a8a', lineHeight: 1.6, margin: '0 0 24px' }}>
              {GAME_ICONS[game]} <strong style={{ color: '#9898b8' }}>{GAME_NAMES[game]}</strong> est
              momentanément indisponible. Reviens dans quelques instants !
            </p>
            <p style={{ fontSize: 11, color: '#2e2e50', margin: '0 0 24px' }}>
              Un problème ? Contacte <span style={{ color: '#f0c040' }}>Frilous</span> sur Discord (<span style={{ color: '#f0c040' }}>.Frilous</span>)
            </p>
            <Link to="/casino" style={{
              display: 'inline-block', background: '#f0c040', color: '#07071a',
              fontWeight: 800, fontSize: 13, padding: '10px 24px', borderRadius: 8, textDecoration: 'none',
            }}>
              ← Retour au lobby
            </Link>
          </div>
        </div>
      </div>
    )
  }
  return children
}
