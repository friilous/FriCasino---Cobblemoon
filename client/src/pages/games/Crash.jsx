import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}
const MONS=[{dex:25,name:'Pikachu'},{dex:6,name:'Dracaufeu'},{dex:149,name:'Dracolosse'},{dex:131,name:'Lokhlass'},{dex:143,name:'Ronflex'},{dex:94,name:'Ectoplasma'},{dex:130,name:'Leviator'},{dex:59,name:'Arcanin'}]
const SPRITE=dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

function draw(ctx,pts,mult,phase,crash,mon){
  const W=ctx.canvas.width,H=ctx.canvas.height
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#060610';ctx.fillRect(0,0,W,H)
  ctx.strokeStyle='#1a1a2e';ctx.lineWidth=1
  for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  for(let x=0;x<W;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  if(pts.length<2)return
  const col=phase==='crashed'?'#ef4444':phase==='cashed'?'#22c55e':'#f0c040'
  ctx.beginPath();ctx.moveTo(pts[0].x,H);for(const p of pts)ctx.lineTo(p.x,p.y);ctx.lineTo(pts[pts.length-1].x,H);ctx.closePath();ctx.fillStyle=col+'18';ctx.fill()
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y)
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],cx=(a.x+b.x)/2;ctx.bezierCurveTo(cx,a.y,cx,b.y,b.x,b.y)}
  ctx.strokeStyle=col;ctx.lineWidth=3;ctx.shadowColor=col;ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0
  if(mon?.img&&pts.length){const l=pts[pts.length-1],sz=38;ctx.save();if(phase==='crashed'){ctx.globalAlpha=.4;ctx.filter='grayscale(1)'}ctx.drawImage(mon.img,l.x-sz/2,l.y-sz-4,sz,sz);ctx.restore()}
  ctx.font='bold 36px monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=14
  ctx.fillText(phase==='crashed'?`💥 ${crash?.toFixed(2)}×`:`${mult.toFixed(2)}×`,16,14);ctx.shadowBlur=0
  ctx.font='11px monospace';ctx.fillStyle=phase==='crashed'?'#ef4444cc':phase==='cashed'?'#22c55ecc':'#44446a'
  ctx.fillText(phase==='crashed'?'CRASH !':phase==='cashed'?'ENCAISSÉ ✓':'En cours...',16,56)
}

export default function Crash(){
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100),[auto,setAuto]=useState('')
  const [phase,setPhase]=useState('idle'),[mult,setMult]=useState(1)
  const [crash,setCrash]=useState(null),[result,setResult]=useState(null)
  const [err,setErr]=useState(''),[history,setHistory]=useState([]),[mon,setMon]=useState(null)
  const cvs=useRef(null),pts=useRef([]),raf=useRef(null)
  const mRef=useRef(1),phRef=useRef('idle'),t0=useRef(null),rRef=useRef(null)

  function loadMon(){const m=MONS[Math.floor(Math.random()*MONS.length)];const img=new Image();img.crossOrigin='anonymous';img.src=SPRITE(m.dex);img.onload=()=>setMon({...m,img})}
  useEffect(()=>loadMon(),[])

  function toY(m){const W=cvs.current?.height||280;const max=Math.max(rRef.current?.crashPoint||2,mRef.current,2);return W-16-(Math.log(m)/Math.log(max+.5))*(W-32)}
  function toX(ms){const W=cvs.current?.width||600;return 16+Math.min((ms/Math.max(3000,(rRef.current?.crashPoint||2)*1200))*(W-32),W-16)}

  const animate=useCallback(()=>{
    if(phRef.current!=='running')return
    const el=Date.now()-t0.current,res=rRef.current;if(!res)return
    const nm=Math.min(1+el/1500,res.crashPoint);mRef.current=nm;setMult(nm)
    pts.current.push({x:toX(el),y:toY(nm)})
    if(cvs.current)draw(cvs.current.getContext('2d'),pts.current,nm,'running',null,mon)
    const av=parseFloat(auto);if(av>=1.01&&nm>=av){cashout();return}
    if(nm>=res.crashPoint){
      phRef.current='crashed';setPhase('crashed');setMult(res.crashPoint);setCrash(res.crashPoint)
      if(cvs.current)draw(cvs.current.getContext('2d'),pts.current,res.crashPoint,'crashed',res.crashPoint,mon)
      setResult({...res,payout:0,isWin:false});updateBalance(res.balance-res.payout)
      setHistory(p=>[{mult:res.crashPoint,win:false},...p].slice(0,10));loadMon();return
    }
    raf.current=requestAnimationFrame(animate)
  },[mon,auto])

  function cashout(){
    if(phRef.current!=='running')return;cancelAnimationFrame(raf.current)
    const res=rRef.current,at=mRef.current;phRef.current='cashed';setPhase('cashed')
    const py=Math.floor(bet*at);updateBalance(res.balance-bet+py)
    setResult({...res,payout:py,isWin:true,at});setHistory(p=>[{mult:at,win:true},...p].slice(0,10))
    if(cvs.current)draw(cvs.current.getContext('2d'),pts.current,at,'cashed',null,mon);loadMon()
  }

  async function play(){
    if(phase==='running'){cashout();return}
    if(!user||bet<10||bet>user.balance)return
    setErr('');setPhase('waiting');phRef.current='waiting';pts.current=[];mRef.current=1;setMult(1);setResult(null);setCrash(null)
    try{
      const{data}=await axios.post('/api/games/crash',{bet,cashoutAt:parseFloat(auto)>=1.01?parseFloat(auto):null})
      rRef.current=data;t0.current=Date.now();phRef.current='running';setPhase('running');raf.current=requestAnimationFrame(animate)
    }catch(e){setErr(e.response?.data?.error||'Erreur réseau');setPhase('idle');phRef.current='idle'}
  }

  useEffect(()=>()=>cancelAnimationFrame(raf.current),[])
  useEffect(()=>{if(cvs.current)draw(cvs.current.getContext('2d'),[],1,'idle',null,null)},[])

  const running=phase==='running',waiting=phase==='waiting'

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'16px',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>📈 Crash</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12,alignItems:'start'}}>

        {/* Canvas */}
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:18,padding:20,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:C.gold,letterSpacing:4}}>CRASH</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>Encaisse avant l'explosion</div>
          </div>
          <div style={{background:'#060610',borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',position:'relative'}}>
            <canvas ref={cvs} width={660} height={280} style={{width:'100%',display:'block'}}/>
            {mon&&<div style={{position:'absolute',bottom:8,right:10,display:'flex',alignItems:'center',gap:5}}>
              <img src={SPRITE(mon.dex)} style={{width:20,height:20,imageRendering:'pixelated',opacity:.4}} alt=""/>
              <span style={{fontSize:9,color:C.muted}}>{mon.name}</span>
            </div>}
          </div>

          {/* Résultat */}
          {result&&phase!=='running'&&(
            <div style={{padding:'12px 18px',background:result.isWin?`${C.green}0e`:`${C.red}08`,border:`1px solid ${result.isWin?C.green+'30':C.red+'20'}`,borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:14,fontWeight:700,color:result.isWin?C.green:C.red}}>
                {result.isWin?`✅ Encaissé à ×${result.at?.toFixed(2)}`:`💥 Crash à ×${result.crashPoint?.toFixed(2)}`}
              </div>
              <div>
                <div style={{fontSize:24,fontWeight:900,color:result.isWin?C.green:C.red,textAlign:'right'}}>{result.isWin?`+${result.payout.toLocaleString()}`:`−${bet.toLocaleString()}`}</div>
                <div style={{fontSize:11,color:C.muted,textAlign:'right'}}>jetons</div>
              </div>
            </div>
          )}

          {/* Pills historique */}
          {history.length>0&&(
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {history.map((h,i)=>(
                <div key={i} style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:16,background:h.win?`${C.green}12`:`${C.red}10`,border:`1px solid ${h.win?C.green+'30':C.red+'25'}`,color:h.win?C.green:C.red}}>×{h.mult.toFixed(2)}</div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau droite */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
            <BetInput bet={bet} setBet={setBet} disabled={running||waiting}/>
            <div style={{marginTop:14}}>
              <label style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1,display:'block',marginBottom:6}}>Auto-encaissement à ×</label>
              <input type="number" value={auto} onChange={e=>setAuto(e.target.value)} placeholder="ex : 2.0" min="1.01" step="0.5" disabled={running||waiting}
                style={{width:'100%',background:'#07071a',border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',color:C.txt,fontSize:13,outline:'none',boxSizing:'border-box',opacity:running||waiting?.5:1}}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
              <div style={{fontSize:9,color:C.muted,marginTop:3}}>Vide = manuel</div>
            </div>
            {err&&<div style={{marginTop:8,fontSize:11,color:C.red,background:`${C.red}10`,border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px'}}>⚠ {err}</div>}
            <button onClick={play} disabled={waiting||(!running&&(bet<10||bet>(user?.balance||0)))}
              style={{width:'100%',marginTop:14,padding:'14px',
                background:waiting?C.dim:running?'#0c260c':C.gold,
                color:waiting?C.muted:running?C.green:'#06060f',
                fontWeight:800,fontSize:16,borderRadius:10,border:running?`1px solid ${C.green}40`:'none',
                cursor:waiting?'not-allowed':'pointer',transition:'all .15s',
                boxShadow:waiting?'none':running?`0 0 20px ${C.green}30`:`0 0 20px ${C.gold}44`}}>
              {waiting?'En attente…':running?'💰 Encaisser !':'🚀 Lancer'}
            </button>
            {running&&<div style={{marginTop:8,textAlign:'center',fontSize:11,color:C.muted}}>Encaissement maintenant : <span style={{color:C.green,fontWeight:700}}>{Math.floor(bet*mult).toLocaleString()} jetons</span></div>}
          </div>

          {/* Règles */}
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Comment jouer</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                {icon:'🚀',t:'Lance',d:'le multiplicateur commence à monter'},
                {icon:'💰',t:'Encaisse',d:'avant le crash pour empocher'},
                {icon:'💥',t:'Si tu attends trop',d:'tout est perdu'},
                {icon:'🤖',t:'Auto',d:'encaisse automatiquement à ton ×'},
              ].map(({icon,t,d})=>(
                <div key={t} style={{display:'flex',gap:8,alignItems:'flex-start',padding:'6px 0',borderBottom:`1px solid ${C.dim}`}}>
                  <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
                  <div><div style={{fontSize:11,fontWeight:700,color:C.txt}}>{t}</div><div style={{fontSize:10,color:C.muted}}>{d}</div></div>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,fontSize:10,color:C.muted,lineHeight:1.8}}>
              <div>💡 Gain = mise × multiplicateur encaissé</div>
              <div>📊 Crash à ×1.00 = ~11% des parties</div>
            </div>
          </div>
        </div>
      </div>
      <LiveFeed/>
    </div>
  )
}
