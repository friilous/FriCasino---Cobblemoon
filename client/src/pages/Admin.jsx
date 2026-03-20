import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const GAMES_LIST = [
  { id: 'slots',     label: 'Slot Machine',     icon: '🎰' },
  { id: 'roulette',  label: 'Roulette Pokémon', icon: '🎯' },
  { id: 'crash',     label: 'Crash',            icon: '📈' },
  { id: 'blackjack', label: 'Blackjack',        icon: '🃏' },
  { id: 'mines',     label: 'Mines',            icon: '💣' },
  { id: 'plinko',    label: 'Plinko',           icon: '🪀' },
]

const BET_FILTERS = [
  { id: 'all',      label: 'Tous' },
  { id: 'wins',     label: '✅ Gains' },
  { id: 'losses',   label: '❌ Pertes' },
  { id: 'big_wins', label: '🔥 Gros gains (×2+)' },
]

export default function Admin() {
  const [tab,          setTab]          = useState('stats')
  const [users,        setUsers]        = useState([])
  const [withdrawals,  setWithdrawals]  = useState([])
  const [stats,        setStats]        = useState(null)
  const [gameSettings, setGameSettings] = useState({})
  const [bets,         setBets]         = useState([])
  const [betsTotal,    setBetsTotal]    = useState(0)
  const [betsFilter,   setBetsFilter]   = useState('all')
  const [betsGame,     setBetsGame]     = useState('')
  const [betsSearch,   setBetsSearch]   = useState('')
  const [betsPage,     setBetsPage]     = useState(0)
  const [betsLoading,  setBetsLoading]  = useState(false)
  const [playerModal,  setPlayerModal]  = useState(null)
  const [playerData,   setPlayerData]   = useState(null)
  // ── NextLeg ──
  const [nextlegUsers,   setNextlegUsers]   = useState([])
  const [nextlegLoading, setNextlegLoading] = useState(false)

  const { liveFeed, socket } = useSocket()

  const LIMIT = 50

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (tab === 'bets') loadBets()
  }, [tab, betsFilter, betsGame, betsPage])

  useEffect(() => {
    if (tab === 'nextleg') loadNextlegUsers()
  }, [tab])

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
    try { const { data } = await axios.get('/api/admin/users'); setUsers(data) } catch {}
  }

  async function loadWithdrawals() {
    try { const { data } = await axios.get('/api/admin/withdrawals'); setWithdrawals(data) } catch {}
  }

  async function loadStats() {
    try { const { data } = await axios.get('/api/admin/stats'); setStats(data) } catch {}
  }

  async function loadBets() {
    setBetsLoading(true)
    try {
      const params = { filter: betsFilter, limit: LIMIT, offset: betsPage * LIMIT }
      if (betsGame) params.game = betsGame
      if (betsSearch) params.search = betsSearch
      const { data } = await axios.get('/api/admin/bets', { params })
      setBets(data.bets); setBetsTotal(data.total)
    } catch {}
    setBetsLoading(false)
  }

  async function loadNextlegUsers() {
    setNextlegLoading(true)
    try {
      const { data } = await axios.get('/api/admin/nextleg-users')
      setNextlegUsers(data)
    } catch {}
    setNextlegLoading(false)
  }

  async function openPlayerModal(user) {
    setPlayerModal(user); setPlayerData(null)
    try {
      const { data } = await axios.get(`/api/admin/players/${user.id}/history`, { params: { limit: 20 } })
      setPlayerData(data)
    } catch {}
  }

  useEffect(() => {
    if (!socket) return
    socket.on('new_withdrawal', () => { loadWithdrawals() })
    socket.on('nextleg_new_user', () => { loadNextlegUsers() })
    return () => {
      socket.off('new_withdrawal')
      socket.off('nextleg_new_user')
    }
  }, [socket])

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length
  const totalPages   = Math.ceil(betsTotal / LIMIT)

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#d8d8f0', margin: 0 }}>⚙️ Panel Admin</h1>
          <button onClick={loadAll} style={{
            background: 'transparent', border: '1px solid #2a2a4a',
            color: '#9898b8', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
          }}>🔄 Actualiser</button>
        </div>

        {/* Stats rapides */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Joueurs',          value: stats.totalPlayers,                  icon: '👤', color: '#d8d8f0' },
              { label: 'Jetons circulants', value: stats.totalBalance?.toLocaleString(), icon: '🪙', color: '#f0c040' },
              { label: 'Parties jouées',   value: stats.gamesPlayed?.toLocaleString(),  icon: '🎮', color: '#d8d8f0' },
              { label: 'Profit maison',    value: stats.houseProfit?.toLocaleString(),  icon: '💰', color: '#40f080' },
              { label: 'House edge réel',  value: `${stats.houseEdge}%`,               icon: '📊', color: '#f0c040' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#44446a', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #1e1e40', paddingBottom: 10, flexWrap: 'wrap' }}>
          {[
            { id: 'stats',       label: '📊 Stats' },
            { id: 'machines',    label: '🎮 Machines' },
            { id: 'users',       label: `👤 Joueurs (${users.length})` },
            { id: 'create',      label: '➕ Créer compte' },
            { id: 'withdrawals', label: `💸 Retraits${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { id: 'bets',        label: '🎲 Tous les paris' },
            { id: 'live',        label: '📺 Live' },
            { id: 'nextleg',     label: `🟢 Mod NextLeg${nextlegUsers.length > 0 ? ` (${nextlegUsers.length})` : ''}` },
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

        {tab === 'stats'       && <StatsTab stats={stats} />}
        {tab === 'machines'    && <MachinesTab gameSettings={gameSettings} toggleGame={toggleGame} />}
        {tab === 'users'       && <UsersTab users={users} onRefresh={loadUsers} onOpenPlayer={openPlayerModal} />}
        {tab === 'create'      && <CreateUserTab onCreated={loadUsers} />}
        {tab === 'withdrawals' && <WithdrawalsTab withdrawals={withdrawals} onRefresh={loadWithdrawals} />}
        {tab === 'live'        && <LiveTab liveFeed={liveFeed} />}
        {tab === 'nextleg'     && <NextlegTab users={nextlegUsers} loading={nextlegLoading} onRefresh={loadNextlegUsers} />}
        {tab === 'bets' && (
          <BetsTab
            bets={bets} betsTotal={betsTotal} betsLoading={betsLoading}
            filter={betsFilter} setFilter={f => { setBetsFilter(f); setBetsPage(0) }}
            game={betsGame} setGame={g => { setBetsGame(g); setBetsPage(0) }}
            search={betsSearch} setSearch={setBetsSearch}
            page={betsPage} setPage={setBetsPage} totalPages={totalPages}
            onSearch={() => { setBetsPage(0); loadBets() }}
          />
        )}
      </div>

      {/* Modal profil joueur */}
      {playerModal && (
        <PlayerModal
          user={playerModal}
          data={playerData}
          onClose={() => { setPlayerModal(null); setPlayerData(null) }}
        />
      )}
    </div>
  )
}

// ── Stats globales ────────────────────────────────────────────────────────────
function StatsTab({ stats }) {
  if (!stats) return <div style={{ textAlign: 'center', color: '#2e2e50', padding: 40 }}>Chargement...</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: '0 0 14px' }}>📊 Stats par jeu</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e40' }}>
              {['Jeu', 'Parties', 'Misé', 'Payé', 'RTP réel'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Jeu' ? 'left' : 'right', color: '#44446a', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(stats.byGame || []).map(g => (
              <tr key={g.game} style={{ borderBottom: '1px solid #0f0f28' }}>
                <td style={{ padding: '7px 8px', color: '#c8c8e8', fontWeight: 600 }}>
                  {({ slots:'🎰', plinko:'🪀', roulette:'🎯', crash:'📈', blackjack:'🃏', mines:'💣' })[g.game] || '🎲'} {g.game}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: '#9898b8' }}>{parseInt(g.plays).toLocaleString()}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: '#9898b8' }}>{parseInt(g.total_bet).toLocaleString()}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: '#9898b8' }}>{parseInt(g.total_payout).toLocaleString()}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: parseFloat(g.actual_rtp) < 93 ? '#40f080' : '#f06060' }}>
                  {g.actual_rtp}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f0c040', margin: '0 0 12px' }}>🔥 Plus gros gains</h2>
          {(stats.topWinners || []).map((w, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0f0f28', fontSize: 11 }}>
              <div>
                <span style={{ color: '#c8c8e8', fontWeight: 600 }}>{w.username}</span>
                <span style={{ color: '#44446a', marginLeft: 8 }}>{w.game} · {w.bet_id}</span>
              </div>
              <span style={{ fontWeight: 800, color: '#40f080' }}>+{parseInt(w.profit).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f06060', margin: '0 0 12px' }}>💀 Plus grosses pertes</h2>
          {(stats.topLosers || []).map((w, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0f0f28', fontSize: 11 }}>
              <div>
                <span style={{ color: '#c8c8e8', fontWeight: 600 }}>{w.username}</span>
                <span style={{ color: '#44446a', marginLeft: 8 }}>{w.game} · {w.bet_id}</span>
              </div>
              <span style={{ fontWeight: 800, color: '#f06060' }}>-{parseInt(w.loss).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Machines ──────────────────────────────────────────────────────────────────
function MachinesTab({ gameSettings, toggleGame }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {GAMES_LIST.map(game => {
        const on = gameSettings[game.id] !== false
        return (
          <div key={game.id} style={{
            background: '#0a0a20', border: `1px solid ${on ? '#1e3020' : '#2a1a1a'}`,
            borderRadius: 10, padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{game.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0' }}>{game.label}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: on ? '#40f080' : '#f06060', marginTop: 2 }}>
                  {on ? '✅ Active' : '🔧 Désactivée'}
                </div>
                {!on && (
                  <div style={{ fontSize: 9, color: '#44446a', marginTop: 2 }}>
                    Les parties en cours peuvent se terminer
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => toggleGame(game.id)} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', border: '1px solid',
              borderColor: on ? 'rgba(240,64,64,0.4)' : 'rgba(64,240,128,0.4)',
              background: on ? 'rgba(240,64,64,0.08)' : 'rgba(64,240,128,0.08)',
              color: on ? '#f06060' : '#40f080',
            }}>
              {on ? 'Désactiver' : 'Réactiver'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Tous les paris ────────────────────────────────────────────────────────────
function BetsTab({ bets, betsTotal, betsLoading, filter, setFilter, game, setGame, search, setSearch, page, setPage, totalPages, onSearch }) {
  const GAME_ICONS = { slots:'🎰', plinko:'🪀', roulette:'🎯', crash:'📈', blackjack:'🃏', mines:'💣' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {BET_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: filter === f.id ? '1px solid rgba(240,192,64,0.4)' : '1px solid #2a2a4a',
              background: filter === f.id ? 'rgba(240,192,64,0.12)' : 'transparent',
              color: filter === f.id ? '#f0c040' : '#5a5a8a',
            }}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={game} onChange={e => setGame(e.target.value)} style={{
          background: '#0a0a20', border: '1px solid #2a2a4a', borderRadius: 7,
          color: '#9898b8', padding: '5px 10px', fontSize: 11, cursor: 'pointer',
        }}>
          <option value="">Tous les jeux</option>
          {GAMES_LIST.map(g => <option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            placeholder="Rechercher un joueur..."
            style={{ background: '#0a0a20', border: '1px solid #2a2a4a', borderRadius: 7, color: '#c8c8e8', padding: '5px 10px', fontSize: 11, outline: 'none' }} />
          <button onClick={onSearch} style={{ background: '#f0c040', color: '#07071a', fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11 }}>
            Rechercher
          </button>
        </div>
        <span style={{ fontSize: 10, color: '#44446a' }}>{betsTotal.toLocaleString()} résultats</span>
      </div>

      <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
        {betsLoading ? (
          <div style={{ textAlign: 'center', color: '#2e2e50', padding: '24px 0', fontSize: 12 }}>Chargement...</div>
        ) : bets.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#2e2e50', padding: '24px 0', fontSize: 12 }}>Aucun pari trouvé</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e40' }}>
                  {['#BetID', 'Joueur', 'Jeu', 'Mise', 'Gain', 'Résultat', 'Date'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === '#BetID' || h === 'Joueur' || h === 'Jeu' ? 'left' : 'right', color: '#44446a', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bets.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #0f0f28' }}>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 10, color: '#5a5a8a' }}>{b.bet_id}</td>
                    <td style={{ padding: '7px 10px', color: '#c8c8e8', fontWeight: 600 }}>{b.username}</td>
                    <td style={{ padding: '7px 10px', color: '#9898b8' }}>{GAME_ICONS[b.game] || '🎲'} {b.game}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#9898b8' }}>{parseInt(b.bet).toLocaleString()}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#9898b8' }}>{parseInt(b.payout).toLocaleString()}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: b.profit > 0 ? '#40f080' : b.profit < 0 ? '#f06060' : '#8888cc' }}>
                      {b.profit > 0 ? '+' : ''}{parseInt(b.profit).toLocaleString()}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10, color: '#44446a' }}>
                      {new Date(b.created_at).toLocaleString('fr')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: page === 0 ? '#2a2a4a' : '#9898b8', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 11 }}>
              ← Préc
            </button>
            <span style={{ padding: '5px 12px', fontSize: 11, color: '#5a5a8a' }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: page >= totalPages - 1 ? '#2a2a4a' : '#9898b8', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 11 }}>
              Suiv →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab({ users, onRefresh, onOpenPlayer }) {
  const [selected,    setSelected]    = useState(null)
  const [creditAmount,setCreditAmount]= useState('')
  const [creditType,  setCreditType]  = useState('credit')
  const [creditDesc,  setCreditDesc]  = useState('')
  const [msg,         setMsg]         = useState('')
  const [resetMsg,    setResetMsg]    = useState('')

  async function handleCredit(e) {
    e.preventDefault(); setMsg('')
    try {
      await axios.put(`/api/admin/users/${selected.id}/balance`, { amount: parseInt(creditAmount), type: creditType, description: creditDesc })
      setMsg('✅ Solde mis à jour'); setCreditAmount(''); setCreditDesc(''); onRefresh()
    } catch (err) { setMsg(`❌ ${err.response?.data?.error || 'Erreur'}`) }
  }

  async function handleReset(userId) {
    try {
      const { data } = await axios.put(`/api/admin/users/${userId}/reset-password`)
      setResetMsg(`Nouveau mdp : ${data.temp_password}`)
    } catch (err) { setResetMsg(`Erreur : ${err.response?.data?.error}`) }
  }

  async function handleDelete(userId) {
    if (!confirm('Supprimer ce compte ?')) return
    await axios.delete(`/api/admin/users/${userId}`); onRefresh()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
      <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18, overflowX: 'auto' }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: '0 0 12px' }}>
          Tous les comptes ({users.length})
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e40' }}>
              {['Pseudo', 'Solde', 'Parties', 'Net casino', 'Mdp', 'Actions'].map(h => (
                <th key={h} style={{ padding: '7px 8px', textAlign: h === 'Pseudo' ? 'left' : 'right', color: '#44446a', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{
                borderBottom: '1px solid #0f0f28',
                background: selected?.id === u.id ? 'rgba(240,192,64,0.03)' : 'transparent',
                cursor: 'pointer',
              }} onClick={() => setSelected(u)}>
                <td style={{ padding: '8px 8px' }}>
                  <button onClick={e => { e.stopPropagation(); onOpenPlayer(u) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8c8e8', fontWeight: 600, fontSize: 11, padding: 0, textDecoration: 'underline', textDecorationColor: '#2a2a4a' }}>
                    {u.username}
                  </button>
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', color: '#f0c040', fontWeight: 700 }}>{parseInt(u.balance).toLocaleString()}</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', color: '#9898b8' }}>{u.games_played || 0}</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: u.net_loss > 0 ? '#40f080' : '#f06060' }}>
                  {u.net_loss > 0 ? '+' : ''}{(u.net_loss || 0).toLocaleString()}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <span style={{
                    fontSize: 9, padding: '1px 6px', borderRadius: 8,
                    background: u.is_temp_pw ? 'rgba(240,192,64,0.1)' : 'rgba(64,240,128,0.1)',
                    color: u.is_temp_pw ? '#f0c040' : '#40f080',
                  }}>
                    {u.is_temp_pw ? 'Provisoire' : 'OK'}
                  </span>
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <button onClick={e => { e.stopPropagation(); handleReset(u.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#4080f0', marginRight: 6 }}>
                    Reset mdp
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(u.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#f06060' }}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resetMsg && <div style={{ marginTop: 10, padding: '7px 12px', background: 'rgba(64,128,240,0.08)', border: '1px solid rgba(64,128,240,0.2)', borderRadius: 6, fontSize: 11, color: '#6090f0' }}>{resetMsg}</div>}
      </div>

      {selected && (
        <div style={{ background: '#0a0a20', border: '1px solid rgba(240,192,64,0.25)', borderRadius: 12, padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0c040', margin: '0 0 10px' }}>Modifier : {selected.username}</h3>
          <div style={{ padding: '8px 12px', background: '#07071a', borderRadius: 7, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#44446a' }}>Solde : </span>
            <span style={{ color: '#f0c040', fontWeight: 700 }}>{parseInt(selected.balance).toLocaleString()} jetons</span>
          </div>
          <form onSubmit={handleCredit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setCreditType('credit')} style={{
                flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: 'none',
                background: creditType === 'credit' ? '#16a34a' : '#1a1a3a', color: '#fff',
              }}>+ Créditer</button>
              <button type="button" onClick={() => setCreditType('debit')} style={{
                flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: 'none',
                background: creditType === 'debit' ? '#dc2626' : '#1a1a3a', color: '#fff',
              }}>- Débiter</button>
            </div>
            <input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
              placeholder="Montant" required min={1}
              style={{ background: '#07071a', border: '1px solid #2a2a4a', borderRadius: 7, padding: '8px 12px', color: '#d8d8f0', fontSize: 12, outline: 'none' }} />
            <input type="text" value={creditDesc} onChange={e => setCreditDesc(e.target.value)}
              placeholder="Raison (optionnel)"
              style={{ background: '#07071a', border: '1px solid #2a2a4a', borderRadius: 7, padding: '8px 12px', color: '#d8d8f0', fontSize: 12, outline: 'none' }} />
            <button type="submit" style={{ background: '#f0c040', color: '#07071a', fontWeight: 800, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Confirmer
            </button>
          </form>
          {msg && <p style={{ marginTop: 8, fontSize: 11, color: '#9898b8', textAlign: 'center' }}>{msg}</p>}
        </div>
      )}
    </div>
  )
}

// ── Create user ───────────────────────────────────────────────────────────────
function CreateUserTab({ onCreated }) {
  const [username, setUsername] = useState('')
  const [balance,  setBalance]  = useState('')
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleCreate(e) {
    e.preventDefault(); setError(''); setResult(null); setLoading(true)
    try {
      const { data } = await axios.post('/api/admin/users', { username, initial_balance: parseInt(balance) || 0 })
      setResult(data); setUsername(''); setBalance(''); onCreated()
    } catch (err) { setError(err.response?.data?.error || 'Erreur') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#d8d8f0', margin: '0 0 20px' }}>Créer un compte joueur</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#44446a', display: 'block', marginBottom: 6 }}>Pseudo Minecraft</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="TonPseudo" required
              style={{ width: '100%', background: '#07071a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '10px 14px', color: '#d8d8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#44446a', display: 'block', marginBottom: 6 }}>Solde initial</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" min={0}
              style={{ width: '100%', background: '#07071a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '10px 14px', color: '#d8d8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ background: 'rgba(240,64,64,0.08)', border: '1px solid rgba(240,64,64,0.2)', borderRadius: 7, padding: '8px 12px', fontSize: 11, color: '#f06060' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ background: '#f0c040', color: '#07071a', fontWeight: 800, padding: '12px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Création...' : '➕ Créer le compte'}
          </button>
        </form>

        {result && (
          <div style={{ marginTop: 16, padding: 14, background: 'rgba(64,240,128,0.06)', border: '1px solid rgba(64,240,128,0.2)', borderRadius: 10 }}>
            <p style={{ color: '#40f080', fontWeight: 600, margin: '0 0 10px', fontSize: 13 }}>✅ Compte créé !</p>
            <div style={{ fontSize: 11, color: '#9898b8', lineHeight: 1.7 }}>
              <div>Pseudo : <strong style={{ color: '#fff' }}>{result.username}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                Mdp provisoire :
                <span style={{ background: '#07071a', color: '#f0c040', fontFamily: 'monospace', fontWeight: 700, padding: '2px 10px', borderRadius: 6, fontSize: 14 }}>
                  {result.temp_password}
                </span>
              </div>
              <p style={{ color: '#44446a', fontSize: 10, marginTop: 8 }}>⚠️ Envoie ce mot de passe sur Discord. Il devra le changer à la 1ère connexion.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Withdrawals ───────────────────────────────────────────────────────────────
function WithdrawalsTab({ withdrawals, onRefresh }) {
  const [loading, setLoading] = useState(null)
  const [notes,   setNotes]   = useState({})

  async function handle(id, action) {
    setLoading(id)
    try { await axios.put(`/api/admin/withdrawals/${id}`, { action, admin_note: notes[id] || '' }); onRefresh() }
    catch {} finally { setLoading(null) }
  }

  const pending = withdrawals.filter(w => w.status === 'pending')
  const done    = withdrawals.filter(w => w.status !== 'pending')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pending.length === 0
        ? <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: '28px', textAlign: 'center', color: '#2e2e50', fontSize: 12 }}>✅ Aucun retrait en attente</div>
        : pending.map(w => (
          <div key={w.id} style={{ background: '#0c0a00', border: '1px solid rgba(240,192,64,0.3)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#d8d8f0' }}>{w.username}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f0c040' }}>{parseInt(w.amount).toLocaleString()} jetons</div>
              <div style={{ fontSize: 10, color: '#44446a' }}>{new Date(w.created_at).toLocaleString('fr')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
              <input type="text" placeholder="Note admin (optionnel)" value={notes[w.id] || ''}
                onChange={e => setNotes(p => ({ ...p, [w.id]: e.target.value }))}
                style={{ background: '#07071a', border: '1px solid #2a2a4a', borderRadius: 7, padding: '7px 12px', color: '#c8c8e8', fontSize: 11, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handle(w.id, 'approve')} disabled={loading === w.id}
                  style={{ flex: 1, background: '#16a34a', color: '#fff', fontWeight: 700, padding: '9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12 }}>
                  ✅ Approuver
                </button>
                <button onClick={() => handle(w.id, 'reject')} disabled={loading === w.id}
                  style={{ flex: 1, background: '#dc2626', color: '#fff', fontWeight: 700, padding: '9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12 }}>
                  ❌ Refuser
                </button>
              </div>
            </div>
          </div>
        ))
      }

      {done.length > 0 && (
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#5a5a8a', margin: '0 0 12px' }}>Historique</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e40' }}>
                {['Joueur', 'Montant', 'Statut', 'Date'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Joueur' ? 'left' : 'right', color: '#44446a', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {done.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid #0f0f28' }}>
                  <td style={{ padding: '7px 8px', color: '#c8c8e8' }}>{w.username}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#f0c040', fontWeight: 700 }}>{parseInt(w.amount).toLocaleString()}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: w.status === 'approved' ? 'rgba(64,240,128,0.1)' : 'rgba(240,64,64,0.1)', color: w.status === 'approved' ? '#40f080' : '#f06060' }}>
                      {w.status === 'approved' ? '✅ Approuvé' : '❌ Refusé'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#44446a', fontSize: 10 }}>{new Date(w.resolved_at || w.created_at).toLocaleDateString('fr')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Live ──────────────────────────────────────────────────────────────────────
function LiveTab({ liveFeed }) {
  const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }
  return (
    <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#40f080' }} />
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: 0 }}>Activité en direct</h2>
      </div>
      {liveFeed.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#2e2e50', padding: '24px 0', fontSize: 12 }}>En attente d'activité...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {liveFeed.map((e, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: '#07071a', borderRadius: 8,
              border: '1px solid #12122a', fontSize: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{GAME_ICONS[e.game] || '🎲'}</span>
                <div>
                  <span style={{ color: '#c8c8e8', fontWeight: 600 }}>{e.username}</span>
                  <span style={{ color: '#44446a', marginLeft: 6 }}>{e.game}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: e.payout > e.bet ? '#40f080' : '#f06060' }}>
                  {e.payout > e.bet ? `+${(e.payout - e.bet).toLocaleString()}` : `-${e.bet?.toLocaleString()}`}
                </div>
                {e.bet_id && <div style={{ fontSize: 9, color: '#2e2e50', fontFamily: 'monospace' }}>{e.bet_id}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── NextLeg Mod ───────────────────────────────────────────────────────────────
function NextlegTab({ users, loading, onRefresh }) {
  const [noteModal,  setNoteModal]  = useState(null)
  const [noteText,   setNoteText]   = useState('')
  const [savingNote, setSavingNote] = useState(false)

  function timeSince(dateStr) {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'À l\'instant'
    if (m < 60) return `${m}min`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}j`
  }

  async function deleteUser(uid) {
    if (!confirm('Supprimer cet utilisateur du suivi ?')) return
    try { await axios.delete(`/api/admin/nextleg-users/${uid}`); onRefresh() } catch {}
  }

  async function saveNote() {
    if (!noteModal) return
    setSavingNote(true)
    try {
      await axios.put(`/api/admin/nextleg-users/${noteModal.uid}/note`, { note: noteText })
      onRefresh()
      setNoteModal(null)
    } catch {}
    setSavingNote(false)
  }

  const badge = (color) => ({
    background: color + '22', color,
    padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
  })

  const btn = (color = '#f0c040') => ({
    background: color + '18', border: `1px solid ${color}44`, color,
    padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#d8d8f0', margin: 0 }}>🟢 Utilisateurs du mod NextLeg</h2>
          <p style={{ fontSize: 11, color: '#44446a', margin: '4px 0 0' }}>
            Joueurs avec "Envoi données : ON" · {users.length} enregistré{users.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onRefresh} style={btn()}>🔄 Actualiser</button>
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#44446a', padding: 40 }}>Chargement...</div>}

      {!loading && users.length === 0 && (
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎮</div>
          <div style={{ color: '#44446a', fontSize: 13 }}>Aucun utilisateur du mod pour l'instant.</div>
          <div style={{ color: '#2e2e50', fontSize: 11, marginTop: 6 }}>
            Les joueurs apparaissent ici dès qu'ils activent "Envoi données : ON" dans le mod.
          </div>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div style={{ background: '#0a0a20', border: '1px solid #1e1e40', borderRadius: 12, padding: 18, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Pseudo MC', 'Alias', 'Version', '1ère connexion', 'Dernière vue', 'Pings', 'Note', 'UID', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #1e1e40' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid}
                  onMouseEnter={e => e.currentTarget.style.background = '#0d0d25'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background 0.15s' }}
                >
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#c8c8e8', borderBottom: '1px solid #0e0e28' }}>
                    <span style={{ fontWeight: 700, color: '#e8e8ff' }}>{u.player}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #0e0e28' }}>
                    <span style={{ color: u.alias ? '#9898c8' : '#2e2e50', fontStyle: u.alias ? 'normal' : 'italic' }}>
                      {u.alias || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #0e0e28' }}>
                    <span style={badge('#40f0a0')}>v{u.version}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#5a5a8a', borderBottom: '1px solid #0e0e28' }}>
                    {u.first_seen?.substring(0, 16)}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #0e0e28' }}>
                    <span style={{ color: '#f0c040', fontWeight: 600 }}>{timeSince(u.last_seen)}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #0e0e28' }}>
                    <span style={badge('#7878f0')}>{u.ping_count}×</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, borderBottom: '1px solid #0e0e28', maxWidth: 140 }}>
                    <span style={{ color: u.note ? '#e8c060' : '#2e2e50', fontStyle: u.note ? 'normal' : 'italic', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.note || 'Aucune note'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #0e0e28' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#3a3a60' }} title={u.uid}>
                      {u.uid.substring(0, 8)}…
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #0e0e28' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setNoteModal({ uid: u.uid, player: u.player }); setNoteText(u.note || '') }} style={btn('#a0a0f0')} title="Note">✏️</button>
                      <button onClick={() => deleteUser(u.uid)} style={btn('#f04040')} title="Supprimer">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal note */}
      {noteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d0d22', border: '1px solid #2a2a50', borderRadius: 14, padding: 28, width: 380 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#d8d8f0', margin: '0 0 6px' }}>
              ✏️ Note pour <span style={{ color: '#f0c040' }}>{noteModal.player}</span>
            </h3>
            <p style={{ fontSize: 11, color: '#44446a', margin: '0 0 14px' }}>Usage interne — non visible par le joueur.</p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Ex : autorisé à partager le mod, VIP, suspect..."
              rows={4}
              style={{ width: '100%', background: '#07071a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#d8d8f0', padding: '10px 12px', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
              <button onClick={() => setNoteModal(null)} style={btn('#5a5a8a')}>Annuler</button>
              <button onClick={saveNote} disabled={savingNote} style={btn('#f0c040')}>
                {savingNote ? 'Sauvegarde...' : '✔ Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal profil joueur ───────────────────────────────────────────────────────
function PlayerModal({ user, data, onClose }) {
  const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#0a0a20', border: '1px solid #2a2a4a',
        borderRadius: 16, padding: 28, width: 600, maxWidth: '90vw', maxHeight: '80vh',
        overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0c040', margin: 0 }}>👤 {user.username}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a5a8a', fontSize: 20 }}>×</button>
        </div>

        {!data ? (
          <div style={{ textAlign: 'center', color: '#2e2e50', padding: '24px 0' }}>Chargement...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Parties', value: data.stats.games_played.toLocaleString() },
                { label: 'Total misé', value: data.stats.total_bet.toLocaleString() },
                { label: 'Net casino', value: `+${data.stats.net_loss.toLocaleString()}`, color: data.stats.net_loss > 0 ? '#40f080' : '#f06060' },
              ].map(s => (
                <div key={s.label} style={{ background: '#07071a', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color || '#d8d8f0' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#44446a', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#5a5a8a', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
              Dernières parties
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#07071a', borderRadius: 7, fontSize: 11 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{GAME_ICONS[h.game] || '🎲'}</span>
                    <span style={{ color: '#9898b8' }}>{h.game}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#44446a' }}>{h.bet_id}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ color: '#5a5a8a' }}>Mise {parseInt(h.bet).toLocaleString()}</span>
                    <span style={{ fontWeight: 700, color: h.profit > 0 ? '#40f080' : h.profit < 0 ? '#f06060' : '#8888cc' }}>
                      {h.profit > 0 ? '+' : ''}{parseInt(h.profit).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Link to={`/joueur/${user.username}`} style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 11, color: '#5a5a8a', textDecoration: 'none', padding: '8px', borderTop: '1px solid #1e1e40' }}>
              Voir le profil public complet →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
