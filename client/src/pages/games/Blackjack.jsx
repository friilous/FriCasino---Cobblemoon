import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C = {
  bg:'#06060f', surf1:'#0c0c1e', surf2:'#111128', felt:'#0a1f0f', feltBorder:'#0f3020',
  border:'#1e1e3a', gold:'#f0b429', green:'#22c55e', red:'#ef4444',
  txt:'#e2e2f0', muted:'#44446a', dim:'#1a1a2e',
}

const SPRITE = dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const SUIT_COLORS = { '♠':'#c8c8e8', '♣':'#c8c8e8', '♥':'#f06060', '♦':'#f06060' }

const STATUS_INFO = {
  blackjack:        { label:'🏆 BLACKJACK !',     color:'#f0c040', bg:'rgba(240,192,64,0.08)'  },
  win:              { label:'✅ Gagné !',           color:'#22c55e', bg:'rgba(34,197,94,0.08)'  },
  push:             { label:'🤝 Égalité',          color:'#8888cc', bg:'rgba(136,136,204,0.08)' },
  bust:             { label:'💥 Dépassement !',    color:'#ef4444', bg:'rgba(239,68,68,0.08)'   },
  lose:             { label:'❌ Perdu',            color:'#ef4444', bg:'rgba(239,68,68,0.08)'   },
  dealer_blackjack: { label:'😈 Blackjack dealer', color:'#ef4444', bg:'rgba(239,68,68,0.08)'  },
}

// Carte grande et lisible
function Card({ card, hidden=false }) {
  const W=88, H=120
  if (hidden) return (
    <div style={{width:W,height:H,borderRadius:10,flexShrink:0,
      background:'linear-gradient(135deg,#1a1a3a 25%,#2a2a5a 50%,#1a1a3a 75%)',
      border:'1px solid #3a3a6a',display:'flex',alignItems:'center',justifyContent:'center',
      boxShadow:'0 4px 12px rgba(0,0,0,0.5)'}}>
      <span style={{fontSize:32}}>🎴</span>
    </div>
  )
  const color=SUIT_COLORS[card.suit]||'#c8c8e8'
  return (
    <div style={{width:W,height:H,borderRadius:10,background:'#12122a',
      border:'1px solid #2a2a4a',display:'flex',flexDirection:'column',
      padding:'6px 7px',flexShrink:0,position:'relative',
      boxShadow:'0 4px 14px rgba(0,0,0,0.5)'}}>
      <div style={{lineHeight:1.1}}>
        <div style={{fontSize:15,fontWeight:800,color}}>{card.value}</div>
        <div style={{fontSize:13,color}}>{card.suit}</div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <img src={SPRITE(card.dex)} alt={card.name} title={card.name}
          style={{width:46,height:46,imageRendering:'pixelated',objectFit:'contain'}}/>
      </div>
      <div style={{lineHeight:1.1,transform:'rotate(180deg)',alignSelf:'flex-end'}}>
        <div style={{fontSize:15,fontWeight:800,color}}>{card.value}</div>
        <div style={{fontSize:13,color}}>{card.suit}</div>
      </div>
    </div>
  )
}

function ScoreChip({ value }) {
  if (!value) return null
  const over = value > 21
  const bj   = value === 21
  return (
    <div style={{fontSize:14,fontWeight:800,padding:'3px 12px',borderRadius:20,
      background:C.surf1,border:`1px solid ${over?C.red:bj?C.gold:C.border}`,
      color:over?C.red:bj?C.gold:C.txt,boxShadow:bj?`0 0 10px ${C.gold}40`:'none'}}>
      {over?`${value} 💥`:bj?'21 ✨':value}
    </div>
  )
}

function Hand({ cards=[], value, label }) {
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <span style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>{label}</span>
        <ScoreChip value={value>0?value:null}/>
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',minHeight:120}}>
        {cards.map((card,i)=><Card key={i} card={card} hidden={card.hidden}/>)}
      </div>
    </div>
  )
}

export default function Blackjack() {
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100)
  const [phase,setPhase]=useState('idle')
  const [game,setGame]=useState(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [history,setHistory]=useState([])

  async function sendAction(action,betAmount) {
    setLoading(true);setError('')
    try {
      const payload=action==='deal'?{action,bet:betAmount}:{action}
      const{data}=await axios.post('/api/games/blackjack',payload)
      setGame(data);updateBalance(data.balance)
      if(data.done){
        setPhase('done')
        setHistory(p=>[{status:data.status,bet:action==='deal'?betAmount:game?.bet,payout:data.payout,multiplier:data.multiplier,doubled:data.doubled||false},...p].slice(0,8))
      } else setPhase('playing')
    } catch(err){setError(err.response?.data?.error||'Erreur réseau')}
    finally{setLoading(false)}
  }

  const canDouble=game?.canDouble&&phase==='playing'&&(user?.balance||0)>=(game?.bet||0)
  const statusInfo=game?.status?STATUS_INFO[game.status]:null
  const isPlaying=phase==='playing'
  const isDone=phase==='done'

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'14px',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>🃏 Blackjack</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:12,alignItems:'start'}}>

        {/* Panneau gauche */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            {!isPlaying?(
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading}/>
                <button onClick={()=>sendAction('deal',bet)} disabled={loading||bet<10||bet>(user?.balance||0)}
                  style={{width:'100%',marginTop:12,padding:'13px',
                    background:loading?C.dim:C.gold,color:loading?C.muted:'#06060f',
                    fontWeight:800,fontSize:15,borderRadius:10,border:'none',
                    cursor:loading?'not-allowed':'pointer',
                    opacity:loading||bet>(user?.balance||0)?.5:1,
                    boxShadow:`0 0 20px ${C.gold}44`,transition:'all .15s'}}>
                  {loading?'Distribution...':(isDone?'🔄 Nouvelle partie':'🃏 Distribuer')}
                </button>
              </>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{textAlign:'center',fontSize:12,color:C.muted,padding:'4px 0'}}>
                  Mise : <span style={{color:C.gold,fontWeight:700}}>{(game?.bet||bet).toLocaleString()} jetons</span>
                </div>
                <button onClick={()=>sendAction('hit')} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'#1e4080',color:'#7eb4f8',
                    fontWeight:800,fontSize:14,borderRadius:10,border:'1px solid #3060c0',
                    cursor:loading?'not-allowed':'pointer',opacity:loading?.5:1,
                    boxShadow:'0 0 14px rgba(64,128,240,0.25)'}}>
                  🃏 Tirer une carte
                </button>
                <button onClick={()=>sendAction('stand')} disabled={loading}
                  style={{width:'100%',padding:'13px',background:'#3a0808',color:'#f87171',
                    fontWeight:800,fontSize:14,borderRadius:10,border:'1px solid #8b1a1a',
                    cursor:loading?'not-allowed':'pointer',opacity:loading?.5:1,
                    boxShadow:'0 0 14px rgba(239,68,68,0.2)'}}>
                  ✋ Rester
                </button>
                {canDouble&&(
                  <button onClick={()=>sendAction('double')} disabled={loading}
                    style={{width:'100%',padding:'11px',background:`${C.gold}18`,
                      border:`1px solid ${C.gold}40`,color:C.gold,
                      fontWeight:700,fontSize:13,borderRadius:10,cursor:'pointer'}}>
                    💰 Double Down (+{(game?.bet||bet).toLocaleString()})
                  </button>
                )}
                <div style={{textAlign:'center',fontSize:11,color:C.muted,marginTop:2}}>
                  Ta main : <span style={{color:(game?.playerValue||0)>21?C.red:(game?.playerValue||0)===21?C.gold:C.txt,fontWeight:700}}>
                    {game?.playerValue||0}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Résultat */}
          {isDone&&statusInfo&&(
            <div style={{background:statusInfo.bg,border:`1px solid ${statusInfo.color}30`,borderRadius:12,padding:14}}>
              <div style={{fontSize:15,fontWeight:800,color:statusInfo.color,marginBottom:4}}>
                {statusInfo.label}
                {game?.doubled&&<span style={{fontSize:10,color:C.gold,marginLeft:6}}>× Double Down</span>}
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{game?.playerValue} vs {game?.dealerValue}</div>
              <div style={{fontSize:24,fontWeight:900,color:statusInfo.color}}>
                {game?.payout>0?`+${(game.payout-(game.bet||bet)).toLocaleString()}`:`−${(game.bet||bet).toLocaleString()}`}
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>jetons</div>
            </div>
          )}

          {error&&<div style={{background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}

          {/* Règles */}
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📋 Règles</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'6px 12px',fontSize:12,alignItems:'center'}}>
              {[
                ['🏆 Blackjack naturel',<span style={{color:C.gold,fontWeight:800}}>×2.2</span>],
                ['✅ Victoire normale', <span style={{color:C.green,fontWeight:800}}>×1.9</span>],
                ['🤝 Égalité',         <span style={{color:'#8888cc',fontWeight:800}}>×1.0</span>],
                ['💥 Dépassement',     <span style={{color:C.red,fontWeight:800}}>×0</span>],
                ['💰 Double Down',     <span style={{color:C.gold,fontWeight:700}}>mise ×2</span>],
              ].map(([l,v])=>[
                <div key={l+'l'} style={{color:C.muted}}>{l}</div>,
                <div key={l+'v'} style={{textAlign:'right'}}>{v}</div>
              ])}
            </div>
            <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.border}`,fontSize:10,color:C.muted,lineHeight:1.8}}>
              <div>🃏 Double Down : uniquement sur total 9, 10 ou 11</div>
              <div>🎴 Dealer tire obligatoirement jusqu'à 17+</div>
              <div>🎲 6 decks mélangés · Soft 17 = dealer tire</div>
            </div>
          </div>

          {/* Historique */}
          {history.length>0&&(
            <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
              <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Dernières parties</div>
              {history.map((h,i)=>{
                const info=STATUS_INFO[h.status]
                const net=h.payout-(h.bet||0)
                return(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'5px 0',borderBottom:i<history.length-1?`1px solid ${C.dim}`:'none',fontSize:11}}>
                    <div style={{color:info?.color,fontSize:11}}>{info?.label}</div>
                    <div style={{fontWeight:700,color:net>0?C.green:C.red}}>
                      {net>0?`+${net.toLocaleString()}`:net.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <LiveFeed compact/>
        </div>

        {/* Table */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,padding:20,minHeight:480,
          display:'flex',flexDirection:'column'}}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,letterSpacing:3}}>BLACKJACK</div>
          </div>
          <div style={{background:C.felt,border:`1px solid ${C.feltBorder}`,borderRadius:14,padding:24,
            flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',gap:20}}>

            {/* Dealer */}
            <div>
              <Hand
                cards={game?.dealer||[]}
                value={isDone?game?.dealerValue:(game?.dealer?.[0]?game.dealerValue:0)}
                label="🎩 Dealer"/>
            </div>

            <div style={{textAlign:'center',position:'relative',borderTop:`1px dashed ${C.feltBorder}`}}>
              <span style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',
                background:C.felt,padding:'0 12px',fontSize:18}}>🎯</span>
            </div>

            {/* Joueur */}
            <div>
              <Hand
                cards={game?.player||[]}
                value={game?.playerValue||0}
                label={`👤 ${user?.username||'Toi'}`}/>
            </div>
          </div>

          {phase==='idle'&&(
            <div style={{textAlign:'center',padding:'16px 0',fontSize:12,color:C.muted}}>
              Place ta mise à gauche et lance la partie !
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
