import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }
const GAME_NAMES = { slots: 'Slots', plinko: 'Plinko', roulette: 'Roulette', crash: 'Crash', blackjack: 'Blackjack', mines: 'Mines' }

const FILTERS = [
  { id: 'all',      label: 'Tout' },
  { id: 'wins',     label: '✅ Gains' },
  { id: 'losses',   label: '❌ Pertes' },
  { id: 'big_wins', label: '🔥 Gros gains' },
]

export default function Profile() {
  const { user } = useAuth()
  const [history,       setHistory]       = useState(null)
  const [gameHistory,   setGameHistory]   = useState([])
  const [tab,           setTab]           = useState('stats')
  const [histFilter,    setHistFilter]    = useState('all')
  const [histPage,      setHistPage]      = useState(0)
  const [histTotal,     setHistTotal]     = useState(0)
  const [loadingHist,   setLoadingHist]   = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMsg,   setWithdrawMsg]   = useState('')
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  const LIMIT = 20

  useEffect(() => {
    axios.get('/api/wallet/history').then(r => setHistory(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'history') loadGameHistory()
  }, [tab, histFilter, histPage])

  async function loadGameHistory() {
    setLoadingHist(true)
    try {
      const { data } = await axios.get('/api/games/history', {
        params: { filter: histFilter, limit: LIMIT, offset: histPage * LIMIT },
      })
      setGameHistory(data.history)
      setHistTotal(data.total)
    } catch {}
    setLoadingHist(false)
  }

  async function handleWithdraw(e) {
    e.preventDefault()
    setWithdrawMsg(''); setWithdrawError(''); setWithdrawLoading(true)
    try {
      const { data } = await axios.post('/api/wallet/withdraw', { amount: parseInt(withdrawAmount) })
      setWithdrawMsg(data.message)
      setWithdrawAmount('')
      const r = await axios.get('/api/wallet/history')
      setHistory(r.data)
    } catch (err) {
      setWithdrawError(err.response?.data?.error || 'Erreur')
    } finally {
      setWithdrawLoading(false)
    }
  }

  // Stats calculées depuis l'historique wallet
  const games      = history?.games || []
  const totalWon   = games.reduce((s, g) => s + (g.payout > g.bet ? g.payout - g.bet : 0), 0)
  const totalLost  = games.reduce((s, g) => s + (g.payout < g.bet ? g.bet - g.payout : 0), 0)
  const netPnl     = totalWon - totalLost
  const gamesCount = games.length
  const winCount   = games.filter(g => g.payout > g.bet).length
  const winRate    = gamesCount > 0 ? Math.round((winCount / gamesCount) * 100) : 0
  const biggestWin = games.reduce((m, g) => Math.max(m, g.payout - g.bet), 0)

  // Stats par jeu
  const byGame = games.reduce((acc, g) => {
    if (!acc[g.game]) acc[g.game] = { plays: 0, profit: 0, wins: 0 }
    acc[g.game].plays++
    acc[g.game].profit += g.payout - g.bet
    if (g.payout > g.bet) acc[g.game].wins++
    return acc
  }, {})

  const totalPages = Math.ceil(histTotal / LIMIT)

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: '#1a1a3a', border: '2px solid rgba(240,192,64,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#f0c040', fontWeight: 800,
        }}>
          {user?.username?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#d8d8f0', margin: 0 }}>
            {user?.username}
          </h1>
          <p style={{ fontSize: 11, color: '#44446a', margin: '2px 0 0' }}>Mon profil & statistiques</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Link to={`/joueur/${user?.username}`} style={{
            fontSize: 11, color: '#5a5a8a', textDecoration: 'none',
            padding: '5px 12px', border: '1px solid #2a2a4a', borderRadius: 8,
          }}>
            👁️ Voir profil public
          </Link>
        </div>
      </div>

      {/* Solde + retrait */}
      <div style={{
        background: '#0a0a20', border: '1px solid rgba(240,192,64,0.25)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1 }}>Solde</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f0c040' }}>
            {(user?.balance || 0).toLocaleString()}
            <span style={{ fontSize: 11, color: '#666', fontWeight: 400, marginLeft: 6 }}>jetons</span>
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: '#2a2a4a' }} />
        <form onSubmit={handleWithdraw} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
          <input
            type="number"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            placeholder="Montant à retirer (min 100)"
            min={100} max={user?.balance}
            style={{
              flex: 1, background: '#07071a',
              border: '1px solid #2a2a4a', borderRadius: 8,
              padding: '9px 14px', color: '#d8d8f0', fontSize: 13, outline: 'none',
            }}
          />
          <button type="submit" disabled={withdrawLoading || !withdrawAmount} style={{
            background: '#f0c040', color: '#07071a', fontWeight: 800,
            padding: '9px 18px', borderRadius: 8, border: 'none',
            cursor: withdrawLoading || !withdrawAmount ? 'not-allowed' : 'pointer',
            opacity: withdrawLoading || !withdrawAmount ? 0.5 : 1, flexShrink: 0,
          }}>
            {withdrawLoading ? '...' : '💸 Retirer'}
          </button>
        </form>
      </div>
      {withdrawMsg && <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(64,240,128,0.08)', border: '1px solid rgba(64,240,128,0.2)', borderRadius: 8, fontSize: 12, color: '#40f080' }}>{withdrawMsg}</div>}
      {withdrawError && <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.2)', borderRadius: 8, fontSize: 12, color: '#f06060' }}>{withdrawError}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'stats',        label: '📊 Statistiques' },
          { id: 'history',      label: '🎮 Historique parties' },
          { id: 'transactions', label: '📋 Transactions' },
          { id: 'withdrawals',  label: '💸 Retraits' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: tab === t.id ? 'rgba(240,192,64,0.12)' : 'transparent',
            color: tab === t.id ? '#f0c040' : '#5a5a8a',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <StatCard label="Parties jouées" value={gamesCount} icon="🎮" />
            <StatCard label="Taux de victoire" value={`${winRate}%`} icon="🎯" color={winRate > 50 ? '#40f080' : '#f06060'} />
            <StatCard label="Bilan net" value={`${netPnl >= 0 ? '+' : ''}${netPnl.toLocaleString()}`} icon="💰"
              color={netPnl >= 0 ? '#40f080' : '#f06060'} />
            <StatCard label="Plus gros gain" value={`+${biggestWin.toLocaleString()}`} icon="🔥" color="#f0c040" />
          </div>

          {/* Stats par jeu */}
          {Object.keys(byGame).length > 0 && (
            <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: '0 0 14px' }}>
                Statistiques par jeu
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e40' }}>
                      {['Jeu', 'Parties', 'Victoires', 'Taux', 'Bilan'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Jeu' ? 'left' : 'right', color: '#44446a', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byGame).sort((a, b) => b[1].plays - a[1].plays).map(([game, s]) => (
                      <tr key={game} style={{ borderBottom: '1px solid #0f0f28' }}>
                        <td style={{ padding: '9px 10px', color: '#c8c8e8', fontWeight: 600 }}>
                          {GAME_ICONS[game]} {GAME_NAMES[game] || game}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#9898b8' }}>{s.plays}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#9898b8' }}>{s.wins}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: s.wins / s.plays > 0.5 ? '#40f080' : '#f06060' }}>
                          {Math.round(s.wins / s.plays * 100)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: s.profit >= 0 ? '#40f080' : '#f06060' }}>
                          {s.profit >= 0 ? '+' : ''}{s.profit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {gamesCount === 0 && (
            <EmptyState text="Aucune partie jouée pour l'instant" />
          )}
        </div>
      )}

      {/* Historique parties avec filtres */}
      {tab === 'history' && (
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => { setHistFilter(f.id); setHistPage(0) }} style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: histFilter === f.id ? '1px solid rgba(240,192,64,0.4)' : '1px solid #2a2a4a',
                background: histFilter === f.id ? 'rgba(240,192,64,0.12)' : 'transparent',
                color: histFilter === f.id ? '#f0c040' : '#5a5a8a',
              }}>
                {f.label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#44446a', alignSelf: 'center' }}>
              {histTotal} résultats
            </span>
          </div>

          {loadingHist ? (
            <div style={{ textAlign: 'center', color: '#2e2e50', padding: '20px 0', fontSize: 12 }}>Chargement...</div>
          ) : gameHistory.length === 0 ? (
            <EmptyState text="Aucune partie dans cette catégorie" />
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e40' }}>
                      {['#BetID', 'Jeu', 'Mise', 'Gain', 'Résultat', 'Date'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h === '#BetID' || h === 'Jeu' ? 'left' : 'right', color: '#44446a', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gameHistory.map(g => (
                      <tr key={g.id} style={{ borderBottom: '1px solid #0f0f28' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 10, color: '#5a5a8a' }}>
                          {g.bet_id}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#c8c8e8' }}>
                          {GAME_ICONS[g.game]} {GAME_NAMES[g.game] || g.game}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#9898b8' }}>
                          {parseInt(g.bet).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#9898b8' }}>
                          {parseInt(g.payout).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700,
                          color: g.profit > 0 ? '#40f080' : g.profit < 0 ? '#f06060' : '#8888cc' }}>
                          {g.profit > 0 ? '+' : ''}{parseInt(g.profit).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#44446a' }}>
                          {new Date(g.created_at).toLocaleString('fr')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                  <button onClick={() => setHistPage(p => Math.max(0, p - 1))} disabled={histPage === 0}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: histPage === 0 ? '#2a2a4a' : '#9898b8', cursor: histPage === 0 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                    ← Préc
                  </button>
                  <span style={{ padding: '5px 12px', fontSize: 12, color: '#5a5a8a' }}>
                    {histPage + 1} / {totalPages}
                  </span>
                  <button onClick={() => setHistPage(p => Math.min(totalPages - 1, p + 1))} disabled={histPage >= totalPages - 1}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: histPage >= totalPages - 1 ? '#2a2a4a' : '#9898b8', cursor: histPage >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                    Suiv →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
          {!history ? <LoadingState /> :
            history.transactions.length === 0 ? <EmptyState text="Aucune transaction" /> :
            history.transactions.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #0f0f28', fontSize: 12 }}>
                <div>
                  <div style={{ color: '#c8c8e8' }}>{tx.description || tx.type}</div>
                  <div style={{ fontSize: 10, color: '#44446a' }}>{new Date(tx.created_at).toLocaleString('fr')}</div>
                </div>
                <div style={{ fontWeight: 700, color: ['credit','win'].includes(tx.type) ? '#40f080' : '#f06060' }}>
                  {['credit','win'].includes(tx.type) ? '+' : '-'}{tx.amount.toLocaleString()}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Retraits */}
      {tab === 'withdrawals' && (
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
          {!history ? <LoadingState /> :
            history.withdrawals.length === 0 ? <EmptyState text="Aucun retrait" /> :
            history.withdrawals.map(w => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #0f0f28', fontSize: 12 }}>
                <div>
                  <div style={{ color: '#c8c8e8', fontWeight: 600 }}>{w.amount.toLocaleString()} jetons</div>
                  <div style={{ fontSize: 10, color: '#44446a' }}>{new Date(w.created_at).toLocaleString('fr')}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 10,
                  background: w.status === 'approved' ? 'rgba(64,240,128,0.12)' : w.status === 'rejected' ? 'rgba(240,64,64,0.12)' : 'rgba(240,192,64,0.12)',
                  color: w.status === 'approved' ? '#40f080' : w.status === 'rejected' ? '#f06060' : '#f0c040',
                }}>
                  {w.status === 'approved' ? '✅ Approuvé' : w.status === 'rejected' ? '❌ Refusé' : '⏳ En attente'}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color = '#d8d8f0' }) {
  return (
    <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#44446a', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function EmptyState({ text }) {
  return <div style={{ textAlign: 'center', color: '#2e2e50', padding: '24px 0', fontSize: 12 }}>{text}</div>
}

function LoadingState() {
  return <div style={{ textAlign: 'center', color: '#2e2e50', padding: '24px 0', fontSize: 12 }}>Chargement...</div>
}
