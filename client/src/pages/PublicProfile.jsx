import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { getRankFromWagered, RANKS } from '../utils/ranks'

const GAME_ICONS={slots:'🎰',plinko:'⚪',roulette:'🎡',blackjack:'🃏',mines:'💣'}
const GAME_NAMES={slots:'Slots',plinko:'Plinko',roulette:'Roulette',blackjack:'Blackjack',mines:'Mines'}

export default function PublicProfile(){
  const{username}=useParams()
  const[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);axios.get(`/api/games/player/${username}`).then(r=>setData(r.data)).catch(e=>setError(e.response?.data?.error||'Joueur introuvable')).finally(()=>setLoading(false))},[username])
  if(loading)return<div style={{padding:'60px',textAlign:'center',fontFamily:'Crimson Pro, serif',color:'rgba(245,230,200,0.3)',fontSize:15}}>Chargement…</div>
  if(error)return(
    <div style={{padding:'60px',textAlign:'center'}}>
      <div style={{fontSize:40,marginBottom:12}}>😕</div>
      <div style={{fontFamily:'Crimson Pro, serif',color:'#EF4444',fontSize:14,marginBottom:8}}>{error}</div>
      <Link to="/classement" style={{fontFamily:'Cinzel, serif',color:'rgba(245,230,200,0.4)',fontSize:12}}>← Classement</Link>
    </div>
  )
  const{stats,by_game,big_wins,member_since,rank_id,total_wagered}=data
  const rank=getRankFromWagered(total_wagered||0)
  const profit=stats.net_profit??0
  return(
    <div style={{padding:'28px 32px',minHeight:'100%',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <Link to="/classement" style={{fontFamily:'Cinzel, serif',fontSize:11,color:'rgba(245,230,200,0.3)',textDecoration:'none'}}>← Classement</Link>
        <span style={{color:'rgba(255,255,255,0.1)'}}>/</span>
        <span style={{fontFamily:'Cinzel, serif',fontSize:11,color:'rgba(245,230,200,0.5)'}}>{data.username}</span>
      </div>
      <div style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:`1px solid ${rank.color}25`,borderRadius:20,padding:'24px 28px',marginBottom:16,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${rank.color},transparent)`}}/>
        <div style={{width:60,height:60,borderRadius:'50%',background:`${rank.color}20`,border:`2px solid ${rank.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cinzel Decorative, serif',fontSize:18,color:rank.color,fontWeight:900,flexShrink:0}}>
          {data.username?.slice(0,2).toUpperCase()}
        </div>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <h1 style={{fontFamily:'Cinzel, serif',fontSize:20,fontWeight:700,color:'#F5E6C8',margin:0}}>{data.username}</h1>
            <div style={{fontFamily:'Cinzel, serif',fontSize:11,color:rank.color,background:`${rank.color}18`,border:`1px solid ${rank.color}35`,padding:'3px 10px',borderRadius:20}}>{rank.icon} {rank.name}</div>
          </div>
          <div style={{fontFamily:'Crimson Pro, serif',fontSize:12,color:'rgba(245,230,200,0.35)'}}>Membre depuis {new Date(member_since).toLocaleDateString('fr-FR',{year:'numeric',month:'long'})}</div>
        </div>
        <div style={{marginLeft:'auto',background:profit>=0?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.06)',border:`1px solid ${profit>=0?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`,borderRadius:12,padding:'12px 20px',textAlign:'center'}}>
          <div style={{fontFamily:'Cinzel, serif',fontSize:9,color:'rgba(245,230,200,0.3)',marginBottom:4,letterSpacing:'0.1em'}}>BILAN NET</div>
          <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:22,fontWeight:700,color:profit>=0?'#22C55E':'#EF4444'}}>{profit>=0?'+':''}{profit.toLocaleString('fr-FR')}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[{icon:'🎮',label:'Parties',val:stats.games_played.toLocaleString('fr-FR')},{icon:'🪙',label:'Total misé',val:stats.total_bet.toLocaleString('fr-FR')},{icon:'💰',label:'Total gagné',val:stats.total_payout.toLocaleString('fr-FR')},{icon:'🔥',label:'Meilleur gain',val:`+${(stats.biggest_profit||0).toLocaleString('fr-FR')}`,color:'#F0B429'}].map(({icon,label,val,color})=>(
          <div key={label} style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:18,marginBottom:6}}>{icon}</div>
            <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:16,fontWeight:700,color:color||'#F5E6C8'}}>{val}</div>
            <div style={{fontFamily:'Cinzel, serif',fontSize:10,color:'rgba(245,230,200,0.3)',marginTop:3}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {by_game?.length>0&&(
          <div style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:18}}>
            <div style={{fontFamily:'Cinzel, serif',fontSize:13,fontWeight:700,color:'rgba(245,230,200,0.5)',marginBottom:14}}>Par jeu</div>
            {by_game.map(g=>{const gp=parseInt(g.profit);return(
              <div key={g.game} style={{background:'rgba(255,255,255,0.02)',borderRadius:10,padding:'10px 12px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:20,flexShrink:0}}>{GAME_ICONS[g.game]||'🎲'}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Cinzel, serif',fontSize:12,fontWeight:700,color:'#F5E6C8',marginBottom:2}}>{GAME_NAMES[g.game]||g.game}</div>
                  <div style={{fontFamily:'Crimson Pro, serif',fontSize:11,color:'rgba(245,230,200,0.35)'}}>{parseInt(g.plays)} parties</div>
                </div>
                <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:13,fontWeight:700,color:gp>=0?'#22C55E':'#EF4444'}}>{gp>=0?'+':''}{gp.toLocaleString('fr-FR')}</div>
              </div>
            )})}
          </div>
        )}
        {big_wins?.length>0&&(
          <div style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:18}}>
            <div style={{fontFamily:'Cinzel, serif',fontSize:13,fontWeight:700,color:'rgba(245,230,200,0.5)',marginBottom:14}}>🔥 Gros coups</div>
            {big_wins.map((w,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,215,0,0.08)',borderRadius:10,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:14}}>{GAME_ICONS[w.game]||'🎲'}</span>
                    <span style={{fontFamily:'Cinzel, serif',fontSize:12,fontWeight:700,color:'#F5E6C8'}}>{GAME_NAMES[w.game]||w.game}</span>
                  </div>
                  <div style={{fontFamily:'Crimson Pro, serif',fontSize:11,color:'rgba(245,230,200,0.35)',marginTop:2}}>Mise {parseInt(w.bet).toLocaleString('fr-FR')}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:16,fontWeight:700,color:'#FFD700'}}>+{parseInt(w.profit).toLocaleString('fr-FR')}</div>
                  <div style={{fontFamily:'Crimson Pro, serif',fontSize:10,color:'rgba(245,230,200,0.25)'}}>{new Date(w.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
