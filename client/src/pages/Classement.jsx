import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}
const GAME_ICONS = { slots:'🎰', plinko:'⚪', roulette:'🎡', crash:'📈', blackjack:'🃏', mines:'💣' }
const GAME_NAMES = { all:'Tous', slots:'Slots', plinko:'Plinko', roulette:'Roulette', crash:'Crash', blackjack:'Blackjack', mines:'Mines' }
const GAMES = ['all', 'slots', 'blackjack', 'crash', 'mines', 'roulette', 'plinko']
const TABS = [
  { id:'topProfit',  label:'💰 Meilleur bilan' },
  { id:'topWins',    label:'🔥 Plus gros gains' },
  { id:'topBet',     label:'🎲 Plus grosses mises' },
  { id:'mostPlayed', label:'🎮 Plus actifs' },
]

export default function Classement() {
  const [data,    setData]    = useState(null)
  const [tab,     setTab]     = useState('topProfit')
  const [game,    setGame]    = useState('all')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { load() }, [game])

  async function load() {
    setLoading(true); setError('')
    try {
      const params = game !== 'all' ? { game } : {}
      const { data: d } = await axios.get('/api/games/leaderboard', { params })
      setData(d)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de chargement')
    }
    setLoading(false)
  }

  const rows = data?.[tab] ?? []

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 28px', boxSizing:'border-box' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <Link to="/casino" style={{ fontSize:11, color:C.muted, textDecoration:'none' }}>← Accueil</Link>
        <span style={{ color:C.dim }}>/</span>
        <span style={{ fontSize:11, color:'#9898b8' }}>🏆 Classement</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:C.txt, margin:0 }}>🏆 Classement</h1>
        {/* Filtre jeu */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {GAMES.map(g => (
            <button key={g} onClick={() => setGame(g)} style={{
              padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer',
              border:`1px solid ${game===g?C.gold+'50':C.border}`,
              background:game===g?`${C.gold}15`:'transparent',
              color:game===g?C.gold:C.muted, transition:'all .15s',
            }}>
              {g==='all' ? '🎯 Tous' : `${GAME_ICONS[g]} ${GAME_NAMES[g]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${C.border}`, paddingBottom:10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', border:'none',
            background:tab===t.id?`${C.gold}18`:'transparent',
            color:tab===t.id?C.gold:C.muted, transition:'all .15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ textAlign:'center', color:C.muted, padding:'60px 0', fontSize:13 }}>Chargement…</div>
      ) : error ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ fontSize:13, color:C.red, marginBottom:10 }}>⚠ {error}</div>
          <button onClick={load} style={{ fontSize:11, color:C.gold, background:'none', border:`1px solid ${C.gold}40`, borderRadius:8, padding:'6px 14px', cursor:'pointer' }}>Réessayer</button>
        </div>
      ) : (
        <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign:'center', color:C.muted, padding:'40px 0', fontSize:12 }}>Aucune donnée pour cette catégorie</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:C.dim }}>
                  <th style={{ width:44, padding:'10px 12px', textAlign:'center', color:C.muted, fontWeight:600, fontSize:11 }}>#</th>
                  {getColumns(tab).map(col => (
                    <th key={col.key} style={{ padding:'10px 12px', textAlign:col.align||'left', color:C.muted, fontWeight:600, fontSize:11 }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ borderTop:`1px solid ${C.dim}`, background:i===0?`${C.gold}05`:i===1?`${C.muted}04`:'transparent', transition:'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.gold}08`}
                    onMouseLeave={e => e.currentTarget.style.background = i===0?`${C.gold}05`:i===1?`${C.muted}04`:'transparent'}
                  >
                    <td style={{ padding:'10px 12px', textAlign:'center', fontSize:i<3?16:12 }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span style={{ color:C.muted }}>{i+1}</span>}
                    </td>
                    {getColumns(tab).map(col => (
                      <td key={col.key} style={{ padding:'10px 12px', textAlign:col.align||'left', color:'#9898b8' }}>
                        {col.render ? col.render(row[col.key], row, i) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function getColumns(tab) {
  const PlayerCell = (v) => (
    <Link to={`/joueur/${v}`} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:`${C.gold}18`, border:`1px solid ${C.gold}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:C.gold, fontWeight:700, flexShrink:0 }}>
        {v?.slice(0,2).toUpperCase()}
      </div>
      <span style={{ fontWeight:700, color:'#d8d8f0' }}>{v}</span>
    </Link>
  )
  const GameCell = (v) => `${GAME_ICONS[v]||'🎲'} ${GAME_NAMES[v]||v}`
  const Num = (v) => parseInt(v||0).toLocaleString()
  const GoldNum = (v) => <span style={{ fontWeight:800, color:C.gold }}>{Num(v)}</span>
  const ProfitNum = (v) => <span style={{ fontWeight:800, color:v>0?C.green:C.red }}>{v>0?'+':''}{Num(v)}</span>
  const RefCell = (v) => <span style={{ fontFamily:'monospace', fontSize:10, color:C.muted }}>{v}</span>

  switch (tab) {
    case 'topProfit': return [
      { key:'username',     label:'Joueur',   render:PlayerCell },
      { key:'games_played', label:'Parties',  render:Num, align:'right' },
      { key:'total_bet',    label:'Misé',     render:Num, align:'right' },
      { key:'total_profit', label:'Bilan net',render:ProfitNum, align:'right' },
    ]
    case 'topWins': return [
      { key:'username', label:'Joueur', render:PlayerCell },
      { key:'game',     label:'Jeu',    render:GameCell },
      { key:'bet',      label:'Mise',   render:Num, align:'right' },
      { key:'payout',   label:'Gain',   render:GoldNum, align:'right' },
      { key:'bet_id',   label:'Réf',    render:RefCell },
    ]
    case 'topBet': return [
      { key:'username', label:'Joueur',    render:PlayerCell },
      { key:'game',     label:'Jeu',       render:GameCell },
      { key:'bet',      label:'Mise',      render:GoldNum, align:'right' },
      { key:'payout',   label:'Résultat',  render:(v,r)=><span style={{color:parseInt(v)>parseInt(r.bet)?C.green:C.red}}>{Num(v)}</span>, align:'right' },
      { key:'bet_id',   label:'Réf',       render:RefCell },
    ]
    case 'mostPlayed': return [
      { key:'username',     label:'Joueur',      render:PlayerCell },
      { key:'games_played', label:'Parties',     render:GoldNum, align:'right' },
      { key:'total_bet',    label:'Total misé',  render:Num, align:'right' },
    ]
    default: return []
  }
}
