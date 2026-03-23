import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const GAME_NAMES = {
  slots: 'Slot Machine', roulette: 'Roulette',
  blackjack: 'Blackjack', mines: 'Mines', plinko: 'Plinko',
}
const GAME_ICONS = {
  slots: '🎰', roulette: '🎡',
  blackjack: '🃏', mines: '💣', plinko: '⚪',
}

export default function GameGuard({ game, children }) {
  const { gameSettings } = useSocket()
  const enabled = gameSettings[game] !== false

  if (!enabled) {
    return (
      <div style={{
        minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40,
      }}>
        <div style={{
          maxWidth: 400, textAlign: 'center',
          background: 'linear-gradient(135deg, #1E1015, #150D10)',
          border: '1px solid rgba(240,180,41,0.2)',
          borderRadius: 20, padding: '48px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔧</div>
          <h2 style={{
            fontFamily: 'Cinzel Decorative, serif',
            fontSize: 18, fontWeight: 700, color: '#F0B429',
            marginBottom: 12,
          }}>
            Machine en maintenance
          </h2>
          <p style={{
            fontFamily: 'Crimson Pro, serif',
            fontSize: 15, color: 'rgba(245,230,200,0.6)',
            lineHeight: 1.7, marginBottom: 8,
          }}>
            {GAME_ICONS[game]} <strong style={{ color: 'rgba(245,230,200,0.9)' }}>{GAME_NAMES[game]}</strong> est
            momentanément indisponible. Reviens dans quelques instants !
          </p>
          <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 12, color: 'rgba(245,230,200,0.3)', marginBottom: 32 }}>
            Un problème ? Contacte <span style={{ color: '#F0B429' }}>Frilous</span> sur Discord
          </p>
          <Link to="/machines" style={{ textDecoration: 'none' }}>
            <button style={{
              fontFamily: 'Cinzel, serif',
              background: 'linear-gradient(135deg, #FFD700, #F0B429)',
              color: '#1A0A00', fontWeight: 700, fontSize: 13,
              padding: '12px 28px', borderRadius: 10, border: 'none',
              cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',
              boxShadow: '0 4px 20px rgba(240,180,41,0.35)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              ← Retour aux machines
            </button>
          </Link>
        </div>
      </div>
    )
  }
  return children
}
