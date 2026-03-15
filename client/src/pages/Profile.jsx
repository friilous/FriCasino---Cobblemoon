import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎡' }

export default function Profile() {
  const { user } = useAuth()
  const [history, setHistory] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMsg, setWithdrawMsg] = useState('')
  const [withdrawError, setWithdrawError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('transactions')

  useEffect(() => {
    axios.get('/api/wallet/history').then(r => setHistory(r.data)).catch(() => {})
  }, [])

  async function handleWithdraw(e) {
    e.preventDefault()
    setWithdrawMsg('')
    setWithdrawError('')
    setLoading(true)
    try {
      const { data } = await axios.post('/api/wallet/withdraw', { amount: parseInt(withdrawAmount) })
      setWithdrawMsg(data.message)
      setWithdrawAmount('')
      // Refresh history
      const r = await axios.get('/api/wallet/history')
      setHistory(r.data)
    } catch (err) {
      setWithdrawError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const totalWon = history?.games?.reduce((s, g) => s + (g.payout > g.bet ? g.payout - g.bet : 0), 0) || 0
  const totalLost = history?.games?.reduce((s, g) => s + (g.payout < g.bet ? g.bet - g.payout : 0), 0) || 0

  return (
    <div className="min-h-screen bg-casino-bg py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-casino text-3xl font-bold text-gradient mb-8">Mon Profil</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-4xl mb-2">👤</div>
            <div className="font-casino text-xl font-bold text-white">{user?.username}</div>
            <div className="text-gray-500 text-sm mt-1">Joueur</div>
          </div>
          <div className="card text-center border-casino-gold/30">
            <div className="text-sm text-gray-400 mb-1">Solde actuel</div>
            <div className="font-casino text-3xl font-black text-casino-gold">{(user?.balance || 0).toLocaleString()}</div>
            <div className="text-gray-500 text-xs">jetons</div>
          </div>
          <div className="card text-center">
            <div className="grid grid-cols-2 gap-2 h-full">
              <div>
                <div className="text-green-400 font-bold text-lg">{totalWon.toLocaleString()}</div>
                <div className="text-gray-500 text-xs">Gains nets</div>
              </div>
              <div>
                <div className="text-red-400 font-bold text-lg">{totalLost.toLocaleString()}</div>
                <div className="text-gray-500 text-xs">Pertes nettes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Withdraw */}
        <div className="card mb-6 border-casino-gold/20">
          <h2 className="font-casino text-xl font-bold text-casino-gold mb-4">💸 Demande de retrait</h2>
          <p className="text-gray-400 text-sm mb-4">
            Entre le montant à retirer en jetons. L'admin te versera les Pokédollars correspondants in-game.
          </p>
          <form onSubmit={handleWithdraw} className="flex gap-3">
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="Montant (min 100)"
              min={100}
              max={user?.balance}
              className="input-field flex-1"
            />
            <button type="submit" disabled={loading || !withdrawAmount} className="btn-gold px-6">
              {loading ? '...' : 'Retirer'}
            </button>
          </form>
          {withdrawMsg && <div className="mt-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">{withdrawMsg}</div>}
          {withdrawError && <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{withdrawError}</div>}
        </div>

        {/* History tabs */}
        <div className="card">
          <div className="flex gap-2 mb-4 border-b border-casino-border pb-4">
            {[
              { id: 'transactions', label: '📋 Transactions' },
              { id: 'games', label: '🎮 Parties' },
              { id: 'withdrawals', label: '💸 Retraits' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${tab === t.id ? 'bg-casino-gold/20 text-casino-gold' : 'text-gray-400 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {!history ? (
            <div className="text-gray-500 text-center py-8">Chargement...</div>
          ) : tab === 'transactions' ? (
            <div className="space-y-2">
              {history.transactions.length === 0 ? <p className="text-gray-500 text-center py-4">Aucune transaction</p> : history.transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-casino-border/50">
                  <div>
                    <div className="text-sm text-white">{tx.description || tx.type}</div>
                    <div className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleString('fr')}</div>
                  </div>
                  <div className={`font-bold ${tx.type === 'credit' || tx.type === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'credit' || tx.type === 'win' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'games' ? (
            <div className="space-y-2">
              {history.games.length === 0 ? <p className="text-gray-500 text-center py-4">Aucune partie</p> : history.games.map(g => (
                <div key={g.id} className="flex justify-between items-center py-2 border-b border-casino-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{GAME_ICONS[g.game]}</span>
                    <div>
                      <div className="text-sm text-white capitalize">{g.game}</div>
                      <div className="text-xs text-gray-500">Mise : {g.bet.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${g.payout >= g.bet ? 'text-green-400' : 'text-red-400'}`}>
                    {g.payout >= g.bet ? '+' : ''}{(g.payout - g.bet).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {history.withdrawals.length === 0 ? <p className="text-gray-500 text-center py-4">Aucun retrait</p> : history.withdrawals.map(w => (
                <div key={w.id} className="flex justify-between items-center py-2 border-b border-casino-border/50">
                  <div>
                    <div className="text-sm text-white">{w.amount.toLocaleString()} jetons</div>
                    <div className="text-xs text-gray-500">{new Date(w.created_at).toLocaleString('fr')}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    w.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    w.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'}`}>
                    {w.status === 'approved' ? '✅ Approuvé' : w.status === 'rejected' ? '❌ Refusé' : '⏳ En attente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
