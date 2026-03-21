import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C={bg:'#06060f',surf1:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#1a1a2e'}
const CATEGORIES=[
  {id:'common',   label:'Commun',    count:6,payout:2.4, color:'#78c850',emoji:'⭐',desc:'Normal·Eau·Plante·Sol·Vol',      pokemons:[{dex:132},{dex:9},{dex:3},{dex:50},{dex:16}]},
  {id:'rare',     label:'Rare',      count:5,payout:2.8, color:'#6890f0',emoji:'💙',desc:'Feu·Électrik·Glace·Roche·Insecte',pokemons:[{dex:6},{dex:25},{dex:131},{dex:74},{dex:127}]},
  {id:'epic',     label:'Épique',    count:3,payout:4.7, color:'#f85888',emoji:'💜',desc:'Combat·Poison·Psy',               pokemons:[{dex:107},{dex:110},{dex:65}]},
  {id:'legendary',label:'Légendaire',count:1,payout:14.0,color:'#f0b429',emoji:'✨',desc:'Mew uniquement',                  pokemons:[{dex:151}]},
]
const MAGIKARP={id:'magikarp',label:'Magicarpe',count:1,payout:0,color:'#f87171',emoji:'🐟'}
const ALL_SEGS=[...CATEGORIES,MAGIKARP]
const TOTAL=ALL_SEGS.reduce((s,c)=>s+c.count,0)
const SLICE=(2*Math.PI)/TOTAL
const SPRITE=dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const CW=320,CH=320,CX=CW/2,CY=CH/2,R_OUT=142,R_IN=44

function buildWheel(){const byCat=ALL_SEGS.map(c=>Array.from({length:c.count},()=>c));const result=[];let round=0;while(result.length<TOTAL){for(const arr of byCat){if(round<arr.length)result.push(arr[round])}round++};return result.slice(0,TOTAL)}
const WHEEL=buildWheel()

function drawWheel(ctx,rotation,winCatId,spinning,selectedCatId,magImg){
  ctx.clearRect(0,0,CW,CH);ctx.fillStyle='#05050e';ctx.fillRect(0,0,CW,CH)
  ctx.beginPath();ctx.arc(CX,CY,R_OUT+12,0,Math.PI*2);ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([])
  ctx.beginPath();ctx.arc(CX,CY,R_OUT+7,0,Math.PI*2);ctx.strokeStyle=C.gold+'35';ctx.lineWidth=1;ctx.stroke()
  for(let i=0;i<16;i++){const a=(Math.PI*2/16)*i-Math.PI/2,bx=CX+(R_OUT+9)*Math.cos(a),by=CY+(R_OUT+9)*Math.sin(a);ctx.beginPath();ctx.arc(bx,by,3,0,Math.PI*2);ctx.fillStyle=C.gold+'aa';ctx.fill()}
  ctx.save();ctx.translate(CX,CY);ctx.rotate(rotation)
  for(let i=0;i<TOTAL;i++){
    const seg=WHEEL[i],a0=SLICE*i-Math.PI/2,a1=a0+SLICE
    const isWin=!spinning&&winCatId&&seg.id===winCatId,isMag=seg.id==='magikarp',isSel=!spinning&&!winCatId&&selectedCatId&&seg.id===selectedCatId
    ctx.beginPath();ctx.moveTo(R_IN*Math.cos(a0),R_IN*Math.sin(a0));ctx.arc(0,0,R_OUT,a0,a1);ctx.arc(0,0,R_IN,a1,a0,true);ctx.closePath()
    if(isWin){ctx.shadowColor=seg.color;ctx.shadowBlur=24;ctx.fillStyle=seg.color}
    else if(isSel){ctx.shadowColor=seg.color;ctx.shadowBlur=12;ctx.fillStyle=seg.color+'cc'}
    else if(isMag&&!spinning){ctx.shadowBlur=0;ctx.fillStyle=selectedCatId?'#1a000820':'#2a000a60'}
    else if(spinning){ctx.shadowBlur=0;ctx.fillStyle=isMag?'#2a000a50':seg.color+'55'}
    else{ctx.shadowBlur=0;ctx.fillStyle=selectedCatId&&!isSel?seg.color+'18':seg.color+'88'}
    ctx.fill();ctx.strokeStyle='#05050e';ctx.lineWidth=1.5;ctx.stroke();ctx.shadowBlur=0
    const midA=a0+SLICE/2,textR=R_OUT*.68+R_IN*.32,tx=textR*Math.cos(midA),ty=textR*Math.sin(midA)
    ctx.save();ctx.translate(tx,ty);ctx.rotate(midA+Math.PI/2);ctx.globalAlpha=(selectedCatId&&!isSel&&!isMag)?.18:isMag&&selectedCatId?.35:1
    if(isMag&&magImg){ctx.imageSmoothingEnabled=false;const sw=(R_OUT-R_IN)*.85;ctx.drawImage(magImg,-sw/2,-sw/2,sw,sw)}
    else{ctx.font=`${isWin||isSel?26:20}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(seg.emoji,0,0)}
    ctx.globalAlpha=1;ctx.restore()
  }
  ctx.restore()
  const hubGr=ctx.createRadialGradient(CX-8,CY-8,2,CX,CY,R_IN);hubGr.addColorStop(0,'#2a2a4a');hubGr.addColorStop(1,'#070712')
  ctx.beginPath();ctx.arc(CX,CY,R_IN,0,Math.PI*2);ctx.fillStyle=hubGr;ctx.fill();ctx.strokeStyle=C.gold;ctx.lineWidth=3;ctx.stroke()
  const winCat=winCatId?ALL_SEGS.find(c=>c.id===winCatId):null
  ctx.font='20px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(spinning?'🌀':winCat?winCat.emoji:'🎡',CX,CY)
}

function RouletteWheel({selectedCatId,winCatId,winningIndex,spinning}){
  const canvasRef=useRef(null),rotRef=useRef(0),rafRef=useRef(null),phaseRef=useRef('idle'),magImgRef=useRef(null)
  useEffect(()=>{const img=new Image();img.crossOrigin='anonymous';img.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png';img.onload=()=>{magImgRef.current=img;const c=canvasRef.current;if(c&&phaseRef.current==='idle')drawWheel(c.getContext('2d'),rotRef.current,null,false,null,img)}},[])
  useEffect(()=>{const c=canvasRef.current;if(c)drawWheel(c.getContext('2d'),0,null,false,null,magImgRef.current)},[])
  useEffect(()=>{if(!spinning&&!winCatId){const c=canvasRef.current;if(c)drawWheel(c.getContext('2d'),rotRef.current,null,false,selectedCatId,magImgRef.current)}},[selectedCatId,spinning,winCatId])
  useEffect(()=>{
    if(!spinning)return;phaseRef.current='spinning';const t0=performance.now()
    const loop=now=>{if(phaseRef.current!=='spinning')return;const speed=Math.min(.30,.05+(now-t0)/2500*.25);rotRef.current+=speed;const c=canvasRef.current;if(c)drawWheel(c.getContext('2d'),rotRef.current,null,true,null,magImgRef.current);rafRef.current=requestAnimationFrame(loop)}
    rafRef.current=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(rafRef.current);phaseRef.current='idle'}
  },[spinning])
  useEffect(()=>{
    if(!winCatId||spinning)return;cancelAnimationFrame(rafRef.current);phaseRef.current='stopping'
    const idx=winningIndex!==undefined?winningIndex%TOTAL:WHEEL.findIndex(s=>s.id===winCatId)
    const segAngle=SLICE*idx+SLICE/2,currentNorm=((rotRef.current%(Math.PI*2))+Math.PI*2)%(Math.PI*2),targetNorm=((-segAngle%(Math.PI*2))+Math.PI*2)%(Math.PI*2)
    let delta=targetNorm-currentNorm;if(delta<0)delta+=Math.PI*2
    const target=rotRef.current+delta+Math.PI*2*3,startRot=rotRef.current,t0=performance.now(),dur=2200,easeOut=t=>1-Math.pow(1-t,4)
    const stop=now=>{const p=Math.min((now-t0)/dur,1);rotRef.current=startRot+(target-startRot)*easeOut(p);const c=canvasRef.current;if(c)drawWheel(c.getContext('2d'),rotRef.current,p>=1?winCatId:null,false,null,magImgRef.current);if(p<1)rafRef.current=requestAnimationFrame(stop);else{rotRef.current=target;phaseRef.current='done'}}
    rafRef.current=requestAnimationFrame(stop);return()=>cancelAnimationFrame(rafRef.current)
  },[winCatId,spinning])
  return(
    <div style={{position:'relative',width:CW,margin:'0 auto'}}>
      <div style={{position:'absolute',top:CY-R_OUT-18,left:'50%',transform:'translateX(-50%)',zIndex:10,filter:`drop-shadow(0 0 8px ${C.gold})`}}>
        <svg width="20" height="26" viewBox="0 0 20 26"><polygon points="10,24 1,2 19,2" fill={C.gold} stroke="#fff3" strokeWidth="1.5"/></svg>
      </div>
      <canvas ref={canvasRef} width={CW} height={CH} style={{width:'100%',display:'block'}}/>
    </div>
  )
}

export default function Roulette(){
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100),[selected,setSelected]=useState(null)
  const [spinning,setSpinning]=useState(false),[winCatId,setWinCatId]=useState(null)
  const [winningIndex,setWinningIndex]=useState(undefined),[result,setResult]=useState(null)
  const [showResult,setShowResult]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState([])

  const selectedCat=CATEGORIES.find(c=>c.id===selected)

  function handleSelect(id){
    setSelected(id)
    if(showResult){setWinCatId(null);setWinningIndex(undefined);setShowResult(false);setResult(null)}
  }

  async function handleSpin(){
    if(spinning||!user||!selected||bet<10||bet>user.balance)return
    setSpinning(true);setResult(null);setShowResult(false);setWinCatId(null);setWinningIndex(undefined);setError('')
    try{
      const{data}=await axios.post('/api/games/roulette',{bet,betType:'category',betValue:selected})
      data.payout=data.isWin?Math.floor(bet*data.multiplier):0
      setTimeout(()=>{setSpinning(false);setWinningIndex(data.winningIndex);setWinCatId(data.winning.id);setTimeout(()=>{updateBalance(data.balance);setResult(data);setShowResult(true);const pnl=data.payout-bet;setHistory(p=>[{id:Date.now(),cat:data.winning,pnl,isWin:data.isWin},...p].slice(0,8))},2500)},1800)
    }catch(err){setError(err.response?.data?.error||'Erreur réseau');setSpinning(false)}
  }

  const isWin=result?.isWin,winCat=winCatId?ALL_SEGS.find(c=>c.id===winCatId):null
  const isMagikarped=showResult&&winCatId==='magikarp',inProgress=spinning||(!!winCatId&&!showResult)

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'14px',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>🎡 Roulette Pokémon</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'220px 1fr 220px',gap:12,alignItems:'start'}}>

        {/* COL 1 — Mise + catégories */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <BetInput bet={bet} setBet={setBet} disabled={inProgress}/>
            {error&&<div style={{marginTop:8,background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}
            <button onClick={handleSpin} disabled={inProgress||!selected||bet<10||bet>(user?.balance??0)}
              style={{width:'100%',marginTop:12,padding:'14px',background:inProgress?C.dim:!selected?C.dim:C.gold,color:inProgress||!selected?C.muted:'#06060f',fontWeight:800,fontSize:15,borderRadius:10,border:'none',cursor:inProgress||!selected?'not-allowed':'pointer',opacity:!selected?.6:bet>(user?.balance??0)?.5:1,boxShadow:inProgress||!selected?'none':`0 0 20px ${C.gold}44`,transition:'all .15s'}}>
              {inProgress?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{display:'inline-block',animation:'spin .7s linear infinite'}}>🌀</span>En cours...</span>
                :!selected?'← Choisis une catégorie':`🎡 Miser ${selectedCat?.emoji} ${selectedCat?.label}`}
            </button>
          </div>

          {/* Résultat */}
          {showResult&&result&&(
            <div style={{background:isMagikarped?`${C.red}08`:isWin?`${C.green}10`:`${C.red}08`,border:`1px solid ${isMagikarped?C.red+'25':isWin?C.green+'30':C.red+'20'}`,borderRadius:12,padding:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                {winCat&&<img src={SPRITE(winCat.id==='magikarp'?129:(CATEGORIES.find(c=>c.id===winCat.id)?.pokemons[0]?.dex??151))} alt={winCat.label} style={{width:36,height:36,imageRendering:'pixelated',filter:isMagikarped?'brightness(.5) sepia(1)':`drop-shadow(0 0 8px ${winCat.color})`}}/>}
                <div><div style={{fontSize:12,fontWeight:800,color:isMagikarped?C.red:winCat?.color}}>{winCat?.emoji} {winCat?.label}</div><div style={{fontSize:10,color:C.muted}}>Segment tombé</div></div>
              </div>
              {isMagikarped?(<><div style={{color:C.red,fontWeight:800,fontSize:13}}>🐟 Magicarpe vous nargue !</div><div style={{color:C.red,fontSize:20,fontWeight:900,marginTop:4}}>−{bet.toLocaleString()}</div></>)
                :isWin?(<><div style={{fontSize:22,fontWeight:900,color:C.green}}>+{result.payout.toLocaleString()}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>jetons · ×{result.multiplier}</div></>)
                :(<><div style={{color:C.muted,fontSize:12}}>Pas de chance...</div><div style={{color:C.red,fontSize:20,fontWeight:900,marginTop:4}}>−{bet.toLocaleString()}</div></>)}
            </div>
          )}

          {/* Catégories */}
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:12}}>
            <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>🎯 Catégories</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {CATEGORIES.map(cat=>{
                const isSel=selected===cat.id
                return(
                  <div key={cat.id} onClick={()=>!inProgress&&handleSelect(cat.id)}
                    style={{background:isSel?cat.color+'18':'#07071a',border:`2px solid ${isSel?cat.color:C.border}`,borderRadius:8,padding:'7px 10px',cursor:inProgress?'not-allowed':'pointer',transition:'all .15s',boxShadow:isSel?`0 0 10px ${cat.color}25`:'none'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <span style={{fontSize:14}}>{cat.emoji}</span>
                        <div>
                          <div style={{fontSize:11,fontWeight:800,color:isSel?cat.color:C.txt}}>{cat.label}</div>
                          <div style={{fontSize:9,color:C.muted}}>{cat.count}/16 seg</div>
                        </div>
                      </div>
                      <div style={{fontSize:13,fontWeight:900,color:isSel?'#000':cat.color,background:isSel?cat.color:'transparent',padding:'1px 8px',borderRadius:16,border:`1px solid ${cat.color}${isSel?'':'40'}`,fontFamily:'monospace',transition:'all .15s'}}>×{cat.payout}</div>
                    </div>
                    <div style={{display:'flex',gap:2}}>
                      {cat.pokemons.map(p=><img key={p.dex} src={SPRITE(p.dex)} alt="" style={{width:20,height:20,imageRendering:'pixelated',filter:isSel?`drop-shadow(0 0 3px ${cat.color}) brightness(1.1)`:'brightness(.5)',transition:'filter .15s'}}/>)}
                    </div>
                  </div>
                )
              })}
              <div style={{background:'#0a0005',border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px',opacity:.7}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:14}}>🐟</span>
                    <div><div style={{fontSize:11,fontWeight:800,color:C.red}}>Magicarpe <span style={{fontSize:8,background:`${C.red}20`,padding:'1px 5px',borderRadius:4}}>PIÈGE</span></div><div style={{fontSize:9,color:C.muted}}>1/16 · Non pariable</div></div>
                  </div>
                  <div style={{fontSize:12,color:C.red+'60',fontWeight:900,fontFamily:'monospace'}}>×0 💀</div>
                </div>
              </div>
            </div>
          </div>

          {history.length>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {history.map(h=>{const cat=ALL_SEGS.find(c=>c.id===h.cat.id);return<div key={h.id} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,background:h.cat.id==='magikarp'?`${C.red}12`:h.isWin?`${C.green}12`:`${C.dim}`,border:`1px solid ${h.cat.id==='magikarp'?C.red+'25':h.isWin?C.green+'25':C.border}`,color:h.cat.id==='magikarp'?C.red:h.isWin?C.green:C.muted}}><span style={{fontSize:10}}>{cat?.emoji}</span>{h.pnl>=0?'+':''}{h.pnl.toLocaleString()}</div>})}
          </div>}
        </div>

        {/* COL 2 — Roue */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
          <div style={{textAlign:'center',marginBottom:14}}>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,letterSpacing:3}}>ROULETTE POKÉMON</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>16 segments · <span style={{color:C.red}}>🐟 Magicarpe = perte</span></div>
          </div>
          <RouletteWheel selectedCatId={selected} winCatId={winCatId} winningIndex={winningIndex} spinning={spinning}/>
          {selectedCat&&!spinning&&!winCatId&&(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:12,padding:'8px 14px',background:selectedCat.color+'10',border:`1px solid ${selectedCat.color}25`,borderRadius:12}}>
              <span style={{fontSize:14}}>{selectedCat.emoji}</span>
              <div style={{fontSize:11,color:C.muted}}>Tu mises sur <span style={{color:selectedCat.color,fontWeight:700}}>{selectedCat.label}</span> · victoire = <span style={{color:selectedCat.color,fontWeight:700}}>×{selectedCat.payout}</span></div>
            </div>
          )}
          {inProgress&&(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:12}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.gold,animation:`dotBounce .7s ease-in-out ${i*.15}s infinite alternate`}}/>)}
              <span style={{color:C.muted,fontSize:11,marginLeft:4}}>{spinning?'La roue tourne...':'Arrêt en cours...'}</span>
            </div>
          )}
        </div>

        {/* COL 3 — Règles */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>📋 Gains par catégorie</div>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {CATEGORIES.map(cat=>(
              <div key={cat.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${C.dim}`}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14}}>{cat.emoji}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:cat.color}}>{cat.label}</div>
                    <div style={{fontSize:9,color:C.muted}}>{cat.count}/16 · {Math.round(cat.count/16*100)}% de chance</div>
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:900,color:cat.color,fontFamily:'monospace'}}>×{cat.payout}</div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:14}}>🐟</span>
                <div><div style={{fontSize:11,fontWeight:700,color:C.red}}>Magicarpe</div><div style={{fontSize:9,color:C.muted}}>1/16 · Segment piège</div></div>
              </div>
              <div style={{fontSize:12,fontWeight:900,color:C.red+'80',fontFamily:'monospace'}}>PERTE</div>
            </div>
          </div>
          <div style={{marginTop:10,padding:'10px',background:`${C.gold}08`,border:`1px solid ${C.gold}20`,borderRadius:8,fontSize:10,color:C.muted,lineHeight:1.8}}>
            <div>🎯 Mise sur une catégorie, la roue décide</div>
            <div>🐟 Si Magicarpe tombe = mise perdue</div>
            <div>🎲 Résultat calculé côté serveur, équitable</div>
          </div>
        </div>
      </div>

      <div style={{marginTop:12}}><LiveFeed/></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}};@keyframes dotBounce{from{transform:translateY(0);opacity:.4}to{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  )
}
