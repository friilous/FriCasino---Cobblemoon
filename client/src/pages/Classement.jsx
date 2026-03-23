import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { getRankFromWagered } from '../utils/ranks'

const GAME_ICONS = { slots:'🎰', plinko:'⚪', roulette:'🎡', blackjack:'🃏', mines:'💣' }
const GAME_NAMES = { all:'Tous', slots:'Slots', plinko:'Plinko', roulette:'Roulette', blackjack:'Blackjack', mines:'Mines' }
const GAMES = ['all','slots','blackjack','mines','roulette','plinko']
const TABS = [{id:'topBestWin',label:'🏆 Meilleur gain'},{id:'topBet',label:'🎲 Plus grosses mises'},{id:'mostPlayed',label:'🎮 Plus actifs'}]

export default function Classement() {
  const [data,setData]=useState(null),[tab,setTab]=useState('topBestWin'),[game,setGame]=useState('all'),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{load()},[game])
  async function load(){setLoading(true);setError('');try{const params=game!=='all'?{game}:{};const{data:d}=await axios.get('/api/games/leaderboard',{params});setData(d)}catch(e){setError(e.response?.data?.error||'Erreur')}setLoading(false)}
  const rows=data?.[tab]??[]

  function PlayerCell(v){
    return(
      <Link to={`/joueur/${v}`} style={{textDecoration:'none',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(240,180,41,0.15)',border:'1px solid rgba(240,180,41,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cinzel, serif',fontSize:10,color:'#F0B429',fontWeight:700,flexShrink:0}}>
          {v?.slice(0,2).toUpperCase()}
        </div>
        <span style={{fontFamily:'Cinzel, serif',fontWeight:700,color:'#F5E6C8',fontSize:12}}>{v}</span>
      </Link>
    )
  }

  const cols={
    topBestWin:[{key:'username',label:'Joueur',render:PlayerCell},{key:'game',label:'Jeu',render:v=>`${GAME_ICONS[v]||'🎲'} ${GAME_NAMES[v]||v}`},{key:'bet',label:'Mise',align:'right',render:v=>parseInt(v).toLocaleString('fr-FR')},{key:'payout',label:'Gain',align:'right',render:v=><span style={{fontFamily:'JetBrains Mono, monospace',fontWeight:700,color:'#22C55E'}}>+{parseInt(v).toLocaleString('fr-FR')}</span>},{key:'bet_id',label:'Réf',render:v=><span style={{fontFamily:'JetBrains Mono, monospace',fontSize:10,color:'rgba(245,230,200,0.2)'}}>{v}</span>}],
    topBet:[{key:'username',label:'Joueur',render:PlayerCell},{key:'game',label:'Jeu',render:v=>`${GAME_ICONS[v]||'🎲'} ${GAME_NAMES[v]||v}`},{key:'bet',label:'Mise',align:'right',render:v=><span style={{fontFamily:'JetBrains Mono, monospace',fontWeight:700,color:'#F0B429'}}>+{parseInt(v).toLocaleString('fr-FR')}</span>},{key:'payout',label:'Résultat',align:'right',render:(v,r)=><span style={{fontFamily:'JetBrains Mono, monospace',fontSize:12,color:parseInt(v)>parseInt(r.bet)?'#22C55E':'#EF4444'}}>{parseInt(v).toLocaleString('fr-FR')}</span>}],
    mostPlayed:[{key:'username',label:'Joueur',render:PlayerCell},{key:'games_played',label:'Parties',align:'right',render:v=><span style={{fontFamily:'JetBrains Mono, monospace',fontWeight:700,color:'#F0B429'}}>{parseInt(v).toLocaleString('fr-FR')}</span>},{key:'total_bet',label:'Total misé',align:'right',render:v=>parseInt(v).toLocaleString('fr-FR')}],
  }
  const currentCols=cols[tab]||cols.topBestWin

  return(
    <div style={{padding:'28px 32px',minHeight:'100%',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontFamily:'Cinzel Decorative, serif',fontSize:22,fontWeight:900,color:'#F5E6C8',margin:0}}>🏆 Classement</h1>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {GAMES.map(g=>(
            <button key={g} onClick={()=>setGame(g)} style={{padding:'5px 12px',borderRadius:8,fontSize:11,fontWeight:600,fontFamily:'Cinzel, serif',cursor:'pointer',border:`1px solid ${game===g?'rgba(240,180,41,0.4)':'rgba(255,255,255,0.08)'}`,background:game===g?'rgba(240,180,41,0.1)':'transparent',color:game===g?'#F0B429':'rgba(245,230,200,0.4)',transition:'all .15s'}}>
              {g==='all'?'🎯 Tous':`${GAME_ICONS[g]} ${GAME_NAMES[g]}`}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid rgba(240,180,41,0.1)',paddingBottom:10}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'7px 16px',borderRadius:8,fontSize:12,fontWeight:700,fontFamily:'Cinzel, serif',cursor:'pointer',border:'none',background:tab===t.id?'rgba(240,180,41,0.12)':'transparent',color:tab===t.id?'#F0B429':'rgba(245,230,200,0.35)',transition:'all .15s'}}>
            {t.label}
          </button>
        ))}
      </div>
      {loading?(
        <div style={{textAlign:'center',color:'rgba(245,230,200,0.2)',padding:'60px 0',fontFamily:'Crimson Pro, serif',fontSize:15}}>Chargement…</div>
      ):error?(
        <div style={{textAlign:'center',padding:'60px 0'}}>
          <div style={{fontFamily:'Crimson Pro, serif',fontSize:14,color:'#EF4444',marginBottom:10}}>⚠ {error}</div>
          <button onClick={load} style={{fontFamily:'Cinzel, serif',fontSize:11,color:'#F0B429',background:'none',border:'1px solid rgba(240,180,41,0.3)',borderRadius:8,padding:'6px 14px',cursor:'pointer'}}>Réessayer</button>
        </div>
      ):(
        <div style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
          {rows.length===0?(
            <div style={{textAlign:'center',fontFamily:'Crimson Pro, serif',color:'rgba(245,230,200,0.2)',padding:'40px 0',fontSize:14}}>Aucune donnée — sois le premier à jouer !</div>
          ):(
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'rgba(255,255,255,0.02)'}}>
                  <th style={{width:44,padding:'10px 12px',textAlign:'center',fontFamily:'Cinzel, serif',fontSize:10,color:'rgba(245,230,200,0.3)',letterSpacing:'0.1em'}}>#</th>
                  {currentCols.map(col=>(
                    <th key={col.key} style={{padding:'10px 12px',textAlign:col.align||'left',fontFamily:'Cinzel, serif',fontSize:10,color:'rgba(245,230,200,0.3)',letterSpacing:'0.1em'}}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row,i)=>(
                  <tr key={i} style={{borderTop:'1px solid rgba(255,255,255,0.04)',background:i===0?'rgba(255,215,0,0.04)':i===1?'rgba(200,200,200,0.02)':'transparent',transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(240,180,41,0.06)'}
                    onMouseLeave={e=>e.currentTarget.style.background=i===0?'rgba(255,215,0,0.04)':i===1?'rgba(200,200,200,0.02)':'transparent'}
                  >
                    <td style={{padding:'10px 12px',textAlign:'center',fontSize:i<3?18:13}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':<span style={{fontFamily:'JetBrains Mono, monospace',color:'rgba(245,230,200,0.25)'}}>{i+1}</span>}</td>
                    {currentCols.map(col=>(
                      <td key={col.key} style={{padding:'10px 12px',textAlign:col.align||'left',fontFamily:'Crimson Pro, serif',fontSize:13,color:'rgba(245,230,200,0.6)'}}>
                        {col.render?col.render(row[col.key],row,i):(row[col.key]??'—')}
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
