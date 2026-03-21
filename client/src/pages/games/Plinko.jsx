import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C={bg:'#06060f',surf1:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#1a1a2e'}
const CW=500,CH=490,ROWS=8,BUCKETS=9,GAP=46,PEG_R=6,BALL_R=9
const BUCKET_H=40,FIRST_Y=70,BUCKET_Y=FIRST_Y+(ROWS-1)*GAP+GAP+6
const GRAVITY=.35,RESTITUTION=.38,FRICTION=.993
const MULTIPLIERS={low:[5.0,4.5,1.0,0.5,0.5,0.5,1.0,4.5,5.0],medium:[9.0,4.0,1.0,0.5,0.5,0.5,1.0,4.0,9.0],high:[37.5,4.5,1.5,0.0,0.0,0.0,1.5,4.5,37.5]}
const BUCKET_COLORS=['#7038f8','#f85888','#f8d030','#f08030','#a8a878','#f08030','#f8d030','#f85888','#7038f8']
const BUCKET_TYPES=['Dragon','Psy','Électrik','Feu','Normal','Feu','Électrik','Psy','Dragon']
const RISK_LABELS={low:{label:'Faible',color:'#00c853'},medium:{label:'Moyen',color:'#f0b429'},high:{label:'Élevé',color:'#ff4444'}}
const BALL_COLORS=['#f0b429','#60a5fa','#f472b6','#34d399','#fb923c','#a78bfa']
function getPegPos(row,col){const count=row+2,totalW=(count-1)*GAP,startX=CW/2-totalW/2;return{x:startX+col*GAP,y:FIRST_Y+row*GAP}}
function getBucketX(i){const totalW=(BUCKETS-1)*GAP,startX=CW/2-totalW/2;return startX+i*GAP}
const WALL_LEFT=CW/2-(BUCKETS*GAP)/2-4,WALL_RIGHT=CW/2+(BUCKETS*GAP)/2+4
function drawPeg(ctx,x,y,hitT){
  const now=Date.now(),delta=hitT?now-hitT:Infinity
  if(delta<800){const pct=delta/800,expand=(1-Math.abs(pct*2-1))*14;ctx.beginPath();ctx.arc(x,y,PEG_R+expand,0,Math.PI*2);ctx.fillStyle=`rgba(255,220,100,${.25*(1-pct)})`;ctx.fill()}
  ctx.beginPath();ctx.arc(x+1,y+1.5,PEG_R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fill()
  const gr=ctx.createRadialGradient(x-2,y-2,1,x,y,PEG_R);gr.addColorStop(0,delta<300?'#ffe066':'#9090cc');gr.addColorStop(.5,delta<300?'#f0b429':'#5050aa');gr.addColorStop(1,'#1e1e38')
  ctx.beginPath();ctx.arc(x,y,PEG_R,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle=delta<300?'#f0b42980':'#3a3a6a';ctx.lineWidth=1;ctx.stroke()
  ctx.beginPath();ctx.arc(x-2,y-2,2,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fill()
}
function drawBall(ctx,x,y,color,angle){
  ctx.beginPath();ctx.arc(x+1.5,y+2,BALL_R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fill()
  ctx.shadowColor=color;ctx.shadowBlur=14;ctx.save();ctx.translate(x,y);ctx.rotate(angle)
  ctx.beginPath();ctx.arc(0,0,BALL_R,Math.PI,0);ctx.closePath();ctx.fillStyle=color;ctx.fill()
  ctx.beginPath();ctx.arc(0,0,BALL_R,0,Math.PI);ctx.closePath();ctx.fillStyle='#eee';ctx.fill()
  ctx.fillStyle='#111';ctx.fillRect(-BALL_R,-1.5,BALL_R*2,3)
  ctx.beginPath();ctx.arc(0,0,BALL_R*.32,0,Math.PI*2);ctx.fillStyle='#111';ctx.fill()
  ctx.beginPath();ctx.arc(0,0,BALL_R*.2,0,Math.PI*2);ctx.fillStyle='#eee';ctx.fill()
  ctx.beginPath();ctx.arc(0,0,BALL_R,0,Math.PI*2);ctx.strokeStyle='#111';ctx.lineWidth=1.2;ctx.stroke()
  ctx.restore();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(x-3,y-3,2.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fill()
}
function drawBucket(ctx,i,mults,active){
  const bx=getBucketX(i),by=BUCKET_Y,bw=GAP-3,color=BUCKET_COLORS[i],mult=mults[i],type=BUCKET_TYPES[i]
  if(active){ctx.shadowColor=color;ctx.shadowBlur=28}
  const rx=bx-bw/2,rr=7
  ctx.beginPath();ctx.moveTo(rx+rr,by);ctx.lineTo(rx+bw-rr,by);ctx.arcTo(rx+bw,by,rx+bw,by+rr,rr);ctx.lineTo(rx+bw,by+BUCKET_H-rr);ctx.arcTo(rx+bw,by+BUCKET_H,rx+bw-rr,by+BUCKET_H,rr);ctx.lineTo(rx+rr,by+BUCKET_H);ctx.arcTo(rx,by+BUCKET_H,rx,by+BUCKET_H-rr,rr);ctx.lineTo(rx,by+rr);ctx.arcTo(rx,by,rx+rr,by,rr);ctx.closePath()
  ctx.fillStyle=active?color:color+'30';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=active?2.5:1.2;ctx.stroke();ctx.shadowBlur=0
  ctx.fillStyle=active?'#000':'#fff';ctx.font=`bold ${mult>=10?8:10}px 'Courier New',monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${mult}×`,bx,by+BUCKET_H*.38)
  ctx.font='600 7px monospace';ctx.fillStyle=active?'#00000080':color+'cc';ctx.fillText(type,bx,by+BUCKET_H*.72)
}
function updateBall(ball,pegHits,dt){
  if(ball.done)return;const steps=3,ddt=dt/steps
  for(let s=0;s<steps;s++){
    ball.vy+=GRAVITY*ddt;ball.vx*=Math.pow(FRICTION,ddt);ball.vy*=Math.pow(FRICTION,ddt)
    const spd=Math.hypot(ball.vx,ball.vy);if(spd>18){ball.vx=ball.vx/spd*18;ball.vy=ball.vy/spd*18}
    ball.x+=ball.vx*ddt;ball.y+=ball.vy*ddt;ball.angle+=ball.vx*.04*ddt
    if(ball.x-BALL_R<WALL_LEFT){ball.x=WALL_LEFT+BALL_R;ball.vx=Math.abs(ball.vx)*RESTITUTION}
    if(ball.x+BALL_R>WALL_RIGHT){ball.x=WALL_RIGHT-BALL_R;ball.vx=-Math.abs(ball.vx)*RESTITUTION}
    for(let row=0;row<ROWS;row++)for(let col=0;col<=row+1;col++){
      const{x:px,y:py}=getPegPos(row,col),dx=ball.x-px,dy=ball.y-py,dist=Math.hypot(dx,dy),minD=PEG_R+BALL_R
      if(dist<minD&&dist>.01){const nx=dx/dist,ny=dy/dist,overlap=minD-dist;ball.x+=nx*overlap;ball.y+=ny*overlap;const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=(1+RESTITUTION)*dot*nx;ball.vy-=(1+RESTITUTION)*dot*ny;ball.vx+=(Math.random()-.5)*.8};const key=`${row}-${col}`;if(!pegHits[key]||Date.now()-pegHits[key]>200)pegHits[key]=Date.now()}
    }
    if(ball.y+BALL_R>=BUCKET_Y&&!ball.hitBucket){let closest=0,minDist=Infinity;for(let i=0;i<BUCKETS;i++){const d=Math.abs(getBucketX(i)-ball.x);if(d<minDist){minDist=d;closest=i}};ball.hitBucket=closest;ball.done=true;ball.y=BUCKET_Y+BALL_R;ball.vy=0;ball.vx=0}
  }
}
function usePlinkoEngine(canvasRef,risk,onBallLanded){
  const ballsRef=useRef([]),pegHitsRef=useRef({}),flashRef=useRef(null),riskRef=useRef(risk),lastRef=useRef(null),rafRef=useRef(null)
  useEffect(()=>{riskRef.current=risk},[risk])
  useEffect(()=>{
    const loop=now=>{
      const dt=lastRef.current?Math.min((now-lastRef.current)/16.67,3):1;lastRef.current=now
      for(const ball of ballsRef.current){if(!ball.done){updateBall(ball,pegHitsRef.current,dt);if(ball.done&&ball.hitBucket!==undefined){flashRef.current={bucket:ball.hitBucket,t:Date.now()};onBallLanded(ball.id,ball.hitBucket);setTimeout(()=>{ballsRef.current=ballsRef.current.filter(b=>b.id!==ball.id)},600)}}}
      const canvas=canvasRef.current
      if(canvas){const ctx=canvas.getContext('2d'),mults=MULTIPLIERS[riskRef.current],flash=flashRef.current;ctx.fillStyle='#06060f';ctx.fillRect(0,0,CW,CH);ctx.setLineDash([4,6]);ctx.strokeStyle='rgba(240,180,41,0.2)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(CW/2,4);ctx.lineTo(CW/2,FIRST_Y-20);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(240,180,41,0.45)';ctx.beginPath();ctx.moveTo(CW/2,5);ctx.lineTo(CW/2-5,15);ctx.lineTo(CW/2+5,15);ctx.closePath();ctx.fill();for(let row=0;row<ROWS;row++)for(let col=0;col<=row+1;col++){const{x,y}=getPegPos(row,col);drawPeg(ctx,x,y,pegHitsRef.current[`${row}-${col}`])};for(let i=0;i<BUCKETS;i++)drawBucket(ctx,i,mults,flash&&flash.bucket===i&&(Date.now()-flash.t)<700);for(const ball of ballsRef.current)drawBall(ctx,ball.x,ball.y,ball.color,ball.angle)}
      rafRef.current=requestAnimationFrame(loop)
    };rafRef.current=requestAnimationFrame(loop);return()=>cancelAnimationFrame(rafRef.current)
  },[])
  const dropBall=useCallback((id,targetBucket,color)=>{const startX=CW/2+(Math.random()-.5)*4;ballsRef.current=[...ballsRef.current,{id,x:startX,y:10,vx:(Math.random()-.5)*.5,vy:2,angle:0,angleV:0,color,targetBucket,done:false,hitBucket:undefined}]},[])
  return{dropBall}
}
let ballIdCounter=0

export default function Plinko(){
  const {user,updateBalance}=useAuth()
  const canvasRef=useRef(null),pendingRef=useRef({})
  const [bet,setBet]=useState(100),[risk,setRisk]=useState('medium')
  const [dropping,setDropping]=useState(false),[error,setError]=useState('')
  const [lastResult,setLastResult]=useState(null),[stats,setStats]=useState({total:0,wins:0,pnl:0})
  const [history,setHistory]=useState([])

  const handleBallLanded=useCallback(ballId=>{
    const pending=pendingRef.current[ballId];if(!pending)return
    delete pendingRef.current[ballId];const{payout,mult,pnl,isWin,color}=pending
    setLastResult({payout,mult,pnl,isWin,color});setStats(p=>({total:p.total+1,wins:p.wins+(isWin?1:0),pnl:p.pnl+pnl}))
    setHistory(p=>[{id:ballId,mult,pnl,color},...p].slice(0,14));setDropping(false)
  },[])
  const{dropBall}=usePlinkoEngine(canvasRef,risk,handleBallLanded)

  async function handleDrop(){
    if(dropping||!user||bet<10||bet>user.balance)return;setDropping(true);setError('')
    try{const{data}=await axios.post('/api/games/plinko',{bet,risk});updateBalance(data.balance);const id=++ballIdCounter,color=BALL_COLORS[id%BALL_COLORS.length],pnl=data.payout-bet,isWin=data.payout>=bet;pendingRef.current[id]={payout:data.payout,mult:data.multiplier,pnl,isWin,color};dropBall(id,data.bucket,color)}
    catch(err){setError(err.response?.data?.error||'Erreur réseau');setDropping(false)}
  }

  const riskInfo=RISK_LABELS[risk]

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'14px',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>⚪ Plinko</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'220px 1fr 220px',gap:12,alignItems:'start'}}>

        {/* COL 1 */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Niveau de risque</div>
              <div style={{display:'flex',gap:6}}>
                {Object.entries(RISK_LABELS).map(([id,info])=>(
                  <button key={id} onClick={()=>setRisk(id)} disabled={dropping}
                    style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:`2px solid ${risk===id?info.color:C.border}`,background:risk===id?info.color+'20':'transparent',color:risk===id?info.color:C.muted,transition:'all .15s'}}>
                    {info.label}
                  </button>
                ))}
              </div>
            </div>
            <BetInput bet={bet} setBet={setBet} disabled={dropping}/>
            {error&&<div style={{marginTop:8,background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}
            <button onClick={handleDrop} disabled={dropping||bet<10||bet>(user?.balance??0)}
              style={{width:'100%',marginTop:12,padding:'14px',background:dropping?C.dim:C.gold,color:dropping?C.muted:'#06060f',fontWeight:800,fontSize:15,borderRadius:10,border:'none',cursor:dropping?'not-allowed':'pointer',opacity:bet>(user?.balance??0)?.5:1,boxShadow:dropping?'none':`0 0 20px ${C.gold}44`,transition:'all .15s'}}>
              {dropping?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:14,height:14,borderRadius:'50%',border:'2px solid #f0b42940',borderTopColor:C.gold,display:'inline-block',animation:'spin .7s linear infinite'}}/>La bille tombe...</span>:'⚪ Lâcher la bille'}
            </button>
          </div>

          {lastResult&&(
            <div style={{background:lastResult.isWin?`${C.green}10`:`${C.red}08`,border:`1px solid ${lastResult.isWin?C.green+'30':C.red+'20'}`,borderRadius:12,padding:14,textAlign:'center'}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:2}}>Dernier · ×{lastResult.mult}</div>
              <div style={{fontSize:22,fontWeight:900,color:lastResult.isWin?C.green:C.muted}}>{lastResult.pnl>=0?'+':''}{lastResult.pnl.toLocaleString()}</div>
            </div>
          )}

          {stats.total>0&&(
            <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:12}}>
              <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Session</div>
              {[['Lancers',stats.total,C.txt],['Victoires',`${stats.wins} (${Math.round(stats.wins/stats.total*100)}%)`,C.txt],['P&L',`${stats.pnl>=0?'+':''}${stats.pnl.toLocaleString()}`,stats.pnl>=0?C.green:C.red]].map(([l,v,col])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0'}}><span style={{color:C.muted}}>{l}</span><span style={{fontWeight:700,color:col}}>{v}</span></div>
              ))}
            </div>
          )}

          {history.length>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {history.map(h=><div key={h.id} style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,background:h.pnl>=0?`${C.green}12`:`${C.dim}`,border:`1px solid ${h.color}35`,color:h.pnl>=0?C.green:C.muted}}>{h.pnl>=0?'+':''}{h.pnl.toLocaleString()} <span style={{opacity:.5}}>×{h.mult}</span></div>)}
          </div>}
        </div>

        {/* COL 2 — Canvas */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
          <div style={{textAlign:'center',marginBottom:14}}>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,letterSpacing:3}}>PLINKO</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Risque : <span style={{color:riskInfo.color,fontWeight:700}}>{riskInfo.label}</span>{'  ·  '}La bille est une Poké Ball</div>
          </div>
          <div style={{background:'#06060f',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden',marginBottom:10}}>
            <canvas ref={canvasRef} width={CW} height={CH} style={{width:'100%',display:'block'}}/>
          </div>
        </div>

        {/* COL 3 — Règles */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>📋 Multiplicateurs</div>
          {Object.entries(RISK_LABELS).map(([r,info])=>(
            <div key={r} style={{marginBottom:10,padding:'8px',borderRadius:8,background:r===risk?C.surf1+'80':'transparent',border:`1px solid ${r===risk?C.border:'transparent'}`,opacity:r===risk?1:.4,transition:'all .2s'}}>
              <div style={{fontSize:11,fontWeight:700,color:info.color,marginBottom:5}}>{info.label}</div>
              <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                {MULTIPLIERS[r].map((m,i)=>(
                  <div key={i} style={{fontSize:9,fontWeight:700,padding:'2px 5px',borderRadius:4,fontFamily:'monospace',background:BUCKET_COLORS[i]+'25',border:`1px solid ${BUCKET_COLORS[i]}50`,color:'#fff'}}>{m}×</div>
                ))}
              </div>
            </div>
          ))}
          <div style={{marginTop:8,padding:'10px',background:`${C.gold}08`,border:`1px solid ${C.gold}20`,borderRadius:8,fontSize:10,color:C.muted,lineHeight:1.8}}>
            <div>🎯 Bords = rare mais gros gains</div>
            <div>📊 Centre = fréquent mais petit</div>
            <div>🏆 Risque Élevé : jackpot ×37.5 possible</div>
          </div>
        </div>
      </div>

      <div style={{marginTop:12}}><LiveFeed/></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
