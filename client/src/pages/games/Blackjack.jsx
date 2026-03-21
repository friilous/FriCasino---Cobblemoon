import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C = { bg:'#06060f', surf:'#0c0c1e', felt:'#071a0c', feltB:'#0d3018', border:'#1e1e3a', gold:'#f0b429', green:'#22c55e', red:'#ef4444', txt:'#e2e2f0', muted:'#44446a', dim:'#12121f' }
const SPRITE=dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const SUIT_COLORS={'♠':'#d0d0f0','♣':'#d0d0f0','♥':'#f07070','♦':'#f07070'}
const STATUS={
  blackjack: {label:'🏆 BLACKJACK !',   color:'#f0c040'},
  win:       {label:'✅ Gagné !',        color:'#22c55e'},
  push:      {label:'🤝 Égalité',       color:'#8888cc'},
  bust:      {label:'💥 Dépassement !', color:'#ef4444'},
  lose:      {label:'❌ Perdu',         color:'#ef4444'},
  dealer_blackjack:{label:'😈 Blackjack dealer',color:'#ef4444'},
}

function Card({card,hidden=false,size=1}){
  const W=72*size,H=100*size
  if(hidden)return(
    <div style={{width:W,height:H,borderRadius:9,flexShrink:0,background:'linear-gradient(135deg,#1a1a3a 25%,#2a2a5a 50%,#1a1a3a 75%)',border:'1px solid #3a3a6a',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,0,0,.6)'}}>
      <span style={{fontSize:24*size}}>🎴</span>
    </div>
  )
  const col=SUIT_COLORS[card.suit]||'#d0d0f0'
  return(
    <div style={{width:W,height:H,borderRadius:9,background:'#11112a',border:'1px solid #28284a',display:'flex',flexDirection:'column',padding:`${5*size}px ${6*size}px`,flexShrink:0,boxShadow:'0 4px 14px rgba(0,0,0,.6)'}}>
      <div style={{lineHeight:1.1}}>
        <div style={{fontSize:13*size,fontWeight:800,color:col}}>{card.value}</div>
        <div style={{fontSize:11*size,color:col}}>{card.suit}</div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <img src={SPRITE(card.dex)} alt={card.name} style={{width:40*size,height:40*size,imageRendering:'pixelated',objectFit:'contain'}}/>
      </div>
      <div style={{lineHeight:1.1,transform:'rotate(180deg)',alignSelf:'flex-end'}}>
        <div style={{fontSize:13*size,fontWeight:800,color:col}}>{card.value}</div>
        <div style={{fontSize:11*size,color:col}}>{card.suit}</div>
      </div>
    </div>
  )
}

function Score({v}){
  if(!v)return null
  return(
    <div style={{fontSize:15,fontWeight:800,padding:'3px 14px',borderRadius:20,background:C.surf,border:`1px solid ${v>21?C.red:v===21?C.gold:C.border}`,color:v>21?C.red:v===21?C.gold:C.txt,boxShadow:v===21?`0 0 10px ${C.gold}40`:'none'}}>
      {v>21?`${v} 💥`:v===21?'21 ✨':v}
    </div>
  )
}

export default function Blackjack(){
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100),[phase,setPhase]=useState('idle')
  const [game,setGame]=useState(null),[loading,setLoading]=useState(false)
  const [err,setErr]=useState(''),[history,setHistory]=useState([])

  async function act(action,betAmt){
    setLoading(true);setErr('')
    try{
      const{data}=await axios.post('/api/games/blackjack',action==='deal'?{action,bet:betAmt}:{action})
      setGame(data);updateBalance(data.balance)
      if(data.done){setPhase('done');setHistory(p=>[{status:data.status,bet:action==='deal'?betAmt:game?.bet,payout:data.payout,doubled:data.doubled||false},...p].slice(0,5))}
      else setPhase('playing')
    }catch(e){setErr(e.response?.data?.error||'Erreur réseau')}
    finally{setLoading(false)}
  }

  const canDouble=game?.canDouble&&phase==='playing'&&(user?.balance||0)>=(game?.bet||0)
  const info=game?.status?STATUS[game.status]:null
  const playing=phase==='playing',done=phase==='done'

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'16px',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>🃏 Blackjack</span>
      </div>

      <div style={{display:'flex',gap:12,alignItems:'start'}}>

        {/* Table */}
        <div style={{order:1,flex:1,background:C.surf,border:`1px solid ${C.border}`,borderRadius:18,padding:20,minHeight:480,display:'flex',flexDirection:'column',gap:0}}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:22,fontWeight:900,color:C.gold,letterSpacing:4}}>BLACKJACK</div>
          </div>
          <div style={{background:C.felt,border:`1px solid ${C.feltB}`,borderRadius:14,padding:24,flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',gap:16}}>
            {/* Dealer */}
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <span style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>🎩 Dealer</span>
                <Score v={done?game?.dealerValue:(game?.dealer?.[0]?game.dealerValue:0)}/>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',minHeight:100}}>
                {(game?.dealer||[]).map((c,i)=><Card key={i} card={c} hidden={c.hidden} size={1.1}/>)}
              </div>
            </div>
            {/* Séparateur */}
            <div style={{position:'relative',borderTop:`1px dashed ${C.feltB}`,margin:'0 20px'}}>
              <span style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:C.felt,padding:'0 14px',fontSize:16}}>🎯</span>
            </div>
            {/* Joueur */}
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <span style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>👤 {user?.username||'Toi'}</span>
                <Score v={game?.playerValue||0}/>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',minHeight:100}}>
                {(game?.player||[]).map((c,i)=><Card key={i} card={c} size={1.1}/>)}
              </div>
            </div>
          </div>

          {/* Résultat */}
          {done&&info&&(
            <div style={{marginTop:12,padding:'12px 18px',background:`${info.color}10`,border:`1px solid ${info.color}30`,borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:info.color}}>{info.label}{game?.doubled&&<span style={{fontSize:10,color:C.gold,marginLeft:8}}>× Double</span>}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{game?.playerValue} vs {game?.dealerValue}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:24,fontWeight:900,color:info.color}}>{game?.payout>0?`+${(game.payout-(game.bet||bet)).toLocaleString()}`:`−${(game.bet||bet).toLocaleString()}`}</div>
                <div style={{fontSize:11,color:C.muted}}>jetons</div>
              </div>
            </div>
          )}

          {phase==='idle'&&<div style={{textAlign:'center',padding:'12px 0',fontSize:12,color:C.muted,marginTop:8}}>Place ta mise et distribue !</div>}

          {/* Pills historique */}
          {history.length>0&&(
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>
              {history.map((h,i)=>{
                const inf=STATUS[h.status],net=h.payout-(h.bet||0)
                return<div key={i} style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:net>0?`${C.green}12`:`${C.red}10`,border:`1px solid ${net>0?C.green+'30':C.red+'25'}`,color:net>0?C.green:C.red}}>
                  {inf?.label} {net>0?`+${net.toLocaleString()}`:net.toLocaleString()}
                </div>
              })}
            </div>
          )}
        </div>

        {/* Panneau droite */}
        <div style={{width:280,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
          {/* Contrôles */}
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
            {!playing?(
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading}/>
                {err&&<div style={{marginTop:8,fontSize:11,color:C.red,background:`${C.red}10`,border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px'}}>⚠ {err}</div>}
                <button onClick={()=>act('deal',bet)} disabled={loading||bet<10||bet>(user?.balance||0)}
                  style={{width:'100%',marginTop:12,padding:'14px',background:loading?C.dim:C.gold,color:loading?C.muted:'#06060f',fontWeight:800,fontSize:16,borderRadius:10,border:'none',cursor:loading?'not-allowed':'pointer',opacity:loading||bet>(user?.balance||0)?.5:1,boxShadow:`0 0 20px ${C.gold}44`,transition:'all .15s'}}>
                  {loading?'Distribution…':done?'🔄 Nouvelle partie':'🃏 Distribuer'}
                </button>
              </>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{textAlign:'center',padding:'6px 0',fontSize:12,color:C.muted}}>Mise : <span style={{color:C.gold,fontWeight:700}}>{(game?.bet||bet).toLocaleString()} jetons</span></div>
                <button onClick={()=>act('hit')} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'#0e1e3a',color:'#7eb4f8',fontWeight:800,fontSize:14,borderRadius:10,border:'1px solid #1e3a6a',cursor:loading?'not-allowed':'pointer',opacity:loading?.5:1}}>
                  🃏 Tirer une carte
                </button>
                <button onClick={()=>act('stand')} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'#2a0808',color:'#f87171',fontWeight:800,fontSize:14,borderRadius:10,border:'1px solid #601010',cursor:loading?'not-allowed':'pointer',opacity:loading?.5:1}}>
                  ✋ Rester
                </button>
                {canDouble&&(
                  <button onClick={()=>act('double')} disabled={loading}
                    style={{width:'100%',padding:'11px',background:`${C.gold}12`,border:`1px solid ${C.gold}40`,color:C.gold,fontWeight:700,fontSize:13,borderRadius:10,cursor:'pointer'}}>
                    💰 Double Down (+{(game?.bet||bet).toLocaleString()})
                  </button>
                )}
                {err&&<div style={{fontSize:11,color:C.red,background:`${C.red}10`,border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px'}}>⚠ {err}</div>}
                <div style={{textAlign:'center',fontSize:11,color:C.muted}}>
                  Ta main : <span style={{color:(game?.playerValue||0)>21?C.red:(game?.playerValue||0)===21?C.gold:C.txt,fontWeight:700}}>{game?.playerValue||0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Règles */}
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Règles</div>
            {[
              ['🏆 Blackjack naturel','×2.2',C.gold],
              ['✅ Victoire','×1.9',C.green],
              ['🤝 Égalité','×1.0','#8888cc'],
              ['💥 Dépasser 21','×0',C.red],
              ['💰 Double Down','mise ×2',C.gold],
            ].map(([l,v,col])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${C.dim}`}}>
                <span style={{fontSize:11,color:C.muted}}>{l}</span>
                <span style={{fontSize:13,fontWeight:800,color:col,fontFamily:'monospace'}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:10,fontSize:10,color:C.muted,lineHeight:1.9,paddingTop:6}}>
              <div>📌 Double Down : sur total 9, 10 ou 11</div>
              <div>🎴 Dealer tire jusqu'à 17 minimum</div>
              <div>🎲 6 decks mélangés · Soft 17 = tire</div>
            </div>
          </div>
        </div>
      </div>

      <LiveFeed/>
    </div>
  )
}
