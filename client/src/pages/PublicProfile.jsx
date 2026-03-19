import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }
const GAME_NAMES = { slots: 'Slots', plinko: 'Plinko', roulette: 'Roulette', crash: 'Crash', blackjack: 'Blackjack', mines: 'Mines' }

export default function PublicProfile() {
  const { username } = useParams()
  const [data,    setData]    = useState(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    axios.get(`/api/games/player/${username}`)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Joueur introuvable'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#2e2e50', fontSize: 13 }}>
      Chargement...
    </div>
  )

  if (error) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
      <div style={{ color: '#f06060', fontSize: 14, marginBottom: 8 }}>{error}</div>
      <Link to="/classement" style={{ color: '#5a5a8a', fontSize: 12 }}>← Retour au classement</Link>
    </div>
  )

  const { stats, by_game, big_wins, member_since } = data

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to="/classement" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>← Classement</Link>
        <span style={{ color: '#2a2a4a' }}>/</span>
        <span style={{ fontSize: 11, color: '#9898b8' }}>{data.username}</span>
      </div>

      {/* Header joueur */}
      <div style={{
        background: '#0a0a20', border: '1px solid rgba(240,192,64,0.2)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: '#1a1a3a', border: '2px solid rgba(240,192,64,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#f0c040', fontWeight: 800,
        }}>
          {data.username?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#d8d8f0', margin: '0 0 4px' }}>
            {data.username}
          </h1>
          <div style={{ fontSize: 11, color: '#44446a' }}>
            Membre depuis {new Date(member_since).toLocaleDateString('fr')}
          </div>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: stats.net_profit >= 0 ? 'rgba(64,240,128,0.08)' : 'rgba(240,64,64,0.08)',
          border: `1px solid ${stats.net_profit >= 0 ? 'rgba(64,240,128,0.2)' : 'rgba(240,64,64,0.2)'}`,
          borderRadius: 10, padding: '10px 18px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Bilan net
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: stats.net_profit >= 0 ? '#40f080' : '#f06060' }}>
            {stats.net_profit >= 0 ? '+' : ''}{stats.net_profit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stats globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard icon="🎮" label="Parties jouées" value={stats.games_played.toLocaleString()} />
        <StatCard icon="🪙" label="Total misé" value={stats.total_bet.toLocaleString()} />
        <StatCard icon="💰" label="Total gagné" value={stats.total_payout.toLocaleString()} />
        <StatCard icon="🔥" label="Plus gros gain" value={`+${stats.biggest_profit.toLocaleString()}`} color="#f0c040" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Stats par jeu */}
        {by_game && by_game.length > 0 && (
          <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: '0 0 14px' }}>
              Statistiques par jeu
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {by_game.map(g => (
                <div key={g.game} style={{
                  background: '#07071a', borderRadius: 8, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{GAME_ICONS[g.game] || '🎲'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#c8c8e8', marginBottom: 2 }}>
                      {GAME_NAMES[g.game] || g.game}
                    </div>
                    <div style={{ fontSize: 10, color: '#44446a' }}>
                      {parseInt(g.plays)} parties · meilleur gain {parseInt(g.best_win).toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 800,
                    color: g.profit >= 0 ? '#40f080' : '#f06060',
                  }}>
                    {g.profit >= 0 ? '+' : ''}{parseInt(g.profit).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gros coups */}
        {big_wins && big_wins.length > 0 && (
          <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: '0 0 14px' }}>
              🔥 Gros coups
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {big_wins.map((w, i) => (
                <div key={i} style={{
                  background: '#07071a',
                  border: '1px solid rgba(240,192,64,0.1)',
                  borderRadius: 8, padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{GAME_ICONS[w.game] || '🎲'}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#c8c8e8' }}>
                        {GAME_NAMES[w.game] || w.game}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#44446a', marginTop: 2 }}>
                      Mise {parseInt(w.bet).toLocaleString()} · {w.bet_id}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f0c040' }}>
                      +{parseInt(w.profit).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 9, color: '#44446a' }}>
                      {new Date(w.created_at).toLocaleDateString('fr')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color = '#d8d8f0' }) {
  return (
    <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#44446a', marginTop: 3 }}>{label}</div>
    </div>
  )
}
