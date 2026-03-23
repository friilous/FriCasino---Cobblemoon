// Plinko — Logique physique identique, nouvelle DA
// Ce fichier importe la même logique que l'original
// Copiez le fichier Plinko.jsx original et appliquez la palette CSS suivante:
// bg: var(--bg-main), border: var(--border-card), gold: var(--gold-warm)
// Toutes les couleurs hardcodées (#06060f -> #0C0608, #0c0c1e -> #1E1015)
// Fonts: fontFamily: 'Cinzel, serif' pour les titres, 'JetBrains Mono' pour les chiffres
// FICHIER FONCTIONNEL: copier Plinko.jsx de l'original et remplacer:
//   '#06060f' -> '#0C0608'
//   '#0c0c1e' -> '#1E1015'  
//   '#1e1e3a' -> 'rgba(255,255,255,0.08)'
//   '#f0b429' -> '#F0B429' (inchangé)
//   '#e2e2f0' -> '#F5E6C8'
//   '#44446a' -> 'rgba(245,230,200,0.35)'
//   '#12121f' -> 'rgba(255,255,255,0.03)'
//   'Cinzel Decorative' headers
// NOTE: Le fichier Plinko original est 100% fonctionnel - juste les couleurs changent
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'

const C = { bg:'#0C0608', surf:'#1E1015', border:'rgba(255,255,255,0.08)', gold:'#F0B429', green:'#22C55E', red:'#EF4444', txt:'#F5E6C8', muted:'rgba(245,230,200,0.35)', dim:'rgba(255,255,255,0.03)' }
const CW=460,CH=420,ROWS=8,BUCKETS=9,GAP=40,PEG_R=5,BALL_R=7,BUCKET_H=34,FIRST_Y=56
const BUCKET_Y=FIRST_Y+(ROWS-1)*GAP+GAP+4
const MULTIPLIERS={low:[5.0,4.5,1.0,0.5,0.5,0.5,1.0,4.5,5.0],medium:[9.0,4.0,1.0,0.5,0.5,0.5,1.0,4.0,9.0],high:[37.5,4.5,1.5,0.0,0.0,0.0,1.5,4.5,37.5]}
const BCOLS=['#7038f8','#f85888','#f8d030','#f08030','#a8a878','#f08030','#f8d030','#f85888','#7038f8']
const BALL_COLORS=['#f0b429','#60a5fa','#f472b6','#34d399','#fb923c','#a78bfa']
const RISK={low:{label:'Faible',color:'#00c853'},medium:{label:'Moyen',color:'#f0b429'},high:{label:'Élevé',color:'#ff4444'}}
function pegPos(row,col){const n=row+2;const tw=(n-1)*GAP;const sx=CW/2-tw/2;return{x:sx+col*GAP,y:FIRST_Y+row*GAP}}
function bucketCX(i){const tw=(BUCKETS-1)*GAP;const sx=CW/2-tw/2;return sx+i*GAP}
const WALL_L=bucketCX(0)-GAP/2-2,WALL_R=bucketCX(BUCKETS-1)+GAP/2+2
const GRAVITY=1500,RESTITUTION=0.38,FRICTION_V=0.992
function drawPeg(ctx,x,y,hitTime){const now=Date.now();const age=hitTime?now-hitTime:Infinity;if(age<600){const p=age/600;const ex=(1-Math.abs(p*2-1))*8;ctx.beginPath();ctx.arc(x,y,PEG_R+ex,0,Math.PI*2);ctx.fillStyle=`rgba(255,220,100,${0.3*(1-p)})`;ctx.fill()}ctx.beginPath();ctx.arc(x+1,y+1,PEG_R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fill();const gr=ctx.createRadialGradient(x-2,y-2,1,x,y,PEG_R);const hot=age<250;gr.addColorStop(0,hot?'#ffe066':'#8888bb');gr.addColorStop(0.5,hot?'#f0b429':'#4a4a99');gr.addColorStop(1,'#1a1a35');ctx.beginPath();ctx.arc(x,y,PEG_R,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle=hot?'#f0b42980':'#33336a';ctx.lineWidth=1;ctx.stroke()}
function drawBall(ctx,x,y,col,angle,trail){trail.forEach((t,i)=>{const a=(i/trail.length)*0.25;const r=BALL_R*0.45*(i/trail.length);ctx.beginPath();ctx.arc(t.x,t.y,r,0,Math.PI*2);ctx.fillStyle=`rgba(240,192,64,${a})`;ctx.fill()});ctx.beginPath();ctx.arc(x+1.5,y+2,BALL_R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fill();ctx.shadowColor=col;ctx.shadowBlur=10;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.arc(0,0,BALL_R,Math.PI,0);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.beginPath();ctx.arc(0,0,BALL_R,0,Math.PI);ctx.closePath();ctx.fillStyle='#eee';ctx.fill();ctx.fillStyle='#111';ctx.fillRect(-BALL_R,-1.5,BALL_R*2,3);ctx.beginPath();ctx.arc(0,0,BALL_R*0.3,0,Math.PI*2);ctx.fillStyle='#111';ctx.fill();ctx.beginPath();ctx.arc(0,0,BALL_R*0.18,0,Math.PI*2);ctx.fillStyle='#eee';ctx.fill();ctx.beginPath();ctx.arc(0,0,BALL_R,0,Math.PI*2);ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.stroke();ctx.restore();ctx.shadowBlur=0}
function drawBucket(ctx,i,mults,active){const bx=bucketCX(i);const by=BUCKET_Y;const bw=GAP-3;const col=BCOLS[i];const mult=mults[i];const rx=bx-bw/2;const rr=5;if(active){ctx.shadowColor=col;ctx.shadowBlur=20}ctx.beginPath();ctx.moveTo(rx+rr,by);ctx.lineTo(rx+bw-rr,by);ctx.arcTo(rx+bw,by,rx+bw,by+rr,rr);ctx.lineTo(rx+bw,by+BUCKET_H-rr);ctx.arcTo(rx+bw,by+BUCKET_H,rx+bw-rr,by+BUCKET_H,rr);ctx.lineTo(rx+rr,by+BUCKET_H);ctx.arcTo(rx,by+BUCKET_H,rx,by+BUCKET_H-rr,rr);ctx.lineTo(rx,by+rr);ctx.arcTo(rx,by,rx+rr,by,rr);ctx.closePath();ctx.fillStyle=active?col:col+'25';ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=active?2:1;ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=active?'#000':'#fff';ctx.font=`bold ${mult>=10?7:9}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${mult}×`,bx,by+BUCKET_H*0.4)}
function updateBall(ball,hits,dt){if(ball.done)return;const SUB=3;const sdt=dt/SUB;for(let s=0;s<SUB;s++){ball.vy+=GRAVITY*sdt;ball.vx*=Math.pow(FRICTION_V,sdt*60);ball.vy*=Math.pow(FRICTION_V,sdt*60);const sp=Math.hypot(ball.vx,ball.vy);if(sp>900){ball.vx=ball.vx/sp*900;ball.vy=ball.vy/sp*900}ball.x+=ball.vx*sdt;ball.y+=ball.vy*sdt;ball.angle+=ball.vx*0.003*sdt*60;if(ball.x-BALL_R<WALL_L){ball.x=WALL_L+BALL_R;ball.vx=Math.abs(ball.vx)*RESTITUTION}if(ball.x+BALL_R>WALL_R){ball.x=WALL_R-BALL_R;ball.vx=-Math.abs(ball.vx)*RESTITUTION}for(let r=0;r<ROWS;r++){for(let c=0;c<=r+1;c++){const{x:px,y:py}=pegPos(r,c);const dx=ball.x-px;const dy=ball.y-py;const dist=Math.hypot(dx,dy);const minD=PEG_R+BALL_R;if(dist<minD&&dist>0.01){const nx=dx/dist;const ny=dy/dist;ball.x+=nx*(minD-dist);ball.y+=ny*(minD-dist);const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=(1+RESTITUTION)*dot*nx;ball.vy-=(1+RESTITUTION)*dot*ny;ball.vx+=(Math.random()-0.5)*40;if(ball.vy<50)ball.vy=50}const k=`${r}-${c}`;if(!hits[k]||Date.now()-hits[k]>150)hits[k]=Date.now();break}}}if(ball.y+BALL_R>=BUCKET_Y&&!ball.done){let hitIdx=-1;for(let i=0;i<BUCKETS;i++){const cx=bucketCX(i);if(ball.x>=cx-GAP/2&&ball.x<cx+GAP/2){hitIdx=i;break}}if(hitIdx===-1)hitIdx=ball.x<CW/2?0:BUCKETS-1;ball.hitBucket=hitIdx;ball.done=true;ball.y=BUCKET_Y+BALL_R;ball.vx=0;ball.vy=0}}}
function useEngine(cvs,risk,onLand){const balls=useRef([]);const hits=useRef({});const flash=useRef(null);const rRef=useRef(risk);const lastTs=useRef(null);const rafId=useRef(null);useEffect(()=>{rRef.current=risk},[risk]);useEffect(()=>{const loop=(now)=>{const dt=lastTs.current?Math.min((now-lastTs.current)/1000,0.05):1/60;lastTs.current=now;for(const ball of balls.current){if(!ball.done){updateBall(ball,hits.current,dt);if(ball.done&&ball.hitBucket!==undefined){flash.current={bkt:ball.hitBucket,t:Date.now()};onLand(ball.id,ball.hitBucket);setTimeout(()=>{balls.current=balls.current.filter(b=>b.id!==ball.id)},700)}}}const canvas=cvs.current;if(canvas){const ctx=canvas.getContext('2d');const ml=MULTIPLIERS[rRef.current];const fl=flash.current;ctx.fillStyle='#05050e';ctx.fillRect(0,0,CW,CH);ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(240,180,41,0.18)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(CW/2,3);ctx.lineTo(CW/2,FIRST_Y-14);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(240,180,41,0.5)';ctx.beginPath();ctx.moveTo(CW/2,4);ctx.lineTo(CW/2-5,12);ctx.lineTo(CW/2+5,12);ctx.closePath();ctx.fill();for(let r=0;r<ROWS;r++){for(let c=0;c<=r+1;c++){const{x,y}=pegPos(r,c);drawPeg(ctx,x,y,hits.current[`${r}-${c}`])}}for(let i=0;i<BUCKETS;i++){drawBucket(ctx,i,ml,fl&&fl.bkt===i&&(Date.now()-fl.t)<700)}for(const b of balls.current){drawBall(ctx,b.x,b.y,b.color,b.angle,b.trail)}}rafId.current=requestAnimationFrame(loop)};rafId.current=requestAnimationFrame(loop);return()=>cancelAnimationFrame(rafId.current)},[]);const drop=useCallback((id,col)=>{const sx=CW/2+(Math.random()-0.5)*4;balls.current=[...balls.current,{id,x:sx,y:12,vx:(Math.random()-0.5)*30,vy:0,angle:0,color:col,trail:[],done:false,hitBucket:undefined}]},[]);return{drop}}
let uid=0
export default function Plinko(){
  const{user,updateBalance}=useAuth();const cvs=useRef(null);const pend=useRef({});
  const[bet,setBet]=useState(100);const[risk,setRisk]=useState('medium');const[dropping,setDropping]=useState(false);const[err,setErr]=useState('');const[last,setLast]=useState(null);const[history,setHistory]=useState([]);const[stats,setStats]=useState({n:0,w:0,pnl:0})
  const onLand=useCallback(async(id,physBucket)=>{const p=pend.current[id];if(!p)return;delete pend.current[id];try{const{data}=await axios.post('/api/games/plinko',{bet:p.bet,risk:p.risk,bucket:physBucket});updateBalance(data.balance);const pnl=data.payout-p.bet;const win=data.payout>=p.bet;const result={payout:data.payout,mult:data.multiplier,pnl,win,color:p.color};setLast(result);setHistory(h=>[{id,...result},...h].slice(0,10));setStats(s=>({n:s.n+1,w:s.w+(win?1:0),pnl:s.pnl+pnl}))}catch(e){setErr(e.response?.data?.error||'Erreur réseau')}setDropping(false)},[updateBalance])
  const{drop}=useEngine(cvs,risk,onLand)
  function play(){if(dropping||!user||bet<10||bet>user.balance)return;setDropping(true);setErr('');const id=++uid;const col=BALL_COLORS[id%BALL_COLORS.length];pend.current[id]={bet,risk,color:col};drop(id,col)}
  const ri=RISK[risk]
  return(
    <div style={{padding:'28px 32px',minHeight:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Link to="/machines" style={{fontFamily:'Cinzel, serif',fontSize:11,color:'rgba(245,230,200,0.3)',textDecoration:'none'}}>← Machines</Link>
        <span style={{color:'rgba(255,255,255,0.1)'}}>/</span>
        <span style={{fontFamily:'Cinzel, serif',fontSize:11,color:'rgba(244,114,182,0.6)'}}>⚪ Plinko</span>
      </div>
      <div style={{display:'flex',gap:16,alignItems:'start',flex:1}}>
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:18}}>
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:'Cinzel, serif',fontSize:10,color:'rgba(245,230,200,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:8}}>Risque</div>
              <div style={{display:'flex',gap:6}}>
                {Object.entries(RISK).map(([id,info])=>(
                  <button key={id} onClick={()=>setRisk(id)} disabled={dropping} style={{flex:1,padding:'7px 0',borderRadius:8,fontSize:10,fontWeight:700,fontFamily:'Cinzel, serif',cursor:'pointer',border:`2px solid ${risk===id?info.color:'rgba(255,255,255,0.08)'}`,background:risk===id?info.color+'20':'transparent',color:risk===id?info.color:'rgba(245,230,200,0.35)',transition:'all .15s'}}>
                    {info.label}
                  </button>
                ))}
              </div>
            </div>
            <BetInput bet={bet} setBet={setBet} disabled={dropping}/>
            {err&&<div style={{marginTop:8,fontSize:12,color:'#E8556A',padding:'7px 12px',background:'rgba(196,30,58,0.1)',borderRadius:8,fontFamily:'Crimson Pro, serif'}}>⚠ {err}</div>}
            <button onClick={play} disabled={dropping||bet<10||bet>(user?.balance??0)} style={{width:'100%',marginTop:12,padding:'15px',background:dropping?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#FFD700,#F0B429,#D4890A)',color:dropping?'rgba(245,230,200,0.3)':'#1A0A00',fontFamily:'Cinzel, serif',fontWeight:700,fontSize:14,borderRadius:12,border:'none',cursor:dropping||bet>(user?.balance??0)?'not-allowed':'pointer',opacity:bet>(user?.balance??0)?0.4:1,boxShadow:dropping?'none':'0 4px 20px rgba(240,180,41,0.4)',textTransform:'uppercase',letterSpacing:'0.05em'}}>
              {dropping?'La bille tombe…':'⚪ Lâcher la bille'}
            </button>
          </div>
          {last&&<div style={{background:last.win?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.06)',border:`1px solid ${last.win?'rgba(34,197,94,0.25)':'rgba(239,68,68,0.2)'}`,borderRadius:14,padding:14,textAlign:'center',animation:'slideInUp 0.3s ease forwards'}}>
            <div style={{fontFamily:'Cinzel, serif',fontSize:10,color:'rgba(245,230,200,0.3)',marginBottom:4}}>×{last.mult}</div>
            <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:22,fontWeight:700,color:last.win?'#22C55E':'#EF4444'}}>{last.pnl>=0?`+${last.pnl.toLocaleString('fr-FR')}`:last.pnl.toLocaleString('fr-FR')}</div>
            <div style={{fontFamily:'Cinzel, serif',fontSize:10,color:'rgba(245,230,200,0.3)'}}>jetons</div>
          </div>}
          {stats.n>0&&<div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:12}}>
            <div style={{fontFamily:'Cinzel, serif',fontSize:9,color:'rgba(245,230,200,0.25)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Session</div>
            {[['Lancers',stats.n,'rgba(245,230,200,0.7)'],['P&L',`${stats.pnl>=0?'+':''}${stats.pnl.toLocaleString('fr-FR')}`,stats.pnl>=0?'#22C55E':'#EF4444']].map(([l,v,col])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',fontFamily:'Crimson Pro, serif',fontSize:12,padding:'3px 0'}}>
                <span style={{color:'rgba(245,230,200,0.35)'}}>{l}</span>
                <span style={{fontWeight:700,color:col,fontFamily:'JetBrains Mono, monospace'}}>{v}</span>
              </div>
            ))}
          </div>}
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontFamily:'Cinzel Decorative, serif',fontSize:22,fontWeight:900,color:'#F472B6',textShadow:'0 0 30px rgba(244,114,182,0.3)',letterSpacing:4,marginBottom:4}}>PLINKO</h1>
            <p style={{fontFamily:'Crimson Pro, serif',fontSize:13,color:'rgba(245,230,200,0.4)'}}>Risque : <span style={{color:ri.color,fontWeight:700}}>{ri.label}</span> · La bille est une Poké Ball</p>
          </div>
          <div style={{background:'#05050e',borderRadius:14,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <canvas ref={cvs} width={CW} height={CH} style={{display:'block'}}/>
          </div>
        </div>
        <div style={{width:200,flexShrink:0,background:'linear-gradient(160deg,#1E1015,#150D10)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:14}}>
          <div style={{fontFamily:'Cinzel, serif',fontSize:11,fontWeight:700,color:'rgba(244,114,182,0.6)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:12}}>Multiplicateurs</div>
          {Object.entries(RISK).map(([r,info])=>(
            <div key={r} style={{marginBottom:10,opacity:r===risk?1:0.3,transition:'opacity .2s'}}>
              <div style={{fontFamily:'Cinzel, serif',fontSize:10,fontWeight:700,color:info.color,marginBottom:5}}>{info.label}</div>
              <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                {MULTIPLIERS[r].map((m,i)=>(
                  <div key={i} style={{fontSize:9,fontWeight:700,padding:'2px 5px',borderRadius:4,fontFamily:'JetBrains Mono, monospace',background:BCOLS[i]+'25',border:`1px solid ${BCOLS[i]}45`,color:'#fff'}}>{m}×</div>
                ))}
              </div>
            </div>
          ))}
          <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.06)',fontFamily:'Crimson Pro, serif',fontSize:12,color:'rgba(245,230,200,0.3)',lineHeight:1.8}}>
            <div>📊 Centre = fréquent · Bords = rare</div>
            <div>🏆 Risque Élevé : jackpot ×37.5</div>
          </div>
        </div>
      </div>
    </div>
  )
}
