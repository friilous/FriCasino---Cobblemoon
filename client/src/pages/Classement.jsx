import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const GAMES = ['all', 'slots', 'plinko', 'roulette', 'crash', 'blackjack', 'mines']
const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }
const GAME_NAMES = { all: 'Tous les jeux', slots: 'Slots', plinko: 'Plinko', roulette: 'Roulette', crash: 'Crash', blackjack: 'Blackjack', mines: 'Mines' }

const TABS = [
  { id: 'topProfit',  label: '💰 Meilleur bilan' },
  { id: 'topWins',    label: '🔥 Plus gros gains' },
  { id: 'topBet',     label: '🎲 Plus grosses mises' },
  { id: 'mostPlayed', label: '🎮 Plus actifs' },
]

export default function Classement() {
  const [data,    setData]    = useState(null)
  const [tab,     setTab]     = useState('topProfit')
  const [game,    setGame]    = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [game])

  async function load() {
    setLoading(true)
    try {
      const params = game !== 'all' ? { game } : {}
      const { data: d } = await axios.get('/api/games/leaderboard', { params })
      setData(d)
    } catch {}
    setLoading(false)
  }

  const MEDAL = ['🥇', '🥈', '🥉']

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Link to="/casino" style={{ fontSize: 11, color: '#44446a', textDecoration: 'none' }}>← Accueil</Link>
        <span style={{ color: '#2a2a4a' }}>/</span>
        <span style={{ fontSize: 11, color: '#9898b8' }}>🏆 Classement</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#d8d8f0', margin: 0 }}>🏆 Classement</h1>
        {/* Filtre par jeu */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {GAMES.map(g => (
            <button key={g} onClick={() => setGame(g)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: game === g ? '1px solid rgba(240,192,64,0.4)' : '1px solid #2a2a4a',
              background: game === g ? 'rgba(240,192,64,0.12)' : 'transparent',
              color: game === g ? '#f0c040' : '#5a5a8a',
            }}>
              {g === 'all' ? '🎯 Tous' : `${GAME_ICONS[g]} ${GAME_NAMES[g]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs catégories */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #1e1e40', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: tab === t.id ? 'rgba(240,192,64,0.12)' : 'transparent',
            color: tab === t.id ? '#f0c040' : '#5a5a8a',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#2e2e50', padding: '40px 0', fontSize: 13 }}>Chargement...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', color: '#2e2e50', padding: '40px 0' }}>Erreur de chargement</div>
      ) : (
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
          {tab === 'topProfit' && (
            <LeaderTable
              rows={data.topProfit}
              cols={[
                { key: 'username',     label: 'Joueur',        render: (v, r, i) => <PlayerCell username={v} medal={MEDAL[i]} /> },
                { key: 'games_played', label: 'Parties',       render: v => parseInt(v).toLocaleString(), align: 'right' },
                { key: 'total_bet',    label: 'Misé',          render: v => parseInt(v).toLocaleString(), align: 'right' },
                { key: 'total_profit', label: 'Bilan net',
                  render: v => <span style={{ fontWeight: 800, color: v > 0 ? '#40f080' : '#f06060' }}>
                    {v > 0 ? '+' : ''}{parseInt(v).toLocaleString()}
                  </span>, align: 'right' },
              ]}
            />
          )}

          {tab === 'topWins' && (
            <LeaderTable
              rows={data.topWins}
              cols={[
                { key: 'username', label: 'Joueur',   render: (v, r, i) => <PlayerCell username={v} medal={MEDAL[i]} /> },
                { key: 'game',     label: 'Jeu',      render: v => `${GAME_ICONS[v] || '🎲'} ${GAME_NAMES[v] || v}` },
                { key: 'bet',      label: 'Mise',     render: v => parseInt(v).toLocaleString(), align: 'right' },
                { key: 'payout',   label: 'Gain',     render: v => <span style={{ fontWeight: 800, color: '#f0c040' }}>{parseInt(v).toLocaleString()}</span>, align: 'right' },
                { key: 'bet_id',   label: 'Ref',      render: v => <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#44446a' }}>{v}</span> },
              ]}
            />
          )}

          {tab === 'topBet' && (
            <LeaderTable
              rows={data.topBet}
              cols={[
                { key: 'username', label: 'Joueur',    render: (v, r, i) => <PlayerCell username={v} medal={MEDAL[i]} /> },
                { key: 'game',     label: 'Jeu',       render: v => `${GAME_ICONS[v] || '🎲'} ${GAME_NAMES[v] || v}` },
                { key: 'bet',      label: 'Mise',      render: v => <span style={{ fontWeight: 800, color: '#f0c040' }}>{parseInt(v).toLocaleString()}</span>, align: 'right' },
                { key: 'payout',   label: 'Résultat',  render: (v, r) => <span style={{ color: v > r.bet ? '#40f080' : '#f06060' }}>{parseInt(v).toLocaleString()}</span>, align: 'right' },
                { key: 'bet_id',   label: 'Ref',       render: v => <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#44446a' }}>{v}</span> },
              ]}
            />
          )}

          {tab === 'mostPlayed' && (
            <LeaderTable
              rows={data.mostPlayed}
              cols={[
                { key: 'username',     label: 'Joueur',   render: (v, r, i) => <PlayerCell username={v} medal={MEDAL[i]} /> },
                { key: 'games_played', label: 'Parties',  render: v => <span style={{ fontWeight: 800, color: '#f0c040' }}>{parseInt(v).toLocaleString()}</span>, align: 'right' },
                { key: 'total_bet',    label: 'Misé au total', render: v => parseInt(v).toLocaleString(), align: 'right' },
              ]}
            />
          )}
        </div>
      )}
    </div>
  )
}

function LeaderTable({ rows, cols }) {
  if (!rows || rows.length === 0) {
    return <div style={{ textAlign: 'center', color: '#2e2e50', padding: '24px 0', fontSize: 12 }}>Aucune donnée</div>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e1e40' }}>
            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#44446a', fontWeight: 600, width: 40 }}>#</th>
            {cols.map(c => (
              <th key={c.key} style={{ padding: '8px 10px', textAlign: c.align || 'left', color: '#44446a', fontWeight: 600 }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{
              borderBottom: '1px solid #0f0f28',
              background: i === 0 ? 'rgba(240,192,64,0.03)' : 'transparent',
            }}>
              <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 14 }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : <span style={{ color: '#44446a' }}>{i + 1}</span>}
              </td>
              {cols.map(c => (
                <td key={c.key} style={{ padding: '9px 10px', textAlign: c.align || 'left', color: '#9898b8' }}>
                  {c.render ? c.render(row[c.key], row, i) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlayerCell({ username, medal }) {
  return (
    <Link to={`/joueur/${username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: '#1a1a3a', border: '1px solid rgba(240,192,64,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, color: '#f0c040', fontWeight: 700, flexShrink: 0,
      }}>
        {username?.slice(0, 2).toUpperCase()}
      </div>
      <span style={{ fontWeight: 600, color: '#d8d8f0' }}>{username}</span>
    </Link>
  )
}
