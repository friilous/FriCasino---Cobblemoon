import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C = {
  bg:'#06060f', surf1:'#0c0c1e', surf2:'#111128', border:'#1e1e3a',
  gold:'#f0b429', green:'#22c55e', red:'#ef4444', txt:'#e2e2f0', muted:'#44446a', dim:'#1a1a2e',
}

const POKEMON = [
  {dex:25,name:'Pikachu'},{dex:6,name:'Dracaufeu'},{dex:149,name:'Dracolosse'},
  {dex:131,name:'Lokhlass'},{dex:143,name:'Ronflex'},{dex:94,name:'Ectoplasma'},
  {dex:130,name:'Leviator'},{dex:59,name:'Arcanin'},
]
const SPRITE = dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`
const CW=560, CH=260

function drawGraph(ctx, points, mult, phase, crashPoint, pokemon) {
  ctx.clearRect(0,0,CW,CH)
  ctx.fillStyle='#070714'; ctx.fillRect(0,0,CW,CH)
  ctx.strokeStyle='#1a1a30'; ctx.lineWidth=1
  for(let y=0;y<=CH;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CW,y);ctx.stroke()}
  for(let x=0;x<=CW;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CH);ctx.stroke()}
  if(points.length<2)return
  const color=phase==='crashed'?'#ef4444':phase==='cashed'?'#22c55e':'#f0c040'
  ctx.beginPath(); ctx.moveTo(points[0].x,CH)
  for(const p of points)ctx.lineTo(p.x,p.y)
  ctx.lineTo(points[points.length-1].x,CH); ctx.closePath()
  ctx.fillStyle=color+'18'; ctx.fill()
  ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y)
  for(let i=1;i<points.length;i++){
    const prev=points[i-1],curr=points[i],cpx=(prev.x+curr.x)/2
    ctx.bezierCurveTo(cpx,prev.y,cpx,curr.y,curr.x,curr.y)
  }
  ctx.strokeStyle=color; ctx.lineWidth=3; ctx.shadowColor=color; ctx.shadowBlur=10; ctx.stroke(); ctx.shadowBlur=0
  if(pokemon?.img&&points.length>0){
    const last=points[points.length-1],size=38
    ctx.save()
    if(phase==='crashed'){ctx.globalAlpha=.4;ctx.filter='grayscale(1)'}
    ctx.drawImage(pokemon.img,last.x-size/2,last.y-size-4,size,size); ctx.restore()
  }
  ctx.font='bold 38px monospace'; ctx.textAlign='left'; ctx.textBaseline='top'
  ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=16
  ctx.fillText(phase==='crashed'?`💥 ${crashPoint?.toFixed(2)}×`:`${mult.toFixed(2)}×`,16,14)
  ctx.shadowBlur=0
  ctx.font='11px monospace'; ctx.fillStyle=phase==='crashed'?'#ef4444':phase==='cashed'?'#22c55e':'#555577'
  ctx.fillText(phase==='crashed'?'CRASH !':phase==='cashed'?'ENCAISSÉ ✓':'En cours...',16,60)
}

export default function Crash() {
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100)
  const [autoCash,setAutoCash]=useState('')
  const [phase,setPhase]=useState('idle')
  const [mult,setMult]=useState(1.00)
  const [crashPoint,setCrashPoint]=useState(null)
  const [result,setResult]=useState(null)
  const [error,setError]=useState('')
  const [history,setHistory]=useState([])
  const [pokemon,setPokemon]=useState(null)

  const canvasRef=useRef(null),pointsRef=useRef([]),rafRef=useRef(null)
  const multRef=useRef(1.00),phaseRef=useRef('idle'),startTimeRef=useRef(null),resultRef=useRef(null)

  function loadPokemon(){
    const p=POKEMON[Math.floor(Math.random()*POKEMON.length)]
    const img=new Image(); img.crossOrigin='anonymous'; img.src=SPRITE(p.dex)
    img.onload=()=>setPokemon({...p,img})
  }
  useEffect(()=>{loadPokemon()},[])

  function multToY(m){
    const maxMult=Math.max(resultRef.current?.crashPoint||2,multRef.current,2)
    const ratio=Math.log(m)/Math.log(maxMult+.5)
    return CH-16-ratio*(CH-32)
  }
  function timeToX(ms){
    const dur=Math.max(3000,(resultRef.current?.crashPoint||2)*1200)
    return 16+Math.min((ms/dur)*(CW-32),CW-16)
  }

  const animate=useCallback(()=>{
    if(phaseRef.current!=='running')return
    const elapsed=Date.now()-startTimeRef.current,res=resultRef.current
    if(!res)return
    const newMult=Math.min(1+elapsed/1500,res.crashPoint)
    multRef.current=newMult; setMult(newMult)
    pointsRef.current.push({x:timeToX(elapsed),y:multToY(newMult)})
    const canvas=canvasRef.current
    if(canvas)drawGraph(canvas.getContext('2d'),pointsRef.current,newMult,'running',null,pokemon)
    const auto=parseFloat(autoCash)
    if(auto>=1.01&&newMult>=auto){handleCashout();return}
    if(newMult>=res.crashPoint){
      phaseRef.current='crashed'; setPhase('crashed'); setMult(res.crashPoint); setCrashPoint(res.crashPoint)
      if(canvas)drawGraph(canvas.getContext('2d'),pointsRef.current,res.crashPoint,'crashed',res.crashPoint,pokemon)
      setResult({...res,payout:0,isWin:false})
      updateBalance(res.balance-res.payout)
      setHistory(p=>[{mult:res.crashPoint,win:false,bet},...p].slice(0,12))
      loadPokemon(); return
    }
    rafRef.current=requestAnimationFrame(animate)
  },[pokemon,autoCash,bet])

  function handleCashout(){
    if(phaseRef.current!=='running')return
    cancelAnimationFrame(rafRef.current)
    const res=resultRef.current,cashedAt=multRef.current
    phaseRef.current='cashed'; setPhase('cashed')
    const payout=Math.floor(bet*cashedAt)
    updateBalance(res.balance-bet+payout)
    setResult({...res,payout,isWin:true,cashedAt})
    setHistory(p=>[{mult:cashedAt,win:true,bet},...p].slice(0,12))
    const canvas=canvasRef.current
    if(canvas)drawGraph(canvas.getContext('2d'),pointsRef.current,cashedAt,'cashed',null,pokemon)
    loadPokemon()
  }

  async function handlePlay(){
    if(phase==='running'){handleCashout();return}
    if(!user||bet<10||bet>user.balance)return
    setError(''); setPhase('waiting'); phaseRef.current='waiting'
    pointsRef.current=[]; multRef.current=1.00; setMult(1.00); setResult(null); setCrashPoint(null)
    try{
      const{data}=await axios.post('/api/games/crash',{bet,cashoutAt:parseFloat(autoCash)>=1.01?parseFloat(autoCash):null})
      resultRef.current=data; startTimeRef.current=Date.now(); phaseRef.current='running'; setPhase('running')
      rafRef.current=requestAnimationFrame(animate)
    }catch(err){setError(err.response?.data?.error||'Erreur réseau');setPhase('idle');phaseRef.current='idle'}
  }

  useEffect(()=>()=>cancelAnimationFrame(rafRef.current),[])
  useEffect(()=>{
    const canvas=canvasRef.current
    if(canvas)drawGraph(canvas.getContext('2d'),[],1.00,'idle',null,null)
  },[])

  const isRunning=phase==='running', isWaiting=phase==='waiting'

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'14px',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>📈 Crash</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:12,alignItems:'start'}}>

        {/* Panneau gauche */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <BetInput bet={bet} setBet={setBet} disabled={isRunning||isWaiting}/>

            <div style={{marginTop:14}}>
              <label style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1,display:'block',marginBottom:6}}>
                Auto-encaissement à ×
              </label>
              <input type="number" value={autoCash} onChange={e=>setAutoCash(e.target.value)}
                placeholder="Ex: 2.0" min="1.01" step="0.5" disabled={isRunning||isWaiting}
                style={{width:'100%',background:'#07071a',border:`1px solid ${C.border}`,borderRadius:8,
                  padding:'8px 12px',color:C.txt,fontSize:13,outline:'none',boxSizing:'border-box',
                  opacity:isRunning||isWaiting?.5:1}}
                onFocus={e=>e.target.style.borderColor=C.gold}
                onBlur={e=>e.target.style.borderColor=C.border}/>
              <div style={{fontSize:9,color:C.muted,marginTop:3}}>Vide = encaissement manuel</div>
            </div>

            {error&&<div style={{marginTop:10,background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}

            <button onClick={handlePlay} disabled={isWaiting||(!isRunning&&(bet<10||bet>(user?.balance||0)))}
              style={{width:'100%',marginTop:14,padding:'13px',
                background:isWaiting?C.dim:isRunning?'#1a3a1a':C.gold,
                color:isWaiting?C.muted:isRunning?C.green:'#06060f',
                fontWeight:800,fontSize:15,borderRadius:10,border:isRunning?`1px solid ${C.green}40`:'none',
                cursor:isWaiting?'not-allowed':'pointer',transition:'all .15s',
                boxShadow:isWaiting?'none':isRunning?`0 0 20px ${C.green}30`:`0 0 20px ${C.gold}44`}}>
              {isWaiting?'En attente...':isRunning?'💰 Encaisser !':'🚀 Lancer'}
            </button>

            {isRunning&&(
              <div style={{marginTop:10,textAlign:'center',fontSize:11,color:C.muted}}>
                Si encaissé maintenant :{' '}
                <span style={{color:C.green,fontWeight:700}}>{Math.floor(bet*mult).toLocaleString()} jetons</span>
              </div>
            )}
          </div>

          {/* Résultat */}
          {result&&phase!=='running'&&(
            <div style={{background:result.isWin?`${C.green}10`:`${C.red}08`,
              border:`1px solid ${result.isWin?C.green+'30':C.red+'20'}`,borderRadius:12,padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:result.isWin?C.green:C.red,marginBottom:4}}>
                {result.isWin?`✅ Encaissé à ×${result.cashedAt?.toFixed(2)}`:`💥 Crash à ×${result.crashPoint?.toFixed(2)}`}
              </div>
              <div style={{fontSize:22,fontWeight:900,color:result.isWin?C.green:C.red}}>
                {result.isWin?`+${result.payout.toLocaleString()}`:`−${bet.toLocaleString()}`}
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>jetons</div>
            </div>
          )}

          {/* Historique */}
          {history.length>0&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {history.map((h,i)=>(
                <div key={i} style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:6,
                  background:h.win?`${C.green}12`:`${C.red}12`,
                  color:h.win?C.green:C.red,border:`1px solid ${h.win?C.green+'25':C.red+'25'}`}}>
                  ×{h.mult.toFixed(2)}
                </div>
              ))}
            </div>
          )}

          {/* Règles */}
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📋 Comment jouer</div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.9}}>
              <div>🚀 Lance et regarde le multiplicateur monter</div>
              <div>💰 Encaisse <span style={{color:C.txt}}>avant</span> le crash pour gagner</div>
              <div>💥 Si tu attends trop — tout est perdu</div>
              <div>🤖 Auto-encaissement = encaisse automatiquement</div>
            </div>
            <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,fontSize:10,color:C.muted}}>
              Gain = mise × multiplicateur au moment d'encaisser
            </div>
          </div>

          <LiveFeed compact/>
        </div>

        {/* Canvas */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
          <div style={{textAlign:'center',marginBottom:14}}>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,letterSpacing:3}}>CRASH</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Encaisse avant l'explosion</div>
          </div>
          <div style={{background:'#070714',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden',position:'relative',marginBottom:10}}>
            <canvas ref={canvasRef} width={CW} height={CH} style={{width:'100%',display:'block'}}/>
            {pokemon&&(
              <div style={{position:'absolute',bottom:8,right:10,display:'flex',alignItems:'center',gap:5}}>
                <img src={SPRITE(pokemon.dex)} alt={pokemon.name} style={{width:24,height:24,imageRendering:'pixelated',opacity:.4}}/>
                <span style={{fontSize:9,color:C.muted}}>{pokemon.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
