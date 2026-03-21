import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C = {
  bg:'#06060f', surf1:'#0c0c1e', border:'#1e1e3a',
  gold:'#f0b429', green:'#22c55e', red:'#ef4444',
  txt:'#e2e2f0', muted:'#44446a', dim:'#1a1a2e',
}

const SYMBOLS = {
  mew:        { label:'Mew',         color:'#f0b429', rarity:'Wild',       isWild:true,  sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png' },
  masterball: { label:'Master Ball', color:'#a855f7', rarity:'Légendaire', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png' },
  dragon:     { label:'Dragon',      color:'#7c3aed', rarity:'Ultra Rare', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png' },
  dark:       { label:'Ténèbres',    color:'#9ca3af', rarity:'Rare',       isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/197.png' },
  psychic:    { label:'Psy',         color:'#ec4899', rarity:'Rare',       isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png' },
  electric:   { label:'Électrik',    color:'#eab308', rarity:'Peu commun', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
  fire:       { label:'Feu',         color:'#f97316', rarity:'Peu commun', isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png' },
  water:      { label:'Eau',         color:'#3b82f6', rarity:'Commun',     isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png' },
  grass:      { label:'Plante',      color:'#22c55e', rarity:'Commun',     isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png' },
  magikarp:   { label:'Magicarpe',   color:'#f87171', rarity:'Commun',     isWild:false, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png' },
}
const PAYOUTS_TABLE = [
  { id:'mew',        p3:'WILD',   p2:'WILD'  },
  { id:'masterball', p3:'×261.5', p2:'×26'   },
  { id:'dragon',     p3:'×104.5', p2:'×10.5' },
  { id:'dark',       p3:'×52.5',  p2:'×6.5'  },
  { id:'psychic',    p3:'×26',    p2:'×4'    },
  { id:'electric',   p3:'×14',    p2:'×2.5'  },
  { id:'fire',       p3:'×6',     p2:'×2'    },
  { id:'water',      p3:'×6',     p2:'×2'    },
  { id:'grass',      p3:'×6',     p2:'×2'    },
  { id:'magikarp',   p3:'×0.5',   p2:'—'     },
]

const SYMBOL_IDS = Object.keys(SYMBOLS)
const SLOT_H = 96, STRIP_LEN = 30
const WEIGHTS = { mew:2,masterball:3,dragon:5,dark:8,psychic:10,electric:14,fire:18,water:18,grass:22,magikarp:28 }
const TOTAL_W = Object.values(WEIGHTS).reduce((a,b)=>a+b,0)
function symById(id) { return SYMBOLS[id]??SYMBOLS.magikarp }
function randSymId() { let r=Math.random()*TOTAL_W; for(const id of SYMBOL_IDS){r-=WEIGHTS[id];if(r<=0)return id} return 'magikarp' }
function makeStrip(f) { const s=Array.from({length:STRIP_LEN},randSymId); s[STRIP_LEN-3]=f[0];s[STRIP_LEN-2]=f[1];s[STRIP_LEN-1]=f[2]; return s }

function Reel({ reelIndex, spinTrigger, stopDelay, onStopped, isWin, getPendingSyms }) {
  const endPx=-(STRIP_LEN-3)*SLOT_H
  const [strip,setStrip]=useState(()=>makeStrip([randSymId(),randSymId(),randSymId()]))
  const [settled,setSettled]=useState(true)
  const [flash,setFlash]=useState(false)
  const bandRef=useRef(null),rafRef=useRef(null),stopRef=useRef(null)
  const applyPos=px=>{if(bandRef.current)bandRef.current.style.transform=`translateY(${px}px)`}
  useEffect(()=>{
    if(!spinTrigger)return
    cancelAnimationFrame(rafRef.current);clearTimeout(stopRef.current)
    setSettled(false);setFlash(false)
    const f=getPendingSyms(reelIndex)
    applyPos(0);setStrip(makeStrip(f))
    const total=stopDelay+550,t0=performance.now()
    const go=now=>{
      const p=Math.min((now-t0)/total,1),e=1-Math.pow(1-p,3)
      applyPos(e*endPx)
      p<1?rafRef.current=requestAnimationFrame(go):(applyPos(endPx),stopRef.current=setTimeout(()=>{setSettled(true);setFlash(true);setTimeout(()=>setFlash(false),600);onStopped?.()},20))
    }
    rafRef.current=requestAnimationFrame(()=>{applyPos(0);rafRef.current=requestAnimationFrame(go)})
    return()=>{cancelAnimationFrame(rafRef.current);clearTimeout(stopRef.current)}
  },[spinTrigger])
  const midWins=settled&&isWin
  const I_TOP=STRIP_LEN-3,I_MID=STRIP_LEN-2,I_BOT=STRIP_LEN-1
  return(
    <div style={{width:100,height:SLOT_H*3,background:'#080814',borderRadius:12,
      border:`2px solid ${midWins?C.gold:flash?'#fff3':C.border}`,
      boxShadow:midWins?`0 0 24px ${C.gold}40`:'none',overflow:'hidden',position:'relative',transition:'border-color .3s,box-shadow .4s'}}>
      <div style={{position:'absolute',inset:0,zIndex:2,pointerEvents:'none',background:'linear-gradient(to bottom,#08081490 0%,transparent 22%,transparent 78%,#08081490 100%)'}}/>
      <div style={{position:'absolute',left:0,right:0,top:SLOT_H,height:SLOT_H,zIndex:1,
        borderTop:`1px solid ${midWins?C.gold+'80':C.gold+'20'}`,borderBottom:`1px solid ${midWins?C.gold+'80':C.gold+'20'}`,
        background:midWins?C.gold+'10':'transparent',transition:'all .4s',pointerEvents:'none'}}/>
      <div ref={bandRef} style={{position:'absolute',top:0,left:0,right:0,height:STRIP_LEN*SLOT_H,transform:`translateY(${endPx}px)`,zIndex:3,willChange:'transform'}}>
        {strip.map((id,i)=>{
          const sym=symById(id),isMid=i===I_MID,isVis=i===I_TOP||i===I_MID||i===I_BOT
          const winSlot=settled&&isWin&&isMid
          return(
            <div key={i} style={{height:SLOT_H,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative'}}>
              <img src={sym.sprite} alt={sym.label} draggable={false} style={{
                width:settled&&isMid?68:settled&&isVis?46:54,height:settled&&isMid?68:settled&&isVis?46:54,
                imageRendering:'pixelated',objectFit:'contain',opacity:settled&&isVis&&!isMid?.35:1,
                filter:winSlot?`drop-shadow(0 0 12px ${sym.color}) brightness(1.3)`:settled&&isMid?sym.isWild?`drop-shadow(0 0 8px ${sym.color})`:'brightness(1.05)':'brightness(.8)',
                transition:settled?'filter .3s,opacity .2s,width .15s,height .15s':'none',userSelect:'none'}}/>
              {settled&&isMid&&<div style={{position:'absolute',bottom:3,fontSize:7,fontWeight:700,color:winSlot?sym.color:C.muted,textTransform:'uppercase',letterSpacing:.5}}>{sym.isWild?'✦ WILD ✦':sym.label}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Slots() {
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100),[spinning,setSpinning]=useState(false),[spinTrigger,setSpinTrigger]=useState(0)
  const [result,setResult]=useState(null),[error,setError]=useState('')
  const [stoppedCount,setStoppedCount]=useState(0),[reelStopped,setReelStopped]=useState([false,false,false])
  const [history,setHistory]=useState([])
  const pendingResult=useRef(null)

  useEffect(()=>{
    if(stoppedCount===3&&pendingResult.current){
      const r=pendingResult.current;updateBalance(r.balance);setResult(r);setSpinning(false)
      if(r.isWin)setHistory(p=>[{id:Date.now(),payout:r.payout,mult:r.multiplier},...p].slice(0,6))
    }
  },[stoppedCount])

  const getPendingSyms=useCallback(ri=>{
    const d=pendingResult.current
    if(!d?.reels?.[ri])return[randSymId(),randSymId(),randSymId()]
    return[d.reels[ri][0].id,d.reels[ri][1].id,d.reels[ri][2].id]
  },[])

  const handleSpin=useCallback(async()=>{
    if(spinning||!user||bet<10||bet>user.balance)return
    setSpinning(true);setResult(null);setError('');setStoppedCount(0);setReelStopped([false,false,false]);pendingResult.current=null
    try{
      const{data}=await axios.post('/api/games/slots',{bet})
      if(!data.reels||!data.line)throw new Error('Réponse invalide')
      pendingResult.current=data;setSpinTrigger(t=>t+1)
    }catch(err){setError(err.response?.data?.error||err.message||'Erreur réseau');setSpinning(false)}
  },[spinning,user,bet])

  const handleReelStopped=i=>{setReelStopped(p=>{const n=[...p];n[i]=true;return n});setStoppedCount(c=>c+1)}
  const isWin=result?.isWin===true,isJackpot=isWin&&(result?.multiplier??0)>=100
  const winSym=isWin&&result?.winSymId?symById(result.winSymId):null
  const winDesc=()=>{if(!result?.winType)return'';if(result.winType==='3x')return'3 identiques';if(result.hasWild)return'Wild + paire';return'2 identiques'}

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'14px',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>🎰 Slot Machine</span>
      </div>

      {/* 3 colonnes */}
      <div style={{display:'grid',gridTemplateColumns:'220px 1fr 220px',gap:12,alignItems:'start'}}>

        {/* COL 1 — Mise + bouton + résultat */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <BetInput bet={bet} setBet={setBet} disabled={spinning}/>
            <button onClick={handleSpin} disabled={spinning||bet<10||bet>(user?.balance??0)}
              style={{width:'100%',marginTop:12,padding:'14px',background:spinning?C.dim:C.gold,
                color:spinning?C.muted:'#06060f',fontWeight:800,fontSize:15,borderRadius:10,border:'none',
                cursor:spinning?'not-allowed':'pointer',opacity:bet>(user?.balance??0)?.5:1,
                transition:'all .15s',boxShadow:spinning?'none':`0 0 20px ${C.gold}44`}}>
              {spinning?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{display:'inline-block',animation:'spin .7s linear infinite'}}>⚙️</span>En cours...</span>:'🎰  SPIN !'}
            </button>
          </div>

          {result&&!spinning&&(
            <div style={{background:isWin?`${C.green}10`:`${C.red}08`,border:`1px solid ${isWin?C.green+'30':C.red+'20'}`,borderRadius:12,padding:14,textAlign:'center'}}>
              {isJackpot&&<div style={{color:C.gold,fontWeight:900,fontSize:12,marginBottom:6,letterSpacing:2}}>🏆 JACKPOT !</div>}
              {isWin?(
                <>
                  {winSym&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,justifyContent:'center'}}>
                    <img src={winSym.sprite} alt={winSym.label} style={{width:32,height:32,imageRendering:'pixelated',filter:`drop-shadow(0 0 8px ${winSym.color})`}}/>
                    <div style={{textAlign:'left'}}>
                      <div style={{color:winSym.color,fontWeight:800,fontSize:12}}>{winSym.label}{result.hasWild&&<span style={{color:C.gold,marginLeft:4,fontSize:10}}>✨Wild</span>}</div>
                      <div style={{color:C.muted,fontSize:10}}>{winDesc()}</div>
                    </div>
                  </div>}
                  <div style={{fontSize:22,fontWeight:900,color:isJackpot?C.gold:C.green}}>+{result.payout.toLocaleString()}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>jetons · <span style={{color:C.txt}}>×{result.multiplier}</span></div>
                </>
              ):(
                <><div style={{color:C.muted,fontSize:12}}>Pas de chance...</div><div style={{color:C.red,fontSize:18,fontWeight:800,marginTop:4}}>−{bet.toLocaleString()}</div></>
              )}
            </div>
          )}
          {history.length>0&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {history.map(h=><div key={h.id} style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,background:`${C.green}12`,border:`1px solid ${C.green}30`,color:C.green}}>+{h.payout.toLocaleString()} <span style={{opacity:.5}}>×{h.mult}</span></div>)}
            </div>
          )}
          {error&&<div style={{background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}
        </div>

        {/* COL 2 — Machine */}
        <div style={{background:C.surf1,border:`2px solid ${isJackpot?C.gold:isWin?C.gold+'50':C.border}`,
          borderRadius:16,padding:20,transition:'border-color .5s,box-shadow .5s',
          boxShadow:isJackpot?`0 0 40px ${C.gold}30`:isWin?`0 0 20px ${C.gold}15`:'none'}}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,letterSpacing:3}}>SLOT MACHINE</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Ligne centrale · Mew = Wild</div>
          </div>
          {isJackpot&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'8px 16px',background:`${C.gold}12`,border:`1px solid ${C.gold}40`,borderRadius:10,marginBottom:14}}><span style={{color:C.gold,fontWeight:900,fontSize:14,letterSpacing:3}}>🏆 JACKPOT 🏆</span></div>}
          <div style={{background:'#080814',borderRadius:16,border:`1px solid ${C.border}`,padding:'20px 12px 16px',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,borderRadius:'16px 16px 0 0',
              background:isJackpot?`linear-gradient(90deg,transparent,${C.gold},transparent)`:isWin?`linear-gradient(90deg,transparent,${C.gold}60,transparent)`:`linear-gradient(90deg,transparent,${C.border},transparent)`,transition:'background .5s'}}/>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              {[0,1,2].map(i=><Reel key={i} reelIndex={i} spinTrigger={spinTrigger} stopDelay={900+i*650} onStopped={()=>handleReelStopped(i)} isWin={isWin} getPendingSyms={getPendingSyms}/>)}
            </div>
            {spinning&&<div style={{display:'flex',justifyContent:'center',gap:10,marginTop:12}}>
              {[0,1,2].map(i=><div key={i} style={{width:100,height:2,borderRadius:1,background:reelStopped[i]?C.gold:C.dim,boxShadow:reelStopped[i]?`0 0 6px ${C.gold}`:'none',transition:'all .3s'}}/>)}
            </div>}
          </div>
        </div>

        {/* COL 3 — Règles */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📋 Table des gains</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 44px 44px',gap:'3px 6px',alignItems:'center'}}>
            <div style={{fontSize:9,color:C.muted,paddingBottom:3}}>Symbole</div>
            <div style={{fontSize:9,color:C.muted,textAlign:'center',paddingBottom:3}}>3×</div>
            <div style={{fontSize:9,color:C.muted,textAlign:'center',paddingBottom:3}}>2×</div>
            {PAYOUTS_TABLE.map(p=>{
              const sym=SYMBOLS[p.id],active=isWin&&result?.winSymId===p.id
              return[
                <div key={p.id+'n'} style={{display:'flex',alignItems:'center',gap:5,padding:'2px 0',borderRadius:4,paddingLeft:active?4:0,background:active?sym.color+'12':'transparent',transition:'all .3s'}}>
                  <img src={sym.sprite} alt={sym.label} style={{width:20,height:20,imageRendering:'pixelated'}}/>
                  <span style={{fontSize:10,color:active?sym.color:C.txt,fontWeight:active?700:400}}>{sym.label}</span>
                </div>,
                <div key={p.id+'3'} style={{fontSize:10,color:sym.color,fontWeight:700,textAlign:'center'}}>{p.p3}</div>,
                <div key={p.id+'2'} style={{fontSize:10,color:C.muted,textAlign:'center'}}>{p.p2}</div>,
              ]
            })}
          </div>
          <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.border}`,fontSize:10,color:C.muted,lineHeight:1.8}}>
            <div>✨ <span style={{color:C.gold}}>Mew</span> = Wild (remplace tout)</div>
            <div>💡 2× = paire n'importe où sur la ligne</div>
            <div>🐟 Magicarpe = ×0.5 en 3× seulement</div>
          </div>
        </div>
      </div>

      {/* Live feed — pleine largeur en bas */}
      <div style={{marginTop:12}}>
        <LiveFeed/>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
