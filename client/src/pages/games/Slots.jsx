import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}

const SYMBOLS={
  mew:        {label:'Mew',         color:'#f0b429',isWild:true, sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png'},
  masterball: {label:'Master Ball', color:'#a855f7',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png'},
  dragon:     {label:'Dragon',      color:'#7c3aed',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png'},
  dark:       {label:'Ténèbres',    color:'#9ca3af',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/197.png'},
  psychic:    {label:'Psy',         color:'#ec4899',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png'},
  electric:   {label:'Électrik',    color:'#eab308',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'},
  fire:       {label:'Feu',         color:'#f97316',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png'},
  water:      {label:'Eau',         color:'#3b82f6',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png'},
  grass:      {label:'Plante',      color:'#22c55e',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png'},
  magikarp:   {label:'Magicarpe',   color:'#f87171',isWild:false,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png'},
}
const RULES=[
  {id:'mew',        p3:'WILD',   p2:'WILD'  },
  {id:'masterball', p3:'×261.5', p2:'×26'   },
  {id:'dragon',     p3:'×104.5', p2:'×10.5' },
  {id:'dark',       p3:'×52.5',  p2:'×6.5'  },
  {id:'psychic',    p3:'×26',    p2:'×4'    },
  {id:'electric',   p3:'×14',    p2:'×2.5'  },
  {id:'fire',       p3:'×6',     p2:'×2'    },
  {id:'water',      p3:'×6',     p2:'×2'    },
  {id:'grass',      p3:'×6',     p2:'×2'    },
  {id:'magikarp',   p3:'×0.5',   p2:'—'     },
]
const SYM_IDS=Object.keys(SYMBOLS)
const SLOT_H=96,STRIP=30
const W={mew:2,masterball:3,dragon:5,dark:8,psychic:10,electric:14,fire:18,water:18,grass:22,magikarp:28}
const TW=Object.values(W).reduce((a,b)=>a+b,0)
function sym(id){return SYMBOLS[id]??SYMBOLS.magikarp}
function rnd(){let r=Math.random()*TW;for(const id of SYM_IDS){r-=W[id];if(r<=0)return id}return'magikarp'}
function strip(f){const s=Array.from({length:STRIP},rnd);s[STRIP-3]=f[0];s[STRIP-2]=f[1];s[STRIP-1]=f[2];return s}

function Reel({idx,trigger,delay,onStop,win,getSyms}){
  const endY=-(STRIP-3)*SLOT_H
  const [s,setS]=useState(()=>strip([rnd(),rnd(),rnd()]))
  const [settled,setSettled]=useState(true),[flash,setFlash]=useState(false)
  const ref=useRef(null),raf=useRef(null),to=useRef(null)
  const pos=px=>{if(ref.current)ref.current.style.transform=`translateY(${px}px)`}
  useEffect(()=>{
    if(!trigger)return
    cancelAnimationFrame(raf.current);clearTimeout(to.current)
    setSettled(false);setFlash(false);pos(0);setS(strip(getSyms(idx)))
    const dur=delay+550,t0=performance.now()
    const go=now=>{
      const p=Math.min((now-t0)/dur,1),e=1-Math.pow(1-p,3)
      pos(e*endY);p<1?raf.current=requestAnimationFrame(go):(pos(endY),to.current=setTimeout(()=>{setSettled(true);setFlash(true);setTimeout(()=>setFlash(false),500);onStop?.()},20))
    }
    raf.current=requestAnimationFrame(()=>{pos(0);raf.current=requestAnimationFrame(go)})
    return()=>{cancelAnimationFrame(raf.current);clearTimeout(to.current)}
  },[trigger])
  const mw=settled&&win,MI=STRIP-3,MM=STRIP-2,MB=STRIP-1
  return(
    <div style={{width:110,height:SLOT_H*3,background:'#07070f',borderRadius:14,border:`2px solid ${mw?C.gold:flash?'#fff3':C.border}`,boxShadow:mw?`0 0 28px ${C.gold}50`:'none',overflow:'hidden',position:'relative',transition:'border-color .3s,box-shadow .4s'}}>
      <div style={{position:'absolute',inset:0,zIndex:2,pointerEvents:'none',background:'linear-gradient(to bottom,#07070faa 0%,transparent 25%,transparent 75%,#07070faa 100%)'}}/>
      <div style={{position:'absolute',left:0,right:0,top:SLOT_H,height:SLOT_H,zIndex:1,pointerEvents:'none',borderTop:`1px solid ${mw?C.gold+'90':C.gold+'25'}`,borderBottom:`1px solid ${mw?C.gold+'90':C.gold+'25'}`,background:mw?C.gold+'0e':'transparent',transition:'all .4s'}}/>
      <div ref={ref} style={{position:'absolute',top:0,left:0,right:0,height:STRIP*SLOT_H,transform:`translateY(${endY}px)`,zIndex:3,willChange:'transform'}}>
        {s.map((id,i)=>{
          const sy=sym(id),isMid=i===MM,isVis=i>=MI&&i<=MB,ws=settled&&win&&isMid
          return(
            <div key={i} style={{height:SLOT_H,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative'}}>
              <img src={sy.sprite} alt={sy.label} draggable={false} style={{
                width:settled&&isMid?72:settled&&isVis?50:58,height:settled&&isMid?72:settled&&isVis?50:58,
                imageRendering:'pixelated',objectFit:'contain',opacity:settled&&isVis&&!isMid?.3:1,
                filter:ws?`drop-shadow(0 0 14px ${sy.color}) brightness(1.3)`:settled&&isMid?`brightness(1.05)${sy.isWild?` drop-shadow(0 0 8px ${sy.color})`:''}` :'brightness(.75)',
                transition:settled?'all .2s':'none',userSelect:'none'}}/>
              {settled&&isMid&&<div style={{position:'absolute',bottom:4,fontSize:7,fontWeight:700,color:ws?sy.color:C.muted,textTransform:'uppercase',letterSpacing:.5}}>{sy.isWild?'★ WILD ★':sy.label}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Slots(){
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100),[spinning,setSpinning]=useState(false)
  const [trigger,setTrigger]=useState(0),[result,setResult]=useState(null)
  const [err,setErr]=useState(''),[stopped,setStopped]=useState(0)
  const [history,setHistory]=useState([])
  const pending=useRef(null)

  useEffect(()=>{
    if(stopped===3&&pending.current){
      const r=pending.current;updateBalance(r.balance);setResult(r);setSpinning(false)
      if(r.isWin)setHistory(p=>[{id:Date.now(),payout:r.payout,mult:r.multiplier},...p].slice(0,5))
    }
  },[stopped])

  const getSyms=useCallback(ri=>{
    const d=pending.current;if(!d?.reels?.[ri])return[rnd(),rnd(),rnd()]
    return[d.reels[ri][0].id,d.reels[ri][1].id,d.reels[ri][2].id]
  },[])

  async function spin(){
    if(spinning||!user||bet<10||bet>user.balance)return
    setSpinning(true);setResult(null);setErr('');setStopped(0);pending.current=null
    try{const{data}=await axios.post('/api/games/slots',{bet});pending.current=data;setTrigger(t=>t+1)}
    catch(e){setErr(e.response?.data?.error||'Erreur réseau');setSpinning(false)}
  }

  const isWin=result?.isWin===true,isJP=isWin&&(result?.multiplier??0)>=100
  const winSym=isWin&&result?.winSymId?sym(result.winSymId):null
  const winDesc=()=>{if(!result?.winType)return'';if(result.winType==='3x')return'3 identiques';if(result.hasWild)return'Wild + paire';return'2 identiques'}

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'16px',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>🎰 Slot Machine</span>
      </div>

      <div style={{display:'flex',gap:12,alignItems:'start',flex:1}}>

        {/* GAUCHE — Contrôles */}
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
            <BetInput bet={bet} setBet={setBet} disabled={spinning}/>
            {err&&<div style={{marginTop:8,fontSize:11,color:C.red,background:`${C.red}10`,border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px'}}>⚠ {err}</div>}
            <button onClick={spin} disabled={spinning||bet<10||bet>(user?.balance??0)}
              style={{width:'100%',marginTop:12,padding:'14px',background:spinning?C.dim:C.gold,color:spinning?C.muted:'#06060f',fontWeight:800,fontSize:16,borderRadius:10,border:'none',cursor:spinning?'not-allowed':'pointer',opacity:bet>(user?.balance??0)?.5:1,boxShadow:spinning?'none':`0 0 20px ${C.gold}44`,transition:'all .15s'}}>
              {spinning?'En cours…':'🎰  SPIN !'}
            </button>
          </div>

          {result&&!spinning&&(
            <div style={{background:isWin?`${C.green}0e`:`${C.red}08`,border:`1px solid ${isWin?C.green+'30':C.red+'18'}`,borderRadius:12,padding:14,textAlign:'center'}}>
              {isJP&&<div style={{color:C.gold,fontWeight:900,fontSize:12,marginBottom:6,letterSpacing:2}}>🏆 JACKPOT !</div>}
              {isWin?(
                <>
                  {winSym&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,justifyContent:'center'}}>
                    <img src={winSym.sprite} alt="" style={{width:32,height:32,imageRendering:'pixelated',filter:`drop-shadow(0 0 8px ${winSym.color})`}}/>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:11,color:winSym.color,fontWeight:700}}>{winSym.label}{result.hasWild&&<span style={{color:C.gold,marginLeft:4,fontSize:10}}>✨Wild</span>}</div>
                      <div style={{fontSize:10,color:C.muted}}>{winDesc()}</div>
                    </div>
                  </div>}
                  <div style={{fontSize:22,fontWeight:900,color:isJP?C.gold:C.green}}>+{result.payout.toLocaleString()}</div>
                  <div style={{fontSize:11,color:C.muted}}>jetons · <span style={{color:C.txt}}>×{result.multiplier}</span></div>
                </>
              ):(
                <><div style={{fontSize:13,color:C.muted}}>Pas de chance</div><div style={{color:C.red,fontSize:18,fontWeight:800,marginTop:4}}>−{bet.toLocaleString()}</div></>
              )}
            </div>
          )}

          {history.length>0&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {history.map(h=><div key={h.id} style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,background:`${C.green}12`,border:`1px solid ${C.green}28`,color:C.green}}>+{h.payout.toLocaleString()} <span style={{opacity:.5}}>×{h.mult}</span></div>)}
            </div>
          )}
        </div>

        {/* CENTRE — Machine */}
        <div style={{flex:1,background:C.surf,border:`2px solid ${isJP?C.gold:isWin?C.gold+'55':C.border}`,borderRadius:18,padding:24,transition:'border-color .5s,box-shadow .5s',boxShadow:isJP?`0 0 50px ${C.gold}35`:isWin?`0 0 24px ${C.gold}18`:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:C.gold,letterSpacing:4}}>SLOT MACHINE</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>Ligne centrale · Mew est Wild</div>
          </div>
          {isJP&&<div style={{background:`${C.gold}15`,border:`1px solid ${C.gold}50`,borderRadius:10,padding:'8px 24px',fontSize:14,fontWeight:900,color:C.gold,letterSpacing:3}}>🏆 JACKPOT !</div>}
          <div style={{background:'#050510',borderRadius:18,border:`1px solid ${C.border}`,padding:'22px 18px 18px',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:24,right:24,height:2,borderRadius:2,background:isJP?`linear-gradient(90deg,transparent,${C.gold},transparent)`:isWin?`linear-gradient(90deg,transparent,${C.gold}60,transparent)`:`linear-gradient(90deg,transparent,${C.border},transparent)`,transition:'background .5s'}}/>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              {[0,1,2].map(i=><Reel key={i} idx={i} trigger={trigger} delay={900+i*650} onStop={()=>setStopped(c=>c+1)} win={isWin} getSyms={getSyms}/>)}
            </div>
          </div>
        </div>

        {/* DROITE — Règles */}
        <div style={{width:220,flexShrink:0,background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Gains</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 44px 44px',gap:'3px 4px',alignItems:'center',marginBottom:4}}>
            <div style={{fontSize:9,color:C.muted}}>Symbole</div>
            <div style={{fontSize:9,color:C.muted,textAlign:'center'}}>3×</div>
            <div style={{fontSize:9,color:C.muted,textAlign:'center'}}>2×</div>
          </div>
          <div style={{height:1,background:C.dim,marginBottom:4}}/>
          {RULES.map(r=>{
            const s=SYMBOLS[r.id],active=isWin&&result?.winSymId===r.id
            return(
              <div key={r.id} style={{display:'grid',gridTemplateColumns:'1fr 44px 44px',alignItems:'center',padding:'3px 0',borderRadius:4,background:active?s.color+'12':'transparent',transition:'background .3s'}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <img src={s.sprite} alt="" style={{width:18,height:18,imageRendering:'pixelated',flexShrink:0}}/>
                  <span style={{fontSize:10,color:active?s.color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:s.color,textAlign:'center'}}>{r.p3}</div>
                <div style={{fontSize:10,color:C.muted,textAlign:'center'}}>{r.p2}</div>
              </div>
            )
          })}
          <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.dim}`,fontSize:10,color:C.muted,lineHeight:1.9}}>
            <div>✨ Mew = Wild (remplace tout)</div>
            <div>💡 2× = paire n'importe où</div>
            <div>🐟 Magicarpe ×0.5 en 3× seulement</div>
          </div>
        </div>
      </div>

      <LiveFeed/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
