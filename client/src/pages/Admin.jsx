import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSocket } from '../contexts/SocketContext'

// Crash retiré proprement
const GAMES = [
  { id: 'slots',     name: 'Slot Machine',     icon: '🎰' },
  { id: 'blackjack', name: 'Blackjack',         icon: '🃏' },
  { id: 'mines',     name: 'Mines',             icon: '💣' },
  { id: 'roulette',  name: 'Roulette Pokémon',  icon: '🎡' },
  { id: 'plinko',    name: 'Plinko',            icon: '⚪' },
]

const STATUS_COLS  = { pending: '#F0B429', approved: '#22C55E', rejected: '#EF4444' }
const STATUS_LABELS= { pending: '⏳ En attente', approved: '✅ Approuvé', rejected: '❌ Refusé' }
const TABS = ['overview','users','withdrawals','settings','jackpot','actions']
const TAB_LABELS = { overview:'📊 Vue d\'ensemble', users:'👥 Joueurs', withdrawals:'💸 Retraits', settings:'⚙️ Jeux', jackpot:'💎 Jackpot', actions:'🔧 Actions' }

export default function Admin() {
  const { socket } = useSocket()
  const [tab,      setTab]      = useState('overview')
  const [stats,    setStats]    = useState(null)
  const [users,    setUsers]    = useState([])
  const [wds,      setWds]      = useState([])
  const [games,    setGames]    = useState({})
  const [jackpot,  setJackpot]  = useState(null)
  const [newAmount,setNewAmount]= useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [err,      setErr]      = useState('')
  const [search,   setSearch]   = useState('')
  const [selUser,  setSelUser]  = useState(null)
  const [credits,  setCredits]  = useState('')
  const [newPw,    setNewPw]    = useState('')

  function flash(m, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else        { setMsg(m); setTimeout(() => setMsg(''), 4000) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => {
    if (!socket) return
    socket.on('new_withdrawal', (w) => setWds(prev => [w, ...prev]))
    return () => socket.off('new_withdrawal')
  }, [socket])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, u, w, g, jk] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/withdrawals'),
        axios.get('/api/admin/game-settings'),
        axios.get('/api/superjackpot'),
      ])
      setStats(s.data)
      setUsers(u.data)
      setWds(w.data)
      setGames(g.data)
      setJackpot(jk.data.amount)
    } catch { flash('Erreur chargement', true) }
    setLoading(false)
  }

  async function toggleGame(id, cur) {
    try {
      await axios.post('/api/admin/game-settings', { game: id, enabled: !cur })
      setGames(prev => ({ ...prev, [id]: !cur }))
      flash(`${id} ${!cur ? 'activé ✅' : 'désactivé 🔴'}`)
    } catch { flash('Erreur', true) }
  }

  async function handleWithdraw(id, status, note = '') {
    try {
      await axios.put(`/api/admin/withdrawals/${id}`, { status, admin_note: note })
      setWds(prev => prev.map(w => w.id === id ? { ...w, status, admin_note: note } : w))
      flash(`Retrait ${status === 'approved' ? 'approuvé ✅' : 'refusé ❌'}`)
    } catch { flash('Erreur', true) }
  }

  async function creditUser(userId, amount, desc) {
    try {
      await axios.post('/api/admin/credit', { userId, amount, description: desc })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: u.balance + parseInt(amount) } : u))
      flash(`+${parseInt(amount).toLocaleString('fr-FR')} crédités ✅`)
      setCredits('')
    } catch { flash('Erreur', true) }
  }

  async function resetPassword(userId, pw) {
    try {
      await axios.post('/api/admin/reset-password', { userId, newPassword: pw })
      flash('Mot de passe réinitialisé ✅')
      setNewPw('')
    } catch { flash('Erreur', true) }
  }

  async function updateJackpot() {
    const n = parseInt(newAmount)
    if (!n || n < 0) return
    try {
      await axios.post('/api/admin/jackpot', { amount: n })
      setJackpot(n); setNewAmount(''); flash(`Jackpot mis à jour : ${n.toLocaleString('fr-FR')} ✅`)
    } catch { flash('Erreur', true) }
  }

  async function triggerDraw() {
    if (!confirm('Déclencher le tirage du SuperJackpot MAINTENANT ?')) return
    try {
      const { data } = await axios.post('/api/superjackpot/draw')
      flash(data.result === 'no_eligible' ? 'Aucun joueur éligible' : `🏆 Gagnant : ${data.winner} — ${data.amount_won?.toLocaleString('fr-FR')} jetons !`)
      loadAll()
    } catch { flash('Erreur tirage', true) }
  }

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
  const pendingWds    = wds.filter(w => w.status === 'pending')

  const inputSt = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(240,180,41,0.2)',
    borderRadius: 8, padding: '8px 12px', color: '#F5E6C8',
    fontFamily: 'Crimson Pro, serif', fontSize: 13, outline: 'none',
  }
  const btnGold = {
    fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 11, cursor: 'pointer',
    background: 'linear-gradient(135deg,#FFD700,#F0B429)', color: '#1A0A00',
    padding: '8px 16px', borderRadius: 8, border: 'none',
    boxShadow: '0 2px 10px rgba(240,180,41,0.3)',
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Cinzel Decorative, serif', fontSize: 20, fontWeight: 900, color: '#F5E6C8', margin: 0 }}>
            ⚙️ Panel Admin
          </h1>
          <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.35)', marginTop: 4 }}>
            CobbleMoon Casino — Frilous uniquement
          </p>
        </div>
        {pendingWds.length > 0 && (
          <div style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F0B429', animation: 'pulseDot 1.2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#F0B429', fontWeight: 700 }}>
              {pendingWds.length} retrait{pendingWds.length > 1 ? 's' : ''} en attente
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      {msg && <div style={{ marginBottom: 14, padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, fontFamily: 'Crimson Pro, serif', fontSize: 14, color: '#22C55E' }}>{msg}</div>}
      {err && <div style={{ marginBottom: 14, padding: '10px 16px', background: 'rgba(196,30,58,0.1)', border: '1px solid rgba(196,30,58,0.3)', borderRadius: 10, fontFamily: 'Crimson Pro, serif', fontSize: 14, color: '#E8556A' }}>{err}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(240,180,41,0.1)', paddingBottom: 10, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            fontFamily: 'Cinzel, serif', cursor: 'pointer', border: 'none',
            background: tab === t ? 'rgba(240,180,41,0.12)' : 'transparent',
            color: tab === t ? '#F0B429' : 'rgba(245,230,200,0.35)',
          }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { icon:'👥', label:'Joueurs', value:stats.total_users },
            { icon:'🎮', label:'Parties jouées', value:stats.total_games?.toLocaleString('fr-FR') },
            { icon:'💰', label:'Total misé', value:`${parseInt(stats.total_bets || 0).toLocaleString('fr-FR')} ✦` },
            { icon:'💎', label:'SuperJackpot', value:`${(jackpot||0).toLocaleString('fr-FR')} ✦`, color:'#E8556A' },
            { icon:'✅', label:'En ligne', value:stats.online_count ?? '?', color:'#22C55E' },
            { icon:'⏳', label:'Retraits en attente', value:pendingWds.length, color: pendingWds.length > 0 ? '#F0B429' : undefined },
            { icon:'💸', label:'Retraits totaux', value:stats.total_withdrawals?.toLocaleString('fr-FR') ?? '?' },
            { icon:'🏦', label:'Résidant total', value:`${parseInt(stats.total_balance || 0).toLocaleString('fr-FR')} ✦` },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: color || '#F5E6C8', marginBottom: 4 }}>{value}</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── JOUEURS ── */}
      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un joueur…" style={{ ...inputSt, width: 220 }} />
            <button onClick={loadAll} style={btnGold}>🔄 Actualiser</button>
          </div>
          <div style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['#', 'Pseudo', 'Solde', 'Statut', 'Créé le', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: selUser?.id === u.id ? 'rgba(240,180,41,0.04)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelUser(selUser?.id === u.id ? null : u)}>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)' }}>{u.id}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: u.is_admin ? '#FFD700' : '#F5E6C8' }}>
                        {u.is_admin ? '👑 ' : ''}{u.username}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F0B429' }}>
                      {parseInt(u.balance || 0).toLocaleString('fr-FR')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {u.is_temp_pw
                        ? <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#F0B429', background: 'rgba(240,180,41,0.1)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(240,180,41,0.3)' }}>Temp PW</span>
                        : <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 4 }}>Actif</span>
                      }
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)' }}>{u.created_at?.slice(0, 10)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={e => { e.stopPropagation(); setSelUser(selUser?.id === u.id ? null : u) }} style={{ fontFamily: 'Cinzel, serif', fontSize: 10, background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)', color: '#F0B429', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
                        {selUser?.id === u.id ? 'Fermer' : 'Gérer'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', fontFamily: 'Crimson Pro, serif', color: 'rgba(245,230,200,0.2)' }}>Aucun joueur trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selUser && (
            <div style={{ marginTop: 14, background: 'rgba(240,180,41,0.04)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: '#F0B429', marginBottom: 14 }}>
                Gérer : {selUser.username} · Solde actuel : {parseInt(selUser.balance || 0).toLocaleString('fr-FR')} ✦
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={credits} onChange={e => setCredits(e.target.value)} type="number" placeholder="Jetons (+/-)" style={{ ...inputSt, width: 130 }} />
                  <button onClick={() => creditUser(selUser.id, credits, `Crédit admin`)} disabled={!credits} style={{ ...btnGold, opacity: !credits ? 0.4 : 1 }}>💳 Créditer</button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newPw} onChange={e => setNewPw(e.target.value)} type="text" placeholder="Nouveau mot de passe" style={{ ...inputSt, width: 200 }} />
                  <button onClick={() => resetPassword(selUser.id, newPw)} disabled={!newPw || newPw.length < 6} style={{ ...btnGold, background: 'rgba(240,180,41,0.1)', color: '#F0B429', border: '1px solid rgba(240,180,41,0.3)', boxShadow: 'none', opacity: !newPw || newPw.length < 6 ? 0.4 : 1 }}>🔐 Reset PW</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RETRAITS ── */}
      {tab === 'withdrawals' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button onClick={loadAll} style={btnGold}>🔄 Actualiser</button>
            {pendingWds.length > 0 && <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: '#F0B429', alignSelf: 'center' }}>
              ⚠ {pendingWds.length} en attente
            </div>}
          </div>
          <div style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            {wds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', fontFamily: 'Crimson Pro, serif', color: 'rgba(245,230,200,0.2)', fontSize: 14 }}>Aucune demande de retrait</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['#', 'Joueur', 'Montant', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {wds.map(w => (
                    <tr key={w.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: w.status === 'pending' ? 'rgba(240,180,41,0.03)' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)' }}>#{w.id}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: '#F5E6C8' }}>{w.username}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#F0B429' }}>{parseInt(w.amount).toLocaleString('fr-FR')} ✦</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: STATUS_COLS[w.status] || '#F5E6C8', background: (STATUS_COLS[w.status] || '#fff') + '14', padding: '3px 10px', borderRadius: 20, border: `1px solid ${STATUS_COLS[w.status] || '#fff'}30` }}>
                          {STATUS_LABELS[w.status] || w.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)' }}>{w.created_at?.slice(0, 16)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {w.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleWithdraw(w.id, 'approved')} style={{ fontFamily: 'Cinzel, serif', fontSize: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>✅ Approuver</button>
                            <button onClick={() => handleWithdraw(w.id, 'rejected', 'Refusé par admin')} style={{ fontFamily: 'Cinzel, serif', fontSize: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>❌ Refuser</button>
                          </div>
                        )}
                        {w.status !== 'pending' && <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 11, color: 'rgba(245,230,200,0.2)' }}>Traité</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── PARAMÈTRES JEUX ── */}
      {tab === 'settings' && (
        <div>
          <div style={{ marginBottom: 14, fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.4)' }}>
            Active ou désactive des jeux en temps réel. Les joueurs voient immédiatement "Maintenance".
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {GAMES.map(g => {
              const enabled = games[g.id] !== false
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(160deg,#1E1015,#150D10)', border: `1px solid ${enabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 12, padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24, filter: enabled ? '' : 'grayscale(1)' }}>{g.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: enabled ? '#F5E6C8' : 'rgba(245,230,200,0.4)' }}>{g.name}</div>
                      <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 11, color: enabled ? '#22C55E' : '#EF4444', marginTop: 2 }}>
                        {enabled ? '✅ Actif' : '🔧 En maintenance'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleGame(g.id, enabled)} style={{
                    fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 11,
                    background: enabled ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    border: `1px solid ${enabled ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    color: enabled ? '#EF4444' : '#22C55E',
                    padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                  }}>
                    {enabled ? '🔴 Désactiver' : '✅ Activer'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── JACKPOT ── */}
      {tab === 'jackpot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500 }}>
          <div style={{ background: 'rgba(196,30,58,0.06)', border: '1px solid rgba(196,30,58,0.2)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'rgba(232,85,106,0.6)', letterSpacing: '0.15em', marginBottom: 8 }}>SUPERJACKPOT ACTUEL</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 36, fontWeight: 900, color: '#E8556A' }}>{(jackpot || 0).toLocaleString('fr-FR')} ✦</div>
          </div>
          <div style={{ background: 'linear-gradient(160deg,#1E1015,#150D10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: 'rgba(245,230,200,0.5)', marginBottom: 12 }}>Modifier le montant</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" placeholder="Nouveau montant" style={{ ...inputSt, flex: 1 }} />
              <button onClick={updateJackpot} disabled={!newAmount} style={{ ...btnGold, opacity: !newAmount ? 0.4 : 1 }}>Mettre à jour</button>
            </div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>⚠ Tirage manuel</div>
            <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.5)', marginBottom: 12 }}>
              Déclenche le tirage immédiatement. Utilisé si le cron ne tourne pas.
            </div>
            <button onClick={triggerDraw} style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>
              💎 Déclencher le tirage maintenant
            </button>
          </div>
        </div>
      )}

      {/* ── ACTIONS ── */}
      {tab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: 'rgba(245,230,200,0.5)', marginBottom: 8 }}>Créer un joueur</div>
            <CreateUser onDone={() => { loadAll(); flash('Joueur créé ✅') }} />
          </div>
          <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Zone danger — NE PAS UTILISER en prod</div>
            <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.4)', marginBottom: 12 }}>
              Réinitialise TOUT : historique, jackpot, retraits, chat. Irréversible.
            </div>
            <button onClick={async () => {
              if (!confirm('⚠ ATTENTION : effacer TOUTES les données ? Cette action est irréversible !')) return
              try {
                await axios.post('/api/admin/reset-data', { secret: 'frilous-reset-2025' })
                flash('Base de données nettoyée')
                loadAll()
              } catch { flash('Erreur reset', true) }
            }} style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 11, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>
              🗑️ Reset total (dangereux)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateUser({ onDone }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [balance,  setBalance]  = useState('')
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')
  const inputSt = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(240,180,41,0.2)',
    borderRadius: 8, padding: '8px 12px', color: '#F5E6C8',
    fontFamily: 'Crimson Pro, serif', fontSize: 13, outline: 'none',
  }

  async function submit() {
    if (!username || !password) return setErr('Pseudo et mot de passe requis')
    setLoading(true); setErr('')
    try {
      await axios.post('/api/admin/users', { username, password, balance: parseInt(balance) || 0, is_admin: isAdmin ? 1 : 0 })
      setUsername(''); setPassword(''); setBalance(''); setIsAdmin(false)
      onDone()
    } catch (e) { setErr(e.response?.data?.error || 'Erreur') }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Pseudo Minecraft" style={inputSt} />
      <input value={password} onChange={e => setPassword(e.target.value)} type="text" placeholder="Mot de passe temporaire" style={inputSt} />
      <input value={balance}  onChange={e => setBalance(e.target.value)}  type="number" placeholder="Jetons de départ (0)" style={inputSt} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(245,230,200,0.5)', cursor: 'pointer' }}>
        <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} /> Admin
      </label>
      {err && <div style={{ color: '#E8556A', fontFamily: 'Crimson Pro, serif', fontSize: 12 }}>⚠ {err}</div>}
      <button onClick={submit} disabled={loading} style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 11, background: 'linear-gradient(135deg,#FFD700,#F0B429)', color: '#1A0A00', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
        {loading ? 'Création…' : '➕ Créer le joueur'}
      </button>
    </div>
  )
}
