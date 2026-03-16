import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }

const S = {
  page:    { padding: '24px 28px', minHeight: '100vh', background: '#07071a' },
  title:   { fontSize: 20, fontWeight: 800, color: '#d8d8f0', margin: '0 0 20px' },
  card:    { background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18, marginBottom: 14 },
  cardGold:{ background: '#0a0a20', border: '1px solid rgba(240,192,64,0.25)', borderRadius: 12, padding: 18, marginBottom: 14 },
  label:   { fontSize: 9, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1 },
  value:   { fontSize: 22, fontWeight: 800, color: '#f0c040', marginTop: 4 },
  tab:     (active) => ({
    padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? 'rgba(240,192,64,0.12)' : 'transparent',
    color: active ? '#f0c040' : '#5a5a8a',
    transition: 'all 0.15s',
  }),
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid #12122a', fontSize: 12,
  },
}

export default function Profile() {
  const { user } = useAuth()
  const [history,        setHistory]        = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMsg,    setWithdrawMsg]    = useState('')
  const [withdrawError,  setWithdrawError]  = useState('')
  const [loading,        setLoading]        = useState(false)
  const [tab,            setTab]            = useState('games')

  useEffect(() => {
    axios.get('/api/wallet/history').then(r => setHistory(r.data)).catch(() => {})
  }, [])

  async function handleWithdraw(e) {
    e.preventDefault()
    setWithdrawMsg(''); setWithdrawError(''); setLoading(true)
    try {
      const { data } = await axios.post('/api/wallet/withdraw', { amount: parseInt(withdrawAmount) })
      setWithdrawMsg(data.message)
      setWithdrawAmount('')
      const r = await axios.get('/api/wallet/history')
      setHistory(r.data)
    } catch (err) {
      setWithdrawError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const totalWon  = history?.games?.reduce((s, g) => s + (g.payout > g.bet ? g.payout - g.bet : 0), 0) || 0
  const totalLost = history?.games?.reduce((s, g) => s + (g.payout < g.bet ? g.bet - g.payout : 0), 0) || 0
  const netPnl    = totalWon - totalLost

  return (
    <div style={S.page}>
      <h1 style={S.title}>Mon Profil</h1>

      {/* Stats rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={S.label}>Joueur</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#d8d8f0', marginTop: 6 }}>
            {user?.username}
          </div>
        </div>
        <div style={{ ...S.cardGold, textAlign: 'center' }}>
          <div style={S.label}>Solde</div>
          <div style={S.value}>{(user?.balance || 0).toLocaleString()}</div>
          <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>jetons</div>
        </div>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={S.label}>Bilan net</div>
          <div style={{
            fontSize: 18, fontWeight: 800, marginTop: 6,
            color: netPnl >= 0 ? '#40f080' : '#f06060',
          }}>
            {netPnl >= 0 ? '+' : ''}{netPnl.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>
            +{totalWon.toLocaleString()} / -{totalLost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Retrait */}
      <div style={S.cardGold}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f0c040', margin: '0 0 8px' }}>
          💸 Demande de retrait
        </h2>
        <p style={{ fontSize: 11, color: '#44446a', marginBottom: 14 }}>
          Entre le montant — Frilous te versera les Pokédollars en jeu après validation.
        </p>
        <form onSubmit={handleWithdraw} style={{ display: 'flex', gap: 10 }}>
          <input
            type="number"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            placeholder="Montant (min 100)"
            min={100}
            max={user?.balance}
            style={{
              flex: 1, background: '#07071a',
              border: '1px solid #2a2a4a', borderRadius: 8,
              padding: '9px 14px', color: '#d8d8f0', fontSize: 13, outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !withdrawAmount}
            style={{
              background: '#f0c040', color: '#07071a', fontWeight: 800,
              padding: '9px 20px', borderRadius: 8, border: 'none',
              cursor: loading || !withdrawAmount ? 'not-allowed' : 'pointer',
              opacity: loading || !withdrawAmount ? 0.5 : 1,
            }}
          >
            {loading ? '...' : 'Retirer'}
          </button>
        </form>
        {withdrawMsg && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: 'rgba(64,240,128,0.08)', border: '1px solid rgba(64,240,128,0.2)',
            borderRadius: 6, fontSize: 12, color: '#40f080',
          }}>
            {withdrawMsg}
          </div>
        )}
        {withdrawError && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.2)',
            borderRadius: 6, fontSize: 12, color: '#f06060',
          }}>
            {withdrawError}
          </div>
        )}
      </div>

      {/* Historique */}
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[
            { id: 'games',        label: '🎮 Parties'      },
            { id: 'transactions', label: '📋 Transactions'  },
            { id: 'withdrawals',  label: '💸 Retraits'      },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={S.tab(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {!history ? (
          <div style={{ textAlign: 'center', color: '#2e2e50', padding: '20px 0', fontSize: 12 }}>
            Chargement...
          </div>
        ) : tab === 'games' ? (
          history.games.length === 0
            ? <EmptyState text="Aucune partie jouée" />
            : history.games.map(g => (
              <div key={g.id} style={S.row}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{GAME_ICONS[g.game] || '🎲'}</span>
                  <div>
                    <div style={{ color: '#c8c8e8', fontWeight: 600, textTransform: 'capitalize' }}>{g.game}</div>
                    <div style={{ fontSize: 10, color: '#44446a' }}>Mise : {g.bet.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  color: g.payout >= g.bet ? '#40f080' : '#f06060',
                }}>
                  {g.payout >= g.bet ? '+' : ''}{(g.payout - g.bet).toLocaleString()}
                </div>
              </div>
            ))
        ) : tab === 'transactions' ? (
          history.transactions.length === 0
            ? <EmptyState text="Aucune transaction" />
            : history.transactions.map(tx => (
              <div key={tx.id} style={S.row}>
                <div>
                  <div style={{ color: '#c8c8e8' }}>{tx.description || tx.type}</div>
                  <div style={{ fontSize: 10, color: '#44446a' }}>
                    {new Date(tx.created_at).toLocaleString('fr')}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  color: ['credit','win'].includes(tx.type) ? '#40f080' : '#f06060',
                }}>
                  {['credit','win'].includes(tx.type) ? '+' : '-'}{tx.amount.toLocaleString()}
                </div>
              </div>
            ))
        ) : (
          history.withdrawals.length === 0
            ? <EmptyState text="Aucun retrait" />
            : history.withdrawals.map(w => (
              <div key={w.id} style={S.row}>
                <div>
                  <div style={{ color: '#c8c8e8' }}>{w.amount.toLocaleString()} jetons</div>
                  <div style={{ fontSize: 10, color: '#44446a' }}>
                    {new Date(w.created_at).toLocaleString('fr')}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                  background: w.status === 'approved' ? 'rgba(64,240,128,0.12)'
                    : w.status === 'rejected' ? 'rgba(240,64,64,0.12)'
                    : 'rgba(240,192,64,0.12)',
                  color: w.status === 'approved' ? '#40f080'
                    : w.status === 'rejected' ? '#f06060'
                    : '#f0c040',
                }}>
                  {w.status === 'approved' ? '✅ Approuvé'
                    : w.status === 'rejected' ? '❌ Refusé'
                    : '⏳ En attente'}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: 'center', color: '#2e2e50', padding: '20px 0', fontSize: 12 }}>
      {text}
    </div>
  )
}
