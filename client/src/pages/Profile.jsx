import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRankFromWagered, getNextRank, getXPProgress, RANKS } from '../utils/ranks'

const GAME_ICONS = { slots:'🎰', plinko:'⚪', roulette:'🎡', blackjack:'🃏', mines:'💣' }
const GAME_NAMES = { slots:'Slots', plinko:'Plinko', roulette:'Roulette', blackjack:'Blackjack', mines:'Mines' }

const FILTERS = [
  { id:'all',      label:'Tout' },
  { id:'wins',     label:'✅ Gains' },
  { id:'losses',   label:'❌ Pertes' },
  { id:'big_wins', label:'🔥 Gros gains' },
]

export default function Profile() {
  const { user } = useAuth()
  const [history,          setHistory]          = useState(null)
  const [gameHistory,      setGameHistory]      = useState([])
  const [tab,              setTab]              = useState('overview')
  const [histFilter,       setHistFilter]       = useState('all')
  const [histPage,         setHistPage]         = useState(0)
  const [histTotal,        setHistTotal]        = useState(0)
  const [loadingHist,      setLoadingHist]      = useState(false)
  const [withdrawAmount,   setWithdrawAmount]   = useState('')
  const [withdrawMsg,      setWithdrawMsg]      = useState('')
  const [withdrawError,    setWithdrawError]    = useState('')
  const [withdrawLoading,  setWithdrawLoading]  = useState(false)

  const LIMIT = 20

  const rank     = user?.total_wagered !== undefined ? getRankFromWagered(user.total_wagered) : null
  const nextRank = rank ? getNextRank(rank.id) : null
  const xp       = rank && nextRank ? getXPProgress(user?.total_wagered || 0, rank, nextRank) : 100

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
    } finally { setWithdrawLoading(false) }
  }

  const games       = history?.games || []
  const totalWon    = games.reduce((s, g) => s + (g.payout > g.bet ? g.payout - g.bet : 0), 0)
  const totalLost   = games.reduce((s, g) => s + (g.payout < g.bet ? g.bet - g.payout : 0), 0)
  const netPnl      = totalWon - totalLost
  const gamesCount  = games.length
  const winCount    = games.filter(g => g.payout > g.bet).length
  const winRate     = gamesCount > 0 ? Math.round((winCount / gamesCount) * 100) : 0
  const biggestWin  = games.reduce((m, g) => Math.max(m, g.payout - g.bet), 0)

  const byGame = games.reduce((acc, g) => {
    if (!acc[g.game]) acc[g.game] = { plays: 0, profit: 0, wins: 0 }
    acc[g.game].plays++
    acc[g.game].profit += g.payout - g.bet
    if (g.payout > g.bet) acc[g.game].wins++
    return acc
  }, {})

  const favGame = Object.entries(byGame).sort((a,b) => b[1].plays - a[1].plays)[0]

  const totalPages = Math.ceil(histTotal / LIMIT)

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', boxSizing: 'border-box' }}>

      {/* ── Hero profil ── */}
      <div style={{
        background: 'linear-gradient(160deg, #1E1015, #150D10)',
        border: rank ? `1px solid ${rank.color}30` : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        boxShadow: rank ? `0 0 40px ${rank.color}0a` : 'none',
      }}>
        {/* Ligne déco */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: rank ? `linear-gradient(90deg, transparent, ${rank.color}, transparent)` : 'transparent',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: rank ? `linear-gradient(135deg, ${rank.color}40, ${rank.color}20)` : 'rgba(240,180,41,0.15)',
            border: `2px solid ${rank?.color || 'rgba(240,180,41,0.4)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cinzel Decorative, serif', fontSize: 18, color: rank?.color || '#F0B429', fontWeight: 900,
            boxShadow: rank ? `0 0 20px ${rank.color}30` : 'none',
          }}>
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>

          {/* Infos */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#F5E6C8', margin: 0 }}>
                {user?.username}
              </h1>
              {rank && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
                  color: rank.color,
                  background: `${rank.color}18`,
                  border: `1px solid ${rank.color}40`,
                  padding: '3px 10px', borderRadius: 20,
                }}>
                  {rank.icon} {rank.name}
                </div>
              )}
            </div>
            {nextRank ? (
              <>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', marginBottom: 6 }}>
                  Progression → {nextRank.icon} {nextRank.name}
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', maxWidth: 300 }}>
                  <div style={{
                    height: '100%', width: `${xp}%`,
                    background: `linear-gradient(90deg, ${rank?.color}88, ${rank?.color})`,
                    borderRadius: 3, transition: 'width 1.5s ease',
                  }} />
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)', marginTop: 4 }}>
                  {(user?.total_wagered || 0).toLocaleString('fr-FR')} / {nextRank.threshold.toLocaleString('fr-FR')} ✦ misés
                </div>
              </>
            ) : (
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#FFD700' }}>✦ Rang Maximum — CobbleMoon Legend ✦</div>
            )}
          </div>

          {/* Solde + Retrait */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(240,180,41,0.5)', letterSpacing: '0.15em', marginBottom: 4 }}>
              SOLDE
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700, color: '#FFD700', marginBottom: 10 }}>
              {(user?.balance || 0).toLocaleString('fr-FR')} ✦
            </div>
            <form onSubmit={handleWithdraw} style={{ display: 'flex', gap: 6 }}>
              <input
                type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Montant (min 100)" min={100} max={user?.balance}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(240,180,41,0.2)',
                  borderRadius: 8, padding: '7px 12px', color: '#F5E6C8',
                  fontFamily: 'Crimson Pro, serif', fontSize: 13, outline: 'none', width: 170,
                }}
              />
              <button type="submit" disabled={withdrawLoading || !withdrawAmount} style={{
                background: 'linear-gradient(135deg, #FFD700, #F0B429)', color: '#1A0A00',
                fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 11,
                padding: '7px 14px', borderRadius: 8, border: 'none',
                cursor: withdrawLoading || !withdrawAmount ? 'not-allowed' : 'pointer',
                opacity: withdrawLoading || !withdrawAmount ? 0.5 : 1,
              }}>
                {withdrawLoading ? '…' : '💸 Retrait'}
              </button>
            </form>
          </div>
        </div>

        {/* Messages retrait */}
        {withdrawMsg && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontFamily: 'Crimson Pro, serif', fontSize: 13, color: '#22C55E' }}>
            ✅ {withdrawMsg}
          </div>
        )}
        {withdrawError && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.2)', borderRadius: 8, fontFamily: 'Crimson Pro, serif', fontSize: 13, color: '#E8556A' }}>
            ⚠ {withdrawError}
          </div>
        )}

        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Link to={`/joueur/${user?.username}`} style={{
            fontFamily: 'Cinzel, serif', fontSize: 11, color: 'rgba(245,230,200,0.3)',
            textDecoration: 'none', letterSpacing: '0.05em',
          }}>
            👁 Voir profil public →
          </Link>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid rgba(240,180,41,0.1)', paddingBottom: 12 }}>
        {[
          { id: 'overview',      label: '📊 Vue d\'ensemble' },
          { id: 'history',       label: '🎮 Historique' },
          { id: 'transactions',  label: '📋 Transactions' },
          { id: 'withdrawals',   label: '💸 Retraits' },
          { id: 'ranks',         label: '🏆 Rangs' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            fontFamily: 'Cinzel, serif',
            cursor: 'pointer', border: 'none',
            background: tab === t.id ? 'rgba(240,180,41,0.12)' : 'transparent',
            color: tab === t.id ? '#F0B429' : 'rgba(245,230,200,0.4)',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <MiniStat label="Parties jouées" value={gamesCount} icon="🎮" />
            <MiniStat label="Taux de victoire" value={`${winRate}%`} icon="🎯" color={winRate > 50 ? '#22C55E' : '#EF4444'} />
            <MiniStat label="Bilan net" value={`${netPnl >= 0 ? '+' : ''}${netPnl.toLocaleString('fr-FR')}`} icon="💰" color={netPnl >= 0 ? '#22C55E' : '#EF4444'} />
            <MiniStat label="Plus gros gain" value={`+${biggestWin.toLocaleString('fr-FR')}`} icon="🔥" color="#F0B429" />
          </div>

          {favGame && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 32 }}>{GAME_ICONS[favGame[0]] || '🎲'}</span>
              <div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: 'rgba(240,180,41,0.6)', marginBottom: 2 }}>Jeu favori</div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: '#F5E6C8' }}>
                  {GAME_NAMES[favGame[0]]} — {favGame[1].plays} parties
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: favGame[1].profit >= 0 ? '#22C55E' : '#EF4444' }}>
                  {favGame[1].profit >= 0 ? '+' : ''}{favGame[1].profit.toLocaleString('fr-FR')} ✦
                </div>
                <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 11, color: 'rgba(245,230,200,0.3)' }}>bilan</div>
              </div>
            </div>
          )}

          {Object.keys(byGame).length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18 }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'rgba(245,230,200,0.5)', marginBottom: 14, letterSpacing: '0.1em' }}>
                Par jeu
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Jeu', 'Parties', 'Victoires', 'Taux', 'Bilan'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Jeu' ? 'left' : 'right', fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.1em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byGame).sort((a,b) => b[1].plays - a[1].plays).map(([game, s]) => (
                    <tr key={game}>
                      <td style={{ padding: '10px', fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: '#F5E6C8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {GAME_ICONS[game]} {GAME_NAMES[game] || game}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(245,230,200,0.5)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{s.plays}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(245,230,200,0.5)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{s.wins}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: s.wins/s.plays > 0.5 ? '#22C55E' : '#EF4444', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {Math.round(s.wins/s.plays*100)}%
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: s.profit >= 0 ? '#22C55E' : '#EF4444', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {s.profit >= 0 ? '+' : ''}{s.profit.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gamesCount === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(245,230,200,0.2)', fontFamily: 'Crimson Pro, serif', fontSize: 15 }}>
              Aucune partie jouée — commence dès maintenant ! 🎰
            </div>
          )}
        </div>
      )}

      {/* ── Historique parties ── */}
      {tab === 'history' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => { setHistFilter(f.id); setHistPage(0) }} style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 11,
                fontFamily: 'Cinzel, serif', cursor: 'pointer',
                border: histFilter === f.id ? '1px solid rgba(240,180,41,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: histFilter === f.id ? 'rgba(240,180,41,0.1)' : 'transparent',
                color: histFilter === f.id ? '#F0B429' : 'rgba(245,230,200,0.35)',
              }}>
                {f.label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)', alignSelf: 'center' }}>
              {histTotal} résultats
            </span>
          </div>

          {loadingHist ? (
            <div style={{ textAlign: 'center', color: 'rgba(245,230,200,0.2)', padding: '20px 0', fontFamily: 'Crimson Pro, serif' }}>Chargement…</div>
          ) : gameHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(245,230,200,0.2)', padding: '20px 0', fontFamily: 'Crimson Pro, serif' }}>Aucune partie dans cette catégorie</div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['#Réf', 'Jeu', 'Mise', 'Résultat', 'Date'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: h === '#Réf' || h === 'Jeu' ? 'left' : 'right', fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.08em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map(g => (
                    <tr key={g.id}>
                      <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{g.bet_id}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'Cinzel, serif', fontSize: 12, color: '#F5E6C8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {GAME_ICONS[g.game]} {GAME_NAMES[g.game] || g.game}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(245,230,200,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {parseInt(g.bet).toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: parseInt(g.payout) > 0 ? '#22C55E' : '#EF4444', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {parseInt(g.payout) > 0 ? `+${parseInt(g.payout).toLocaleString('fr-FR')}` : `−${parseInt(g.bet).toLocaleString('fr-FR')}`}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {new Date(g.created_at).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                  <PaginBtn disabled={histPage === 0} onClick={() => setHistPage(p => p - 1)}>← Préc</PaginBtn>
                  <span style={{ padding: '5px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(245,230,200,0.3)' }}>{histPage + 1} / {totalPages}</span>
                  <PaginBtn disabled={histPage >= totalPages - 1} onClick={() => setHistPage(p => p + 1)}>Suiv →</PaginBtn>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Transactions ── */}
      {tab === 'transactions' && (
        <SimpleList items={history?.transactions || []} renderItem={tx => ({
          left: tx.description || tx.type,
          sub: new Date(tx.created_at).toLocaleString('fr-FR'),
          right: `${['credit','win'].includes(tx.type) ? '+' : '-'}${tx.amount.toLocaleString('fr-FR')}`,
          rightColor: ['credit','win'].includes(tx.type) ? '#22C55E' : '#EF4444',
        })} />
      )}

      {/* ── Retraits ── */}
      {tab === 'withdrawals' && (
        <SimpleList items={history?.withdrawals || []} renderItem={w => ({
          left: `${w.amount.toLocaleString('fr-FR')} jetons`,
          sub: new Date(w.created_at).toLocaleString('fr-FR'),
          right: w.status === 'approved' ? '✅ Approuvé' : w.status === 'rejected' ? '❌ Refusé' : '⏳ En attente',
          rightColor: w.status === 'approved' ? '#22C55E' : w.status === 'rejected' ? '#EF4444' : '#F0B429',
        })} />
      )}

      {/* ── Rangs ── */}
      {tab === 'ranks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RANKS.map(r => {
            const isCurrentRank = rank?.id === r.id
            const isUnlocked = (user?.total_wagered || 0) >= r.threshold
            return (
              <div key={r.id} style={{
                background: isCurrentRank ? `${r.color}10` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCurrentRank ? r.color + '40' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12, padding: '14px 18px',
                opacity: isUnlocked ? 1 : 0.45,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: r.color }}>
                      {r.name}
                    </span>
                    {isCurrentRank && (
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: r.color, background: `${r.color}20`, border: `1px solid ${r.color}40`, padding: '2px 8px', borderRadius: 20 }}>
                        ACTUEL
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 12, color: 'rgba(245,230,200,0.4)' }}>
                    {r.description} — Seuil : {r.threshold.toLocaleString('fr-FR')} ✦ misés
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', marginBottom: 4 }}>Avantages</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: r.color }}>
                    Mise max {r.maxBet === 999999 ? 'Illimitée' : r.maxBet.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(245,230,200,0.4)' }}>
                    Retrait max {r.maxWithdraw === 999999 ? 'Illimité' : r.maxWithdraw.toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, icon, color = '#F5E6C8' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(245,230,200,0.3)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function SimpleList({ items, renderItem }) {
  if (!items || items.length === 0) {
    return <div style={{ textAlign: 'center', color: 'rgba(245,230,200,0.2)', padding: '40px 0', fontFamily: 'Crimson Pro, serif' }}>Aucun élément</div>
  }
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18 }}>
      {items.map((item, i) => {
        const { left, sub, right, rightColor } = renderItem(item)
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 14, color: '#F5E6C8' }}>{left}</div>
              {sub && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(245,230,200,0.25)', marginTop: 2 }}>{sub}</div>}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: rightColor || '#F5E6C8' }}>
              {right}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PaginBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '5px 14px', borderRadius: 6,
      border: '1px solid rgba(240,180,41,0.2)', background: 'transparent',
      color: disabled ? 'rgba(240,180,41,0.2)' : 'rgba(240,180,41,0.6)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'Cinzel, serif', fontSize: 11,
    }}>
      {children}
    </button>
  )
}
