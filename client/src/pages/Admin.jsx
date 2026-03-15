import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSocket } from '../contexts/SocketContext'

export default function Admin() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [stats, setStats] = useState(null)
  const [gameSettings, setGameSettings] = useState({ slots: true, plinko: true, roulette: true })
  const [loading, setLoading] = useState(false)
  const { liveFeed, socket } = useSocket()

  // Notifications de retrait en temps réel
  const [newWithdrawals, setNewWithdrawals] = useState(0)
  useEffect(() => {
    if (!socket) return
    socket.on('new_withdrawal', () => {
      setNewWithdrawals(n => n + 1)
      loadWithdrawals()
    })
    return () => socket.off('new_withdrawal')
  }, [socket])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    loadUsers(); loadWithdrawals(); loadStats(); loadGameSettings()
  }

  async function loadGameSettings() {
    try {
      const { data } = await axios.get('/api/admin/game-settings')
      setGameSettings(data)
    } catch {}
  }

  async function toggleGame(game) {
    const newVal = !gameSettings[game]
    setGameSettings(prev => ({ ...prev, [game]: newVal }))
    try {
      await axios.put(`/api/admin/game-settings/${game}`, { enabled: newVal })
    } catch {
      setGameSettings(prev => ({ ...prev, [game]: !newVal }))
    }
  }

  async function loadUsers() {
    const { data } = await axios.get('/api/admin/users')
    setUsers(data)
  }

  async function loadWithdrawals() {
    setNewWithdrawals(0)
    const { data } = await axios.get('/api/admin/withdrawals')
    setWithdrawals(data)
  }

  async function loadStats() {
    const { data } = await axios.get('/api/admin/stats')
    setStats(data)
  }

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length

  return (
    <div className="min-h-screen bg-casino-bg py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-casino text-3xl font-bold text-white">⚙️ Panel Admin</h1>
          <button onClick={loadAll} className="btn-outline text-sm py-2">🔄 Actualiser</button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Joueurs', value: stats.totalPlayers, icon: '👤' },
              { label: 'Jetons en circulation', value: stats.totalBalance?.toLocaleString(), icon: '🪙' },
              { label: 'Parties jouées', value: stats.gamesPlayed?.toLocaleString(), icon: '🎮' },
              { label: 'Avantage maison', value: `${stats.houseEdge}%`, icon: '📊' },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-casino-gold font-bold text-xl">{s.value}</div>
                <div className="text-gray-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-casino-border pb-4">
          {[
            { id: 'users', label: '👤 Joueurs' },
            { id: 'create', label: '➕ Créer un compte' },
            { id: 'withdrawals', label: `💸 Retraits ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
            { id: 'live', label: '📺 Live' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t.id ? 'bg-casino-purple/30 text-casino-purple2 border border-casino-purple/50' : 'text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === 'users' && <UsersTab users={users} onRefresh={loadUsers} />}
        {tab === 'create' && <CreateUserTab onCreated={loadUsers} />}
        {tab === 'withdrawals' && <WithdrawalsTab withdrawals={withdrawals} onRefresh={loadWithdrawals} />}
        {tab === 'live' && <LiveTab liveFeed={liveFeed} stats={stats} gameSettings={gameSettings} toggleGame={toggleGame} />}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UsersTab({ users, onRefresh }) {
  const [selected, setSelected] = useState(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditType, setCreditType] = useState('credit')
  const [creditDesc, setCreditDesc] = useState('')
  const [msg, setMsg] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  async function handleCredit(e) {
    e.preventDefault()
    setMsg('')
    try {
      await axios.put(`/api/admin/users/${selected.id}/balance`, {
        amount: parseInt(creditAmount), type: creditType, description: creditDesc
      })
      setMsg(`✅ Solde mis à jour`)
      setCreditAmount('')
      setCreditDesc('')
      onRefresh()
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Erreur'}`)
    }
  }

  async function handleReset(userId) {
    try {
      const { data } = await axios.put(`/api/admin/users/${userId}/reset-password`)
      setResetMsg(`Nouveau mdp provisoire : ${data.temp_password}`)
    } catch (err) {
      setResetMsg(`Erreur : ${err.response?.data?.error}`)
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Supprimer ce compte ?')) return
    await axios.delete(`/api/admin/users/${userId}`)
    onRefresh()
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card overflow-x-auto">
        <h2 className="font-bold text-white mb-4">Tous les comptes ({users.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-casino-border">
              <th className="text-left py-2">Pseudo</th>
              <th className="text-right py-2">Solde</th>
              <th className="text-center py-2">Statut mdp</th>
              <th className="text-center py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={`border-b border-casino-border/50 hover:bg-casino-border/20 cursor-pointer ${selected?.id === u.id ? 'bg-casino-gold/5' : ''}`}
                onClick={() => setSelected(u)}>
                <td className="py-2 font-medium text-white">{u.username}</td>
                <td className="py-2 text-right text-casino-gold font-bold">{u.balance.toLocaleString()}</td>
                <td className="py-2 text-center">
                  {u.is_temp_pw
                    ? <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Provisoire</span>
                    : <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Changé</span>}
                </td>
                <td className="py-2 text-center">
                  <button onClick={(e) => { e.stopPropagation(); handleReset(u.id) }}
                    className="text-xs text-blue-400 hover:text-blue-300 mr-2">Reset mdp</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(u.id) }}
                    className="text-xs text-red-400 hover:text-red-300">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resetMsg && <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm rounded">{resetMsg}</div>}
      </div>

      {/* Credit panel */}
      {selected && (
        <div className="card border-casino-gold/30">
          <h3 className="font-bold text-casino-gold mb-4">Modifier : {selected.username}</h3>
          <div className="mb-3 p-2 bg-casino-bg rounded">
            <span className="text-gray-400 text-sm">Solde actuel : </span>
            <span className="text-casino-gold font-bold">{selected.balance.toLocaleString()} jetons</span>
          </div>
          <form onSubmit={handleCredit} className="space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setCreditType('credit')}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${creditType === 'credit' ? 'bg-green-600 text-white' : 'bg-casino-bg text-gray-400 border border-casino-border'}`}>
                + Créditer
              </button>
              <button type="button" onClick={() => setCreditType('debit')}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${creditType === 'debit' ? 'bg-red-600 text-white' : 'bg-casino-bg text-gray-400 border border-casino-border'}`}>
                - Débiter
              </button>
            </div>
            <input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
              placeholder="Montant" className="input-field" required min={1} />
            <input type="text" value={creditDesc} onChange={e => setCreditDesc(e.target.value)}
              placeholder="Raison (optionnel)" className="input-field" />
            <button type="submit" className="btn-gold w-full py-2">Confirmer</button>
          </form>
          {msg && <p className="mt-2 text-sm text-center text-gray-300">{msg}</p>}
        </div>
      )}
    </div>
  )
}

function CreateUserTab({ onCreated }) {
  const [username, setUsername] = useState('')
  const [balance, setBalance] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setError(''); setResult(null); setLoading(true)
    try {
      const { data } = await axios.post('/api/admin/users', { username, initial_balance: parseInt(balance) || 0 })
      setResult(data)
      setUsername(''); setBalance('')
      onCreated()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <div className="card">
        <h2 className="font-bold text-white mb-6">Créer un compte joueur</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Pseudo Minecraft</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="TonPseudo" className="input-field" required />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Solde initial (optionnel)</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)}
              placeholder="0" min={0} className="input-field" />
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          <button type="submit" disabled={loading} className="btn-gold w-full py-3">
            {loading ? 'Création...' : '➕ Créer le compte'}
          </button>
        </form>

        {result && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 font-semibold mb-2">✅ Compte créé !</p>
            <div className="space-y-1 text-sm">
              <div>Pseudo : <span className="text-white font-bold">{result.username}</span></div>
              <div className="flex items-center gap-2">
                Mot de passe provisoire :
                <span className="bg-casino-bg text-casino-gold font-mono font-bold px-2 py-1 rounded text-base">
                  {result.temp_password}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-2">⚠️ Envoie ce mot de passe au joueur sur Discord/MC. Il devra le changer à sa première connexion.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WithdrawalsTab({ withdrawals, onRefresh }) {
  const [loading, setLoading] = useState(null)
  const [notes, setNotes] = useState({})

  async function handle(id, action) {
    setLoading(id)
    try {
      await axios.put(`/api/admin/withdrawals/${id}`, { action, admin_note: notes[id] || '' })
      onRefresh()
    } catch {}
    setLoading(null)
  }

  const pending = withdrawals.filter(w => w.status === 'pending')
  const done = withdrawals.filter(w => w.status !== 'pending')

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h2 className="font-bold text-yellow-400 mb-3">⏳ En attente ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(w => (
              <div key={w.id} className="card border-yellow-500/30 bg-yellow-500/5">
                <div className="flex flex-wrap gap-4 items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-lg">{w.username}</div>
                    <div className="text-casino-gold font-black text-2xl">{w.amount.toLocaleString()} jetons</div>
                    <div className="text-gray-500 text-xs">{new Date(w.created_at).toLocaleString('fr')}</div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-48">
                    <input type="text" placeholder="Note admin (optionnel)"
                      value={notes[w.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [w.id]: e.target.value }))}
                      className="input-field text-sm py-2" />
                    <div className="flex gap-2">
                      <button onClick={() => handle(w.id, 'approve')} disabled={loading === w.id}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-2 rounded transition-colors">
                        ✅ Approuver
                      </button>
                      <button onClick={() => handle(w.id, 'reject')} disabled={loading === w.id}
                        className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-bold py-2 rounded transition-colors">
                        ❌ Refuser
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="card text-center py-8 text-gray-500">✅ Aucun retrait en attente</div>
      )}

      {done.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-400 mb-3">Historique</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-casino-border">
                  <th className="text-left py-2">Joueur</th>
                  <th className="text-right py-2">Montant</th>
                  <th className="text-center py-2">Statut</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {done.map(w => (
                  <tr key={w.id} className="border-b border-casino-border/50">
                    <td className="py-2 text-white">{w.username}</td>
                    <td className="py-2 text-right text-casino-gold font-bold">{w.amount.toLocaleString()}</td>
                    <td className="py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {w.status === 'approved' ? '✅ Approuvé' : '❌ Refusé'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 text-xs">{new Date(w.resolved_at || w.created_at).toLocaleDateString('fr')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function LiveTab({ liveFeed, stats, gameSettings, toggleGame }) {
  const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎡' }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Contrôle des machines */}
      <div className="card">
        <h2 className="font-bold text-white mb-4">🎮 État des machines</h2>
        <div className="space-y-3">
          {[
            { id: 'slots',    label: 'Slot Machine',    emoji: '🎰' },
            { id: 'plinko',   label: 'Plinko',          emoji: '🪀' },
            { id: 'roulette', label: 'Roulette Pokémon', emoji: '🎡' },
          ].map(game => {
            const on = gameSettings[game.id] !== false
            return (
              <div key={game.id}
                className="flex items-center justify-between p-3 bg-casino-bg rounded-lg border border-casino-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{game.emoji}</span>
                  <div>
                    <div className="text-white font-medium text-sm">{game.label}</div>
                    <div className={`text-xs font-semibold ${on ? 'text-green-400' : 'text-red-400'}`}>
                      {on ? '✅ Activée' : '🔧 Désactivée'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleGame(game.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border
                    ${on
                      ? 'bg-red-600/20 text-red-400 border-red-600/40 hover:bg-red-600/30'
                      : 'bg-green-600/20 text-green-400 border-green-600/40 hover:bg-green-600/30'}`}
                >
                  {on ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Désactiver une machine empêche immédiatement tout nouveau jeu. Les joueurs voient un message de maintenance.
        </p>
      </div>

      {/* Live feed + stats */}
      <div className="space-y-4">
        <div className="card">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
            Activité temps réel
          </h2>
          {liveFeed.length === 0 ? (
            <p className="text-gray-500 text-center py-8">En attente d'activité...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {liveFeed.map((e, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-casino-bg rounded">
                  <div className="flex items-center gap-2">
                    <span>{GAME_ICONS[e.game]}</span>
                    <div>
                      <span className="text-white text-sm font-medium">{e.username}</span>
                      <span className="text-gray-500 text-xs ml-1">— {e.game}</span>
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${e.payout > e.bet ? 'text-green-400' : 'text-gray-500'}`}>
                    {e.payout > e.bet ? `+${(e.payout - e.bet).toLocaleString()}` : `-${e.bet?.toLocaleString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {stats && (
          <div className="card">
            <h2 className="font-bold text-white mb-4">📊 Statistiques</h2>
            <div className="space-y-3">
              {[
                { label: 'Joueurs',              value: stats.totalPlayers,                     color: 'text-white' },
                { label: 'Jetons en circulation', value: stats.totalBalance?.toLocaleString(),   color: 'text-casino-gold' },
                { label: 'Parties jouées',        value: stats.gamesPlayed?.toLocaleString(),    color: 'text-white' },
                { label: 'Avantage maison',       value: `${stats.houseEdge}%`,                 color: 'text-green-400' },
                { label: 'Retraits en attente',
                  value: `${stats.pendingWithdrawals?.count || 0} (${(stats.pendingWithdrawals?.total || 0).toLocaleString()} jetons)`,
                  color: stats.pendingWithdrawals?.count > 0 ? 'text-yellow-400' : 'text-gray-400' },
              ].map(s => (
                <div key={s.label} className="flex justify-between py-2 border-b border-casino-border last:border-0">
                  <span className="text-gray-400 text-sm">{s.label}</span>
                  <span className={`font-bold text-sm ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
