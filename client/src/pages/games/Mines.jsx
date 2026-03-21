import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',gold:'#f0b429',green:'#22c55e',red:'#ef4444',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}
const SPRITE=dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

function drawToken(ctx,x,y,r){
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#f0c040';ctx.shadowColor='#f0c040';ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0
  ctx.strokeStyle='#ffd060';ctx.lineWidth=2;ctx.stroke()
  ctx.beginPath();ctx.arc(x,y,r*.65,0,Math.PI*2);ctx.strokeStyle='#a07020';ctx.lineWidth=1.5;ctx.stroke()
  ctx.beginPath();ctx.arc(x,y,r*.35,0,Math.PI*2);ctx.fillStyle='#a07020';ctx.fill()
  ctx.beginPath();ctx.arc(x,y,r*.15,0,Math.PI*2);ctx.fillStyle='#f0c040';ctx.fill()
  ctx.beginPath();ctx.moveTo(x-r*.35,y);ctx.lineTo(x+r*.35,y);ctx.strokeStyle='#a07020';ctx.lineWidth=1.5;ctx.stroke()
}

function Cell({i,state,onClick,disabled}){
  const cv=useRef(null)
  useEffect(()=>{if(state!=='token')return;const c=cv.current;if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,64,64);drawToken(ctx,32,32,22)},[state])
  const base={width:62,height:62,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',cursor:disabled?'default':'pointer',transition:'all .15s',position:'relative',overflow:'hidden'}
  if(state==='hidden')return<div onClick={()=>!disabled&&onClick(i)} style={{...base,background:'#0d0d28',border:`1px solid ${C.border}`,cursor:disabled?'not-allowed':'pointer'}} onMouseEnter={e=>{if(!disabled)e.currentTarget.style.borderColor=C.gold+'70'}} onMouseLeave={e=>{if(!disabled)e.currentTarget.style.borderColor=C.border}}><span style={{fontSize:20,opacity:.2,color:C.muted}}>?</span></div>
  if(state==='token')return<div style={{...base,background:`${C.gold}12`,border:`1px solid ${C.gold}45`}}><canvas ref={cv} width={64} height={64} style={{position:'absolute',inset:0}}/></div>
  if(state==='mine')return<div style={{...base,background:`${C.red}28`,border:`2px solid ${C.red}80`,boxShadow:`0 0 18px ${C.red}50`}}><img src={SPRITE(100)} alt="Voltorbe" style={{width:54,height:54,imageRendering:'pixelated'}}/></div>
  if(state==='mine_other')return<div style={{...base,background:`${C.red}08`,border:`1px solid ${C.red}28`,opacity:.55}}><img src={SPRITE(100)} alt="Voltorbe" style={{width:50,height:50,imageRendering:'pixelated',filter:'grayscale(.6)'}}/></div>
  return null
}

export default function Mines(){
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100),[mines,setMines]=useState(3)
  const [phase,setPhase]=useState('idle'),[revealed,setRevealed]=useState([])
  const [minePos,setMinePos]=useState([]),[mult,setMult]=useState(1)
  const [payout,setPayout]=useState(0),[loading,setLoading]=useState(false)
  const [err,setErr]=useState(''),[history,setHistory]=useState([]),[hit,setHit]=useState(null)

  function cellState(i){
    if(['exploded','cashed','won'].includes(phase)){if(i===hit)return'mine';if(minePos.includes(i))return'mine_other';if(revealed.includes(i))return'token'}
    if(revealed.includes(i))return'token';return'hidden'
  }

  async function start(){
    if(bet<10||bet>(user?.balance||0))return;setLoading(true);setErr('')
    try{const{data}=await axios.post('/api/games/mines',{action:'start',bet,minesCount:mines});updateBalance(data.balance);setPhase('playing');setRevealed([]);setMinePos([]);setMult(1);setPayout(0);setHit(null)}
    catch(e){setErr(e.response?.data?.error||'Erreur réseau')}finally{setLoading(false)}
  }
  async function reveal(i){
    if(phase!=='playing'||revealed.includes(i)||loading)return;setLoading(true)
    try{
      const{data}=await axios.post('/api/games/mines',{action:'reveal',cellIndex:i})
      if(data.status==='exploded'){setHit(i);setMinePos(data.mines||[]);setRevealed(p=>[...p,i]);setPhase('exploded');setMult(0);setPayout(0);setHistory(p=>[{status:'exploded',bet,payout:0},...p].slice(0,6))}
      else{setRevealed(p=>[...p,i]);setMult(data.multiplier);setPayout(data.payout);if(data.status==='won'){setMinePos(data.mines||[]);setPhase('won');updateBalance(data.balance);setHistory(p=>[{status:'won',bet,payout:data.payout},...p].slice(0,6))}}
    }catch(e){setErr(e.response?.data?.error||'Erreur réseau')}finally{setLoading(false)}
  }
  async function cashout(){
    if(phase!=='playing'||!revealed.length||loading)return;setLoading(true)
    try{const{data}=await axios.post('/api/games/mines',{action:'cashout'});setMinePos(data.mines||[]);setPhase('cashed');setMult(data.multiplier);setPayout(data.payout);updateBalance(data.balance);setHistory(p=>[{status:'cashed',bet,payout:data.payout},...p].slice(0,6))}
    catch(e){setErr(e.response?.data?.error||'Erreur réseau')}finally{setLoading(false)}
  }

  const playing=phase==='playing',done=['exploded','cashed','won'].includes(phase)
  const canCashout=playing&&revealed.length>0&&!loading
  const statusCol=phase==='exploded'?C.red:C.green
  const firstMult=(0.92*(25/(25-mines))).toFixed(2)

  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'16px',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>💣 Mines</span>
      </div>

      <div style={{display:'flex',gap:12,alignItems:'start'}}>

        {/* Grille */}
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:18,padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:C.gold,letterSpacing:4}}>MINES</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>Grille 5×5 · Évite les Voltorbe · Encaisse quand tu veux</div>
          </div>

          {/* Indicateur en cours */}
          {playing&&revealed.length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:16,padding:'10px 20px',background:`${C.gold}0a`,border:`1px solid ${C.gold}25`,borderRadius:12}}>
              <div style={{fontSize:11,color:C.muted}}>{revealed.length} case{revealed.length>1?'s':''}</div>
              <div style={{fontSize:22,fontWeight:900,color:C.gold}}>×{mult}</div>
              <div style={{fontSize:16,fontWeight:700,color:C.green}}>{payout.toLocaleString()} jetons</div>
            </div>
          )}

          {/* Grille */}
          <div style={{order:1,background:'#07070f',border:`1px solid ${C.border}`,borderRadius:16,padding:18}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,62px)',gap:8,justifyContent:'center'}}>
              {Array.from({length:25},(_,i)=><Cell key={i} i={i} state={cellState(i)} onClick={reveal} disabled={!playing||loading}/>)}
            </div>
          </div>

          {/* Résultat */}
          {done&&(
            <div style={{width:'100%',maxWidth:380,padding:'12px 20px',background:phase==='exploded'?`${C.red}08`:`${C.green}0e`,border:`1px solid ${statusCol}28`,borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:statusCol}}>{phase==='exploded'?'💥 Voltorbe !':phase==='won'?'🏆 Grille complète !':` ✅ Encaissé ×${mult}`}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{revealed.length} case{revealed.length>1?'s':''} · {mines} Voltorbe{mines>1?'s':''}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:24,fontWeight:900,color:statusCol}}>{phase==='exploded'?`−${bet.toLocaleString()}`:`+${(payout-bet).toLocaleString()}`}</div>
                <div style={{fontSize:11,color:C.muted}}>jetons</div>
              </div>
            </div>
          )}

          {phase==='idle'&&<div style={{fontSize:12,color:C.muted}}>Configure ta mise et lance !</div>}

          {/* Pills historique */}
          {history.length>0&&(
            <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
              {history.map((h,i)=>(
                <div key={i} style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:h.status==='exploded'?`${C.red}10`:`${C.green}12`,border:`1px solid ${h.status==='exploded'?C.red+'25':C.green+'30'}`,color:h.status==='exploded'?C.red:C.green}}>
                  {h.status==='exploded'?'💥 Voltorbe':`+${(h.payout-h.bet).toLocaleString()}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau droite */}
        <div style={{width:280,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
          {/* Contrôles */}
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
            {!playing?(
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading}/>
                <div style={{marginTop:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <label style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Voltorbe</label>
                    <div style={{fontSize:15,fontWeight:800,color:C.red,background:`${C.red}12`,padding:'2px 10px',borderRadius:8,border:`1px solid ${C.red}28`}}>{mines}</div>
                  </div>
                  <input type="range" min={1} max={24} value={mines} onChange={e=>setMines(parseInt(e.target.value))} style={{width:'100%',accentColor:C.red}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.muted,marginTop:2}}><span>1 facile</span><span>24 extrême</span></div>
                </div>
                <div style={{marginTop:10,padding:'8px 10px',background:C.dim,border:`1px solid ${C.border}`,borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:C.muted}}>1ère case sûre</span>
                  <span style={{fontSize:13,color:C.gold,fontWeight:700}}>×{firstMult}</span>
                </div>
                {err&&<div style={{marginTop:8,fontSize:11,color:C.red,background:`${C.red}10`,border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px'}}>⚠ {err}</div>}
                <button onClick={start} disabled={loading||bet<10||bet>(user?.balance||0)}
                  style={{width:'100%',marginTop:12,padding:'14px',background:loading?C.dim:C.gold,color:loading?C.muted:'#06060f',fontWeight:800,fontSize:16,borderRadius:10,border:'none',cursor:loading?'not-allowed':'pointer',opacity:loading||bet>(user?.balance||0)?.5:1,boxShadow:`0 0 20px ${C.gold}44`}}>
                  {loading?'Démarrage…':done?'🔄 Nouvelle partie':'💣 Commencer'}
                </button>
              </>
            ):(
              <>
                <div style={{textAlign:'center',padding:'10px',background:C.dim,borderRadius:10,marginBottom:10}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Multiplicateur</div>
                  <div style={{fontSize:30,fontWeight:900,color:C.gold}}>×{mult}</div>
                  {revealed.length>0&&<div style={{fontSize:14,color:C.green,fontWeight:700,marginTop:2}}>{payout.toLocaleString()} jetons</div>}
                </div>
                <div style={{fontSize:11,color:C.muted,textAlign:'center',marginBottom:10}}>
                  Mise : <span style={{color:C.gold,fontWeight:700}}>{bet.toLocaleString()}</span> · <span style={{color:C.red}}>{mines} 💣</span>
                </div>
                <button onClick={cashout} disabled={!canCashout}
                  style={{width:'100%',padding:'14px',background:canCashout?'#0a2a0a':C.dim,color:canCashout?C.green:C.muted,border:`1px solid ${canCashout?C.green+'45':C.border}`,fontWeight:800,fontSize:14,borderRadius:10,cursor:canCashout?'pointer':'not-allowed',boxShadow:canCashout?`0 0 20px ${C.green}28`:'none',transition:'all .15s'}}>
                  {revealed.length===0?'Retourne une case…':`💰 Encaisser ${payout.toLocaleString()} jetons`}
                </button>
                {err&&<div style={{marginTop:8,fontSize:11,color:C.red,background:`${C.red}10`,border:`1px solid ${C.red}25`,borderRadius:8,padding:'7px 10px'}}>⚠ {err}</div>}
              </>
            )}
          </div>

          {/* Règles */}
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Règles</div>
            {[
              {icon:'🪙',t:'Retourne des cases',d:'pour trouver des jetons'},
              {icon:'💰',t:'Encaisse quand tu veux',d:'le gain est sécurisé'},
              {icon:'💥',t:'Un Voltorbe touché',d:'= tout est perdu, 0 jetons'},
              {icon:'📈',t:'Plus de mines',d:'= multiplicateurs plus élevés'},
              {icon:'🏆',t:'Toutes les cases sûres',d:'= jackpot maximum'},
            ].map(({icon,t,d})=>(
              <div key={t} style={{display:'flex',gap:8,alignItems:'flex-start',padding:'6px 0',borderBottom:`1px solid ${C.dim}`}}>
                <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
                <div><div style={{fontSize:11,fontWeight:700,color:C.txt}}>{t}</div><div style={{fontSize:10,color:C.muted}}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <LiveFeed/>
    </div>
  )
}
