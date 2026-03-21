import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C = {
  bg:'#06060f', surf1:'#0c0c1e', felt:'#081a0c', feltBorder:'#0f3018',
  border:'#1e1e3a', gold:'#f0b429', green:'#22c55e', red:'#ef4444',
  txt:'#e2e2f0', muted:'#44446a', dim:'#1a1a2e',
}
const SPRITE=dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const SUIT_COLORS={'♠':'#c8c8e8','♣':'#c8c8e8','♥':'#f06060','♦':'#f06060'}
const STATUS_INFO={
  blackjack:{label:'🏆 BLACKJACK !',color:'#f0c040'},
  win:{label:'✅ Gagné !',color:'#22c55e'},
  push:{label:'🤝 Égalité',color:'#8888cc'},
  bust:{label:'💥 Dépassement !',color:'#ef4444'},
  lose:{label:'❌ Perdu',color:'#ef4444'},
  dealer_blackjack:{label:'😈 Blackjack dealer',color:'#ef4444'},
}

function Card({card,hidden=false}){
  if(hidden)return(
    <div style={{width:84,height:116,borderRadius:10,flexShrink:0,background:'linear-gradient(135deg,#1a1a3a 25%,#2a2a5a 50%,#1a1a3a 75%)',border:'1px solid #3a3a6a',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,0,.5)'}}>
      <span style={{fontSize:30}}>🎴</span>
    </div>
  )
  const col=SUIT_COLORS[card.suit]||'#c8c8e8'
  return(
    <div style={{width:84,height:116,borderRadius:10,background:'#12122a',border:'1px solid #2a2a4a',display:'flex',flexDirection:'column',padding:'6px 7px',flexShrink:0,boxShadow:'0 4px 14px rgba(0,0,0,.5)'}}>
      <div style={{lineHeight:1.1}}><div style={{fontSize:14,fontWeight:800,color:col}}>{card.value}</div><div style={{fontSize:12,color:col}}>{card.suit}</div></div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <img src={SPRITE(card.dex)} alt={card.name} title={card.name} style={{width:44,height:44,imageRendering:'pixelated',objectFit:'contain'}}/>
      </div>
      <div style={{lineHeight:1.1,transform:'rotate(180deg)',alignSelf:'flex-end'}}><div style={{fontSize:14,fontWeight:800,color:col}}>{card.value}</div><div style={{fontSize:12,color:col}}>{card.suit}</div></div>
    </div>
  )
}

function Hand({cards=[],value,label}){
  const over=value>21,bj=value===21
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <span style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>{label}</span>
        {value>0&&<div style={{fontSize:14,fontWeight:800,padding:'2px 12px',borderRadius:20,background:C.surf1,border:`1px solid ${over?C.red:bj?C.gold:C.border}`,color:over?C.red:bj?C.gold:C.txt,boxShadow:bj?`0 0 10px ${C.gold}40`:'none'}}>
          {over?`${value} 💥`:bj?'21 ✨':value}
        </div>}
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',minHeight:116}}>
        {cards.map((card,i)=><Card key={i} card={card} hidden={card.hidden}/>)}
      </div>
    </div>
  )
}

export default function Blackjack(){
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100),[phase,setPhase]=useState('idle')
  const [game,setGame]=useState(null),[loading,setLoading]=useState(false)
  const [error,setError]=useState(''),[history,setHistory]=useState([])

  async function sendAction(action,betAmount){
    setLoading(true);setError('')
    try{
      const payload=action==='deal'?{action,bet:betAmount}:{action}
      const{data}=await axios.post('/api/games/blackjack',payload)
      setGame(data);updateBalance(data.balance)
      if(data.done){
        setPhase('done')
        setHistory(p=>[{status:data.status,bet:action==='deal'?betAmount:game?.bet,payout:data.payout,doubled:data.doubled||false},...p].slice(0,8))
      }else setPhase('playing')
    }catch(err){setError(err.response?.data?.error||'Erreur réseau')}
    finally{setLoading(false)}
  }

  const canDouble=game?.canDouble&&phase==='playing'&&(user?.balance||0)>=(game?.bet||0)
  const statusInfo=game?.status?STATUS_INFO[game.status]:null
  const isPlaying=phase==='playing',isDone=phase==='done'

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'14px',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>🃏 Blackjack</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'220px 1fr 220px',gap:12,alignItems:'start'}}>

        {/* COL 1 — Contrôles */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            {!isPlaying?(
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading}/>
                <button onClick={()=>sendAction('deal',bet)} disabled={loading||bet<10||bet>(user?.balance||0)}
                  style={{width:'100%',marginTop:12,padding:'14px',background:loading?C.dim:C.gold,color:loading?C.muted:'#06060f',
                    fontWeight:800,fontSize:15,borderRadius:10,border:'none',cursor:loading?'not-allowed':'pointer',
                    opacity:loading||bet>(user?.balance||0)?.5:1,boxShadow:`0 0 20px ${C.gold}44`,transition:'all .15s'}}>
                  {loading?'Distribution...':(isDone?'🔄 Nouvelle partie':'🃏 Distribuer')}
                </button>
              </>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{textAlign:'center',fontSize:12,color:C.muted,padding:'4px 0'}}>
                  Mise : <span style={{color:C.gold,fontWeight:700}}>{(game?.bet||bet).toLocaleString()} jetons</span>
                </div>
                <button onClick={()=>sendAction('hit')} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'#1a3060',color:'#7eb4f8',fontWeight:800,fontSize:14,borderRadius:10,border:'1px solid #2a50a0',cursor:loading?'not-allowed':'pointer',opacity:loading?.5:1}}>
                  🃏 Tirer une carte
                </button>
                <button onClick={()=>sendAction('stand')} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'#3a0808',color:'#f87171',fontWeight:800,fontSize:14,borderRadius:10,border:'1px solid #7a1818',cursor:loading?'not-allowed':'pointer',opacity:loading?.5:1}}>
                  ✋ Rester
                </button>
                {canDouble&&(
                  <button onClick={()=>sendAction('double')} disabled={loading}
                    style={{width:'100%',padding:'11px',background:`${C.gold}18`,border:`1px solid ${C.gold}40`,color:C.gold,fontWeight:700,fontSize:13,borderRadius:10,cursor:'pointer'}}>
                    💰 Double Down (+{(game?.bet||bet).toLocaleString()})
                  </button>
                )}
                <div style={{textAlign:'center',fontSize:11,color:C.muted,marginTop:2}}>
                  Ta main : <span style={{color:(game?.playerValue||0)>21?C.red:(game?.playerValue||0)===21?C.gold:C.txt,fontWeight:700}}>{game?.playerValue||0}</span>
                </div>
              </div>
            )}
          </div>

          {isDone&&statusInfo&&(
            <div style={{background:`${statusInfo.color}10`,border:`1px solid ${statusInfo.color}30`,borderRadius:12,padding:14}}>
              <div style={{fontSize:14,fontWeight:800,color:statusInfo.color,marginBottom:4}}>
                {statusInfo.label}{game?.doubled&&<span style={{fontSize:10,color:C.gold,marginLeft:6}}>× Double</span>}
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:6}}>{game?.playerValue} vs {game?.dealerValue}</div>
              <div style={{fontSize:22,fontWeight:900,color:statusInfo.color}}>
                {game?.payout>0?`+${(game.payout-(game.bet||bet)).toLocaleString()}`:`−${(game.bet||bet).toLocaleString()}`}
              </div>
              <div style={{fontSize:11,color:C.muted}}>jetons</div>
            </div>
          )}

          {error&&<div style={{background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}

          {history.length>0&&(
            <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:12}}>
              <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Historique</div>
              {history.map((h,i)=>{
                const info=STATUS_INFO[h.status],net=h.payout-(h.bet||0)
                return<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:i<history.length-1?`1px solid ${C.dim}`:'none',fontSize:11}}>
                  <span style={{color:info?.color}}>{info?.label}</span>
                  <span style={{fontWeight:700,color:net>0?C.green:C.red}}>{net>0?'+':''}{net.toLocaleString()}</span>
                </div>
              })}
            </div>
          )}
        </div>

        {/* COL 2 — Table */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,padding:20,minHeight:440,display:'flex',flexDirection:'column'}}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,letterSpacing:3}}>BLACKJACK</div>
          </div>
          <div style={{background:C.felt,border:`1px solid ${C.feltBorder}`,borderRadius:14,padding:24,flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',gap:20}}>
            <Hand cards={game?.dealer||[]} value={isDone?game?.dealerValue:(game?.dealer?.[0]?game.dealerValue:0)} label="🎩 Dealer"/>
            <div style={{textAlign:'center',position:'relative',borderTop:`1px dashed ${C.feltBorder}`}}>
              <span style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:C.felt,padding:'0 12px',fontSize:16}}>🎯</span>
            </div>
            <Hand cards={game?.player||[]} value={game?.playerValue||0} label={`👤 ${user?.username||'Toi'}`}/>
          </div>
          {phase==='idle'&&<div style={{textAlign:'center',padding:'14px 0',fontSize:12,color:C.muted}}>Place ta mise et distribue !</div>}
        </div>

        {/* COL 3 — Règles */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>📋 Règles</div>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {[
              ['🏆 Blackjack naturel','×2.2',C.gold],
              ['✅ Victoire normale','×1.9',C.green],
              ['🤝 Égalité','×1.0','#8888cc'],
              ['💥 Dépassement 21','×0',C.red],
              ['💰 Double Down','×2 la mise',C.gold],
            ].map(([label,val,col])=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${C.dim}`}}>
                <span style={{fontSize:11,color:C.muted}}>{label}</span>
                <span style={{fontSize:13,fontWeight:800,color:col,fontFamily:'monospace'}}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,padding:'10px',background:`${C.gold}08`,border:`1px solid ${C.gold}20`,borderRadius:8,fontSize:10,color:C.muted,lineHeight:1.8}}>
            <div>🃏 Double Down : sur total <span style={{color:C.gold}}>9, 10 ou 11</span> uniquement</div>
            <div>🎴 Dealer tire jusqu'à 17 minimum</div>
            <div>🎲 6 decks · Soft 17 = dealer tire encore</div>
          </div>
        </div>
      </div>

      {/* Live */}
      <div style={{marginTop:12}}><LiveFeed/></div>
    </div>
  )
}
