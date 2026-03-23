import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'

const SPRITE=dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const CATS=[
  {id:'common',   label:'Commun',    count:6,payout:2.4,color:'#78c850',emoji:'⭐',pokemons:[{dex:132},{dex:9},{dex:3},{dex:50},{dex:16}]},
  {id:'rare',     label:'Rare',      count:5,payout:2.8,color:'#6890f0',emoji:'💙',pokemons:[{dex:6},{dex:25},{dex:131},{dex:74},{dex:127}]},
  {id:'epic',     label:'Épique',    count:3,payout:4.7,color:'#f85888',emoji:'💜',pokemons:[{dex:107},{dex:110},{dex:65}]},
  {id:'legendary',label:'Légendaire',count:1,payout:14.0,color:'#f0b429',emoji:'✨',pokemons:[{dex:151}]},
]
const MAG={id:'magikarp',label:'Magicarpe',count:1,payout:0,color:'#f87171',emoji:'🐟'}
const ALL=[...CATS,MAG],TOTAL=16,SLICE=(2*Math.PI)/TOTAL
const CW=300,CH=300,CX=150,CY=150,RO=132,RI=44
function buildWheel(){const bc=ALL.map(c=>Array.from({length:c.count},()=>c));const r=[];let rn=0;while(r.length<TOTAL){for(const a of bc){if(rn<a.length)r.push(a[rn])}rn++};return r.slice(0,TOTAL)}
const WHEEL=buildWheel()
function drawWheel(ctx,rot,winId,spinning,selId,magImg){
  ctx.clearRect(0,0,CW,CH);ctx.fillStyle='#0a0508';ctx.fillRect(0,0,CW,CH)
  ctx.beginPath();ctx.arc(CX,CY,RO+10,0,Math.PI*2);ctx.strokeStyle='rgba(240,180,41,0.5)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([])
  ctx.save();ctx.translate(CX,CY);ctx.rotate(rot)
  for(let i=0;i<TOTAL;i++){
    const seg=WHEEL[i],a0=SLICE*i-Math.PI/2,a1=a0+SLICE
    const isW=!spinning&&winId&&seg.id===winId,isMag=seg.id==='magikarp',isSel=!spinning&&!winId&&selId&&seg.id===selId
    ctx.beginPath();ctx.moveTo(RI*Math.cos(a0),RI*Math.sin(a0));ctx.arc(0,0,RO,a0,a1);ctx.arc(0,0,RI,a1,a0,true);ctx.closePath()
    if(isW){ctx.shadowColor=seg.color;ctx.shadowBlur=22;ctx.fillStyle=seg.color}
    else if(isSel){ctx.shadowColor=seg.color;ctx.shadowBlur=10;ctx.fillStyle=seg.color+'cc'}
    else if(isMag&&!spinning){ctx.shadowBlur=0;ctx.fillStyle=selId?'#18000815':'#28000955'}
    else if(spinning){ctx.shadowBlur=0;ctx.fillStyle=isMag?'#2a000a44':seg.color+'44'}
    else{ctx.shadowBlur=0;ctx.fillStyle=selId&&!isSel?seg.color+'14':seg.color+'80'}
    ctx.fill();ctx.strokeStyle='#0a0508';ctx.lineWidth=1.5;ctx.stroke();ctx.shadowBlur=0
    const ma=a0+SLICE/2,tr=RO*.66+RI*.34,tx=tr*Math.cos(ma),ty=tr*Math.sin(ma)
    ctx.save();ctx.translate(tx,ty);ctx.rotate(ma+Math.PI/2);ctx.globalAlpha=selId&&!isSel&&!isMag?.15:isMag&&selId?.3:1
    if(isMag&&magImg){ctx.imageSmoothingEnabled=false;const sw=(RO-RI)*.7;ctx.drawImage(magImg,-sw/2,-sw/2,sw,sw)}
    else{ctx.font=`${isW||isSel?22:17}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(seg.emoji,0,0)}
    ctx.globalAlpha=1;ctx.restore()
  }
  ctx.restore()
  const hg=ctx.createRadialGradient(CX-8,CY-8,2,CX,CY,RI);hg.addColorStop(0,'#2a1a22');hg.addColorStop(1,'#0a0508')
  ctx.beginPath();ctx.arc(CX,CY,RI,0,Math.PI*2);ctx.fillStyle=hg;ctx.fill()
  ctx.strokeStyle='rgba(240,180,41,0.6)';ctx.lineWidth=3;ctx.stroke()
  const wc=winId?ALL.find(c=>c.id===winId):null
  ctx.font='17px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(spinning?'🌀':wc?wc.emoji:'🎡',CX,CY)
}
function Wheel({selId,winId,winIdx,spinning}){
  const cv=useRef(null),rot=useRef(0),raf=useRef(null),ph=useRef('idle'),mag=useRef(null)
  useEffect(()=>{const img=new Image();img.crossOrigin='anonymous';img.src=SPRITE(129);img.onload=()=>{mag.current=img;if(cv.current&&ph.current==='idle')drawWheel(cv.current.getContext('2d'),rot.current,null,false,null,img)}},[])
  useEffect(()=>{if(cv.current)drawWheel(cv.current.getContext('2d'),0,null,false,null,mag.current)},[])
  useEffect(()=>{if(!spinning&&!winId){if(cv.current)drawWheel(cv.current.getContext('2d'),rot.current,null,false,selId,mag.current)}},[selId,spinning,winId])
  useEffect(()=>{if(!spinning)return;ph.current='spinning';const t0=performance.now();const lp=now=>{if(ph.current!=='spinning')return;const sp=Math.min(.28,.05+(now-t0)/2500*.22);rot.current+=sp;if(cv.current)drawWheel(cv.current.getContext('2d'),rot.current,null,true,null,mag.current);raf.current=requestAnimationFrame(lp)};raf.current=requestAnimationFrame(lp);return()=>{cancelAnimationFrame(raf.current);ph.current='idle'}},[spinning])
  useEffect(()=>{if(!winId||spinning)return;cancelAnimationFrame(raf.current);ph.current='stopping';const idx=winIdx!==undefined?winIdx%TOTAL:WHEEL.findIndex(s=>s.id===winId);const sa=SLICE*idx+SLICE/2,cn=((rot.current%(Math.PI*2))+Math.PI*2)%(Math.PI*2),tn=((-sa%(Math.PI*2))+Math.PI*2)%(Math.PI*2);let d=tn-cn;if(d<0)d+=Math.PI*2;const tg=rot.current+d+Math.PI*2*3,sr=rot.current,t0=performance.now(),dur=2200,ease=t=>1-Math.pow(1-t,4);const st=now=>{const p=Math.min((now-t0)/dur,1);rot.current=sr+(tg-sr)*ease(p);if(cv.current)drawWheel(cv.current.getContext('2d'),rot.current,p>=1?winId:null,false,null,mag.current);if(p<1)raf.current=requestAnimationFrame(st);else{rot.current=tg;ph.current='done'}};raf.current=requestAnimationFrame(st);return()=>cancelAnimationFrame(raf.current)},[winId,spinning])
  return(
    <div style={{position:'relative',width:CW,margin:'0 auto'}}>
      <div style={{position:'absolute',top:CY-RO-14,left:'50%',transform:'translateX(-50%)',zIndex:10,filter:'drop-shadow(0 0 8px rgba(240,180,41,0.8))'}}>
        <svg width="18" height="22" viewBox="0 0 20 24"><polygon points="10,22 1,2 19,2" fill="rgba(240,180,41,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/></svg>
      </div>
      <canvas ref={cv} width={CW} height={CH} style={{width:'100%',display:'block',borderRadius:12}}/>
    </div>
  )
}
export default function Roulette(){
  const{user,updateBalance}=useAuth()
  const[bet,setBet]=useState(100),[sel,setSel]=useState(null)
  const[spinning,setSpinning]=useState(false),[winId,setWinId]=useState(null)
  const[winIdx,setWinIdx]=useState(undefined),[result,setResult]=useState(null)
  const[show,setShow]=useState(false),[err,setErr]=useState(''),[history,setHistory]=useState([])
  const selCat=CATS.find(c=>c.id===sel)
  function pick(id){setSel(id);if(show){setWinId(null);setWinIdx(undefined);setShow(false);setResult(null)}}
  async function spin(){
    if(spinning||!user||!sel||bet<10||bet>user.balance)return
    setSpinning(true);setResult(null);setShow(false);setWinId(null);setWinIdx(undefined);setErr('')
    try{
      const{data}=await axios.post('/api/games/roulette',{bet,betType:'category',betValue:sel})
      data.payout=data.isWin?Math.floor(bet*data.multiplier):0
      setTimeout(()=>{setSpinning(false);setWinIdx(data.winningIndex);setWinId(data.winning.id);setTimeout(()=>{updateBalance(data.balance);setResult(data);setShow(true);const pnl=data.payout-bet;setHistory(p=>[{id:Date.now(),cat:data.winning,pnl,win:data.isWin},...p].slice(0,8))},2500)},1800)
    }catch(e){setErr(e.response?.data?.error||'Erreur réseau');setSpinning(false)}
  }
  const isWin=result?.isWin,wCat=winId?ALL.find(c=>c.id===winId):null,isMag=show&&winId==='magikarp',inProg=spinning||(!!winId&&!show)
  return(
    <div style={{padding:'28px 32px',minHeight:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Link to="/machines" style={{fontFamily:'Cinzel, serif',fontSize:11,color:'rgba(245,230,200,0.3)',textDecoration:'none'}}>← Machines</Link>
        <span style={{color:'rgba(255,255,255,0.1)'}}>/</span>
        <span style={{fontFamily:'Cinzel, serif',fontSize:11,color:'rgba(167,139,250,0.6)'}}>🎡 Roulette Pokémon</span>
      </div>
      <div style={{display:'flex',gap:16,alignItems:'start',flex:1}}>
        <div style={{width:200,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:18}}>
            <BetInput bet={bet} setBet={setBet} disabled={inProg}/>
            {err&&<div style={{marginTop:8,fontSize:12,color:'#E8556A',padding:'7px 12px',background:'rgba(196,30,58,0.1)',borderRadius:8,fontFamily:'Crimson Pro, serif'}}>⚠ {err}</div>}
            <button onClick={spin} disabled={inProg||!sel||bet<10||bet>(user?.balance??0)} style={{width:'100%',marginTop:12,padding:'15px',background:inProg?'rgba(255,255,255,0.04)':!sel?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#FFD700,#F0B429,#D4890A)',color:inProg||!sel?'rgba(245,230,200,0.25)':'#1A0A00',fontFamily:'Cinzel, serif',fontWeight:700,fontSize:13,borderRadius:12,border:'none',cursor:inProg||!sel?'not-allowed':'pointer',opacity:!sel?.5:bet>(user?.balance??0)?.4:1,boxShadow:inProg||!sel?'none':'0 4px 20px rgba(240,180,41,0.4)',textTransform:'uppercase',letterSpacing:'0.05em'}}>
              {inProg?'En cours…':!sel?'Choisis →':'🎡 Miser'}
            </button>
          </div>
          {show&&result&&(
            <div style={{background:isMag?'rgba(239,68,68,0.06)':isWin?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.06)',border:`1px solid ${isMag?'rgba(239,68,68,0.2)':isWin?'rgba(34,197,94,0.25)':'rgba(239,68,68,0.2)'}`,borderRadius:14,padding:14,animation:'slideInUp 0.3s ease forwards'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                {wCat&&<img src={SPRITE(wCat.id==='magikarp'?129:wCat.pokemons?.[0]?.dex??151)} alt="" style={{width:28,height:28,imageRendering:'pixelated'}}/>}
                <div style={{fontFamily:'Cinzel, serif',fontSize:12,fontWeight:800,color:isMag?'#EF4444':wCat?.color}}>{wCat?.emoji} {wCat?.label}</div>
              </div>
              <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:22,fontWeight:700,color:isMag?'#EF4444':isWin?'#22C55E':'#EF4444'}}>
                {isMag||!isWin?`−${bet.toLocaleString('fr-FR')}`:`+${result.payout.toLocaleString('fr-FR')}`}
              </div>
              {isWin&&!isMag&&<div style={{fontFamily:'Cinzel, serif',fontSize:10,color:'rgba(245,230,200,0.3)'}}>jetons · ×{result.multiplier}</div>}
            </div>
          )}
          {history.length>0&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {history.map(h=>{const cat=ALL.find(c=>c.id===h.cat.id);return<div key={h.id} style={{fontFamily:'JetBrains Mono, monospace',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,display:'flex',alignItems:'center',gap:3,background:h.cat.id==='magikarp'?'rgba(239,68,68,0.1)':h.win?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)',border:`1px solid ${h.cat.id==='magikarp'?'rgba(239,68,68,0.2)':h.win?'rgba(34,197,94,0.25)':'rgba(239,68,68,0.15)'}`,color:h.cat.id==='magikarp'?'#EF4444':h.win?'#22C55E':'rgba(245,230,200,0.3)'}}><span style={{fontSize:10}}>{cat?.emoji}</span>{h.pnl>=0?'+':''}{h.pnl.toLocaleString('fr-FR')}</div>})}
            </div>
          )}
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontFamily:'Cinzel Decorative, serif',fontSize:20,fontWeight:900,color:'#A78BFA',textShadow:'0 0 30px rgba(167,139,250,0.3)',letterSpacing:3,marginBottom:4}}>ROULETTE POKÉMON</h1>
            <p style={{fontFamily:'Crimson Pro, serif',fontSize:13,color:'rgba(245,230,200,0.4)'}}>16 segments · <span style={{color:'#EF4444'}}>🐟 Magicarpe = perte</span></p>
          </div>
          <div style={{background:'#0a0508',borderRadius:16,border:'1px solid rgba(167,139,250,0.15)',padding:16,boxShadow:'inset 0 0 40px rgba(0,0,0,0.5)'}}>
            <Wheel selId={sel} winId={winId} winIdx={winIdx} spinning={spinning}/>
          </div>
          {selCat&&!spinning&&!winId&&(
            <div style={{padding:'8px 16px',background:`${selCat.color}10`,border:`1px solid ${selCat.color}25`,borderRadius:10,fontFamily:'Crimson Pro, serif',fontSize:13,color:'rgba(245,230,200,0.5)'}}>
              Tu mises sur <span style={{color:selCat.color,fontWeight:700}}>{selCat.emoji} {selCat.label}</span> · victoire = <span style={{color:selCat.color,fontWeight:700}}>×{selCat.payout}</span>
            </div>
          )}
          {inProg&&(
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'rgba(240,180,41,0.6)',animation:`pulseDot 0.7s ease-in-out ${i*.15}s infinite alternate`}}/>)}
              <span style={{fontFamily:'Crimson Pro, serif',color:'rgba(245,230,200,0.4)',fontSize:13}}>{spinning?'La roue tourne…':'Arrêt en cours…'}</span>
            </div>
          )}
        </div>
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:14}}>
            <div style={{fontFamily:'Cinzel, serif',fontSize:11,fontWeight:700,color:'rgba(167,139,250,0.6)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:12}}>Choisir une catégorie</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {CATS.map(cat=>{
                const isSel=sel===cat.id
                return(
                  <div key={cat.id} onClick={()=>!inProg&&pick(cat.id)} style={{background:isSel?cat.color+'18':'rgba(255,255,255,0.02)',border:`2px solid ${isSel?cat.color:'rgba(255,255,255,0.06)'}`,borderRadius:10,padding:'10px 12px',cursor:inProg?'not-allowed':'pointer',transition:'all .15s',boxShadow:isSel?`0 0 12px ${cat.color}28`:'none'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:16}}>{cat.emoji}</span>
                        <div>
                          <div style={{fontFamily:'Cinzel, serif',fontSize:12,fontWeight:800,color:isSel?cat.color:'rgba(245,230,200,0.7)'}}>{cat.label}</div>
                          <div style={{fontFamily:'Crimson Pro, serif',fontSize:9,color:'rgba(245,230,200,0.3)'}}>{cat.count}/16 · {Math.round(cat.count/16*100)}%</div>
                        </div>
                      </div>
                      <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:14,fontWeight:900,color:isSel?'#000':cat.color,background:isSel?cat.color:'transparent',padding:'2px 9px',borderRadius:14,border:`1px solid ${cat.color}${isSel?'':'45'}`,flexShrink:0}}>×{cat.payout}</div>
                    </div>
                    <div style={{display:'flex',gap:3}}>
                      {cat.pokemons.map(p=>(
                        <img key={p.dex} src={SPRITE(p.dex)} alt="" style={{width:20,height:20,imageRendering:'pixelated',filter:isSel?`drop-shadow(0 0 4px ${cat.color})`:'brightness(0.5)',transition:'filter .15s'}}/>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div style={{background:'rgba(0,0,0,0.2)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,padding:'10px 12px',opacity:.55}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:16}}>🐟</span>
                    <div>
                      <div style={{fontFamily:'Cinzel, serif',fontSize:12,fontWeight:800,color:'#EF4444'}}>Magicarpe <span style={{fontSize:8,background:'rgba(239,68,68,0.2)',padding:'1px 5px',borderRadius:4}}>PIÈGE</span></div>
                      <div style={{fontFamily:'Crimson Pro, serif',fontSize:9,color:'rgba(245,230,200,0.3)'}}>1/16 · Non pariable</div>
                    </div>
                  </div>
                  <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:12,color:'rgba(239,68,68,0.4)',fontWeight:900}}>×0</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
