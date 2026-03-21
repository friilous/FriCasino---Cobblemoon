import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}
const CW=460,CH=400,ROWS=8,BUCKETS=9,GAP=40,PEG_R=5,BALL_R=7
const BUCKET_H=34,FIRST_Y=56,BUCKET_Y=FIRST_Y+(ROWS-1)*GAP+GAP+4
const GRAVITY=.30,RESTITUTION=.38,FRICTION=.993
const MULTS={low:[5.0,4.5,1.0,0.5,0.5,0.5,1.0,4.5,5.0],medium:[9.0,4.0,1.0,0.5,0.5,0.5,1.0,4.0,9.0],high:[37.5,4.5,1.5,0.0,0.0,0.0,1.5,4.5,37.5]}
const BCOLS=['#7038f8','#f85888','#f8d030','#f08030','#a8a878','#f08030','#f8d030','#f85888','#7038f8']
const RISK={low:{label:'Faible',color:'#00c853'},medium:{label:'Moyen',color:'#f0b429'},high:{label:'Élevé',color:'#ff4444'}}
const BALL_COLORS=['#f0b429','#60a5fa','#f472b6','#34d399','#fb923c','#a78bfa']
function ppos(row,col){const n=row+2,tw=(n-1)*GAP,sx=CW/2-tw/2;return{x:sx+col*GAP,y:FIRST_Y+row*GAP}}
function bkX(i){const tw=(BUCKETS-1)*GAP,sx=CW/2-tw/2;return sx+i*GAP}
const WL=CW/2-(BUCKETS*GAP)/2-4,WR=CW/2+(BUCKETS*GAP)/2+4
function dpeg(ctx,x,y,ht){
  const now=Date.now(),d=ht?now-ht:Infinity
  if(d<800){const p=d/800,ex=(1-Math.abs(p*2-1))*10;ctx.beginPath();ctx.arc(x,y,PEG_R+ex,0,Math.PI*2);ctx.fillStyle=`rgba(255,220,100,${.25*(1-p)})`;ctx.fill()}
  ctx.beginPath();ctx.arc(x+1,y+1,PEG_R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fill()
  const gr=ctx.createRadialGradient(x-2,y-2,1,x,y,PEG_R);gr.addColorStop(0,d<300?'#ffe066':'#8888bb');gr.addColorStop(.5,d<300?'#f0b429':'#4a4a99');gr.addColorStop(1,'#1a1a35')
  ctx.beginPath();ctx.arc(x,y,PEG_R,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle=d<300?'#f0b42980':'#33336a';ctx.lineWidth=1;ctx.stroke()
}
function dball(ctx,x,y,col,angle){
  ctx.beginPath();ctx.arc(x+1.5,y+2,BALL_R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fill()
  ctx.shadowColor=col;ctx.shadowBlur=10;ctx.save();ctx.translate(x,y);ctx.rotate(angle)
  ctx.beginPath();ctx.arc(0,0,BALL_R,Math.PI,0);ctx.closePath();ctx.fillStyle=col;ctx.fill()
  ctx.beginPath();ctx.arc(0,0,BALL_R,0,Math.PI);ctx.closePath();ctx.fillStyle='#eee';ctx.fill()
  ctx.fillStyle='#111';ctx.fillRect(-BALL_R,-1.5,BALL_R*2,3)
  ctx.beginPath();ctx.arc(0,0,BALL_R*.3,0,Math.PI*2);ctx.fillStyle='#111';ctx.fill()
  ctx.beginPath();ctx.arc(0,0,BALL_R*.18,0,Math.PI*2);ctx.fillStyle='#eee';ctx.fill()
  ctx.beginPath();ctx.arc(0,0,BALL_R,0,Math.PI*2);ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.stroke()
  ctx.restore();ctx.shadowBlur=0
}
function dbucket(ctx,i,mults,active){
  const bx=bkX(i),by=BUCKET_Y,bw=GAP-3,col=BCOLS[i],mult=mults[i]
  if(active){ctx.shadowColor=col;ctx.shadowBlur=20}
  const rx=bx-bw/2,rr=5
  ctx.beginPath();ctx.moveTo(rx+rr,by);ctx.lineTo(rx+bw-rr,by);ctx.arcTo(rx+bw,by,rx+bw,by+rr,rr);ctx.lineTo(rx+bw,by+BUCKET_H-rr);ctx.arcTo(rx+bw,by+BUCKET_H,rx+bw-rr,by+BUCKET_H,rr);ctx.lineTo(rx+rr,by+BUCKET_H);ctx.arcTo(rx,by+BUCKET_H,rx,by+BUCKET_H-rr,rr);ctx.lineTo(rx,by+rr);ctx.arcTo(rx,by,rx+rr,by,rr);ctx.closePath()
  ctx.fillStyle=active?col:col+'25';ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=active?2:1;ctx.stroke();ctx.shadowBlur=0
  ctx.fillStyle=active?'#000':'#fff';ctx.font=`bold ${mult>=10?7:9}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${mult}×`,bx,by+BUCKET_H*.4)
}
function upd(ball,hits,dt){
  if(ball.done)return;const st=3,ddt=dt/st
  for(let s=0;s<st;s++){
    ball.vy+=GRAVITY*ddt;ball.vx*=Math.pow(FRICTION,ddt);ball.vy*=Math.pow(FRICTION,ddt)
    const sp=Math.hypot(ball.vx,ball.vy);if(sp>15){ball.vx=ball.vx/sp*15;ball.vy=ball.vy/sp*15}
    ball.x+=ball.vx*ddt;ball.y+=ball.vy*ddt;ball.angle+=ball.vx*.04*ddt
    if(ball.x-BALL_R<WL){ball.x=WL+BALL_R;ball.vx=Math.abs(ball.vx)*RESTITUTION}
    if(ball.x+BALL_R>WR){ball.x=WR-BALL_R;ball.vx=-Math.abs(ball.vx)*RESTITUTION}
    for(let r=0;r<ROWS;r++)for(let c=0;c<=r+1;c++){
      const{x:px,y:py}=ppos(r,c),dx=ball.x-px,dy=ball.y-py,dist=Math.hypot(dx,dy),md=PEG_R+BALL_R
      if(dist<md&&dist>.01){const nx=dx/dist,ny=dy/dist,ov=md-dist;ball.x+=nx*ov;ball.y+=ny*ov;const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=(1+RESTITUTION)*dot*nx;ball.vy-=(1+RESTITUTION)*dot*ny;ball.vx+=(Math.random()-.5)*.6};const k=`${r}-${c}`;if(!hits[k]||Date.now()-hits[k]>200)hits[k]=Date.now()}
    }
    if(ball.y+BALL_R>=BUCKET_Y&&!ball.hitBucket){let cl=0,md=Infinity;for(let i=0;i<BUCKETS;i++){const d=Math.abs(bkX(i)-ball.x);if(d<md){md=d;cl=i}};ball.hitBucket=cl;ball.done=true;ball.y=BUCKET_Y+BALL_R;ball.vy=0;ball.vx=0}
  }
}
function useEngine(cvs,risk,onLand){
  const balls=useRef([]),hits=useRef({}),flash=useRef(null),rRef=useRef(risk),last=useRef(null),raf=useRef(null)
  useEffect(()=>{rRef.current=risk},[risk])
  useEffect(()=>{
    const loop=now=>{
      const dt=last.current?Math.min((now-last.current)/16.67,3):1;last.current=now
      for(const b of balls.current){if(!b.done){upd(b,hits.current,dt);if(b.done&&b.hitBucket!==undefined){flash.current={bkt:b.hitBucket,t:Date.now()};onLand(b.id,b.hitBucket);setTimeout(()=>{balls.current=balls.current.filter(x=>x.id!==b.id)},600)}}}
      const c=cvs.current
      if(c){
        const ctx=c.getContext('2d'),ml=MULTS[rRef.current],fl=flash.current
        ctx.fillStyle='#05050e';ctx.fillRect(0,0,CW,CH)
        ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(240,180,41,0.18)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(CW/2,3);ctx.lineTo(CW/2,FIRST_Y-14);ctx.stroke();ctx.setLineDash([])
        ctx.fillStyle='rgba(240,180,41,0.5)';ctx.beginPath();ctx.moveTo(CW/2,4);ctx.lineTo(CW/2-5,12);ctx.lineTo(CW/2+5,12);ctx.closePath();ctx.fill()
        for(let r=0;r<ROWS;r++)for(let c2=0;c2<=r+1;c2++){const{x,y}=ppos(r,c2);dpeg(ctx,x,y,hits.current[`${r}-${c2}`])}
        for(let i=0;i<BUCKETS;i++)dbucket(ctx,i,ml,fl&&fl.bkt===i&&(Date.now()-fl.t)<700)
        for(const b of balls.current)dball(ctx,b.x,b.y,b.color,b.angle)
      }
      raf.current=requestAnimationFrame(loop)
    };raf.current=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf.current)
  },[])
  const drop=useCallback((id,tb,col)=>{const sx=CW/2+(Math.random()-.5)*4;balls.current=[...balls.current,{id,x:sx,y:10,vx:(Math.random()-.5)*.5,vy:1.6,angle:0,color:col,done:false,hitBucket:undefined}]},[])
  return{drop}
}
let uid=0

export default function Plinko(){
  const {user,updateBalance}=useAuth()
  const cvs=useRef(null),pend=useRef({})
  const [bet,setBet]=useState(100),[risk,setRisk]=useState('medium')
  const [dropping,setDropping]=useState(false),[err,setErr]=useState('')
  const [last,setLast]=useState(null),[history,setHistory]=useState([])
  const [stats,setStats]=useState({n:0,w:0,pnl:0})

  const onLand=useCallback(id=>{
    const p=pend.current[id];if(!p)return;delete pend.current[id]
    setLast({...p});setHistory(h=>[{id,...p},...h].slice(0,10))
    setStats(s=>({n:s.n+1,w:s.w+(p.win?1:0),pnl:s.pnl+p.pnl}));setDropping(false)
  },[])
  const{drop}=useEngine(cvs,risk,onLand)

  async function play(){
    if(dropping||!user||bet<10||bet>user.balance)return;setDropping(true);setErr('')
    try{
      const{data}=await axios.post('/api/games/plinko',{bet,risk});updateBalance(data.balance)
      const id=++uid,col=BALL_COLORS[id%BALL_COLORS.length],pnl=data.payout-bet,win=data.payout>=bet
      pend.current[id]={payout:data.payout,mult:data.multiplier,pnl,win,color:col};drop(id,data.bucket,col)
    }catch(e){setErr(e.response?.data?.error||'Erreur réseau');setDropping(false)}
  }

  const ri=RISK[risk]
  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'16px',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>⚪ Plinko</span>
      </div>

      <div style={{display:'flex',gap:12,alignItems:'start',flex:1}}>

        {/* GAUCHE */}
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Risque</div>
              <div style={{display:'flex',gap:6}}>
                {Object.entries(RISK).map(([id,info])=>(
                  <button key={id} onClick={()=>setRisk(id)} disabled={dropping} style={{flex:1,padding:'7px 0',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:`2px solid ${risk===id?info.color:C.border}`,background:risk===id?info.color+'20':'transparent',color:risk===id?info.color:C.muted,transition:'all .15s'}}>{info.label}</button>
                ))}
              </div>
            </div>
            <BetInput bet={bet} setBet={setBet} disabled={dropping}/>
            {err&&<div style={{marginTop:8,fontSize:11,color:C.red,background:`${C.red}10`,border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px'}}>⚠ {err}</div>}
            <button onClick={play} disabled={dropping||bet<10||bet>(user?.balance??0)}
              style={{width:'100%',marginTop:12,padding:'14px',background:dropping?C.dim:C.gold,color:dropping?C.muted:'#06060f',fontWeight:800,fontSize:16,borderRadius:10,border:'none',cursor:dropping?'not-allowed':'pointer',opacity:bet>(user?.balance??0)?.5:1,boxShadow:dropping?'none':`0 0 20px ${C.gold}44`,transition:'all .15s'}}>
              {dropping?'La bille tombe…':'⚪ Lâcher la bille'}
            </button>
          </div>

          {last&&(
            <div style={{background:last.win?`${C.green}0e`:`${C.red}08`,border:`1px solid ${last.win?C.green+'28':C.red+'18'}`,borderRadius:12,padding:14,textAlign:'center'}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:4}}>×{last.mult}</div>
              <div style={{fontSize:22,fontWeight:900,color:last.win?C.green:C.muted}}>{last.pnl>=0?'+':''}{last.pnl.toLocaleString()}</div>
              <div style={{fontSize:11,color:C.muted}}>jetons</div>
            </div>
          )}

          {stats.n>0&&(
            <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:12,padding:12}}>
              <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Session</div>
              {[['Lancers',stats.n,C.txt],['P&L',`${stats.pnl>=0?'+':''}${stats.pnl.toLocaleString()}`,stats.pnl>=0?C.green:C.red]].map(([l,v,col])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0'}}><span style={{color:C.muted}}>{l}</span><span style={{fontWeight:700,color:col}}>{v}</span></div>
              ))}
            </div>
          )}

          {history.length>0&&(
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {history.map(h=><div key={h.id} style={{fontSize:10,fontWeight:700,padding:'3px 7px',borderRadius:20,background:h.pnl>=0?`${C.green}12`:`${C.red}08`,border:`1px solid ${h.color}30`,color:h.pnl>=0?C.green:C.muted}}>{h.pnl>=0?'+':''}{h.pnl.toLocaleString()}</div>)}
            </div>
          )}
        </div>

        {/* CENTRE — Canvas */}
        <div style={{flex:1,background:C.surf,border:`1px solid ${C.border}`,borderRadius:18,padding:20,display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
          <div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:900,color:C.gold,letterSpacing:4}}>PLINKO</div><div style={{fontSize:11,color:C.muted,marginTop:3}}>Risque : <span style={{color:ri.color,fontWeight:700}}>{ri.label}</span>{'  ·  '}La bille est une Poké Ball</div></div>
          <div style={{background:'#05050e',borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
            <canvas ref={cvs} width={CW} height={CH} style={{display:'block'}}/>
          </div>
        </div>

        {/* DROITE — Règles */}
        <div style={{width:220,flexShrink:0,background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Multiplicateurs</div>
          {Object.entries(RISK).map(([r,info])=>(
            <div key={r} style={{marginBottom:10,opacity:r===risk?1:.35,transition:'opacity .2s'}}>
              <div style={{fontSize:11,fontWeight:700,color:info.color,marginBottom:5}}>{info.label}</div>
              <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                {MULTS[r].map((m,i)=><div key={i} style={{fontSize:9,fontWeight:700,padding:'2px 5px',borderRadius:4,fontFamily:'monospace',background:BCOLS[i]+'25',border:`1px solid ${BCOLS[i]}45`,color:'#fff'}}>{m}×</div>)}
              </div>
            </div>
          ))}
          <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.dim}`,fontSize:10,color:C.muted,lineHeight:1.9}}>
            <div>📊 Centre = fréquent · Bords = rare</div>
            <div>🏆 Risque Élevé : jackpot ×37.5</div>
          </div>
        </div>
      </div>
      <LiveFeed/>
    </div>
  )
}
