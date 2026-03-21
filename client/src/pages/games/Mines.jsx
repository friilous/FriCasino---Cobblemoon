import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import BetInput from '../../components/BetInput'
import LiveFeed from '../../components/LiveFeed'

const C = {
  bg:'#06060f', surf1:'#0c0c1e', surf2:'#111128', border:'#1e1e3a',
  gold:'#f0b429', green:'#22c55e', red:'#ef4444', txt:'#e2e2f0', muted:'#44446a', dim:'#1a1a2e',
}

const GRID=25, COLS=5, VOLTORBE_DEX=100
const SPRITE = dex=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`

function drawToken(ctx,x,y,size) {
  const r=size/2
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle='#f0c040'; ctx.shadowColor='#f0c040'; ctx.shadowBlur=8; ctx.fill(); ctx.shadowBlur=0
  ctx.strokeStyle='#ffd060'; ctx.lineWidth=2; ctx.stroke()
  ctx.beginPath(); ctx.arc(x,y,r*.65,0,Math.PI*2); ctx.strokeStyle='#a07020'; ctx.lineWidth=1.5; ctx.stroke()
  ctx.beginPath(); ctx.arc(x,y,r*.35,0,Math.PI*2); ctx.fillStyle='#a07020'; ctx.fill()
  ctx.beginPath(); ctx.arc(x,y,r*.15,0,Math.PI*2); ctx.fillStyle='#f0c040'; ctx.fill()
  ctx.beginPath(); ctx.moveTo(x-r*.35,y); ctx.lineTo(x+r*.35,y); ctx.strokeStyle='#a07020'; ctx.lineWidth=1.5; ctx.stroke()
}

function Cell({ index, state, onClick, disabled }) {
  const canvasRef=useRef(null)
  useEffect(()=>{
    if(state!=='token')return
    const canvas=canvasRef.current; if(!canvas)return
    const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,60,60); drawToken(ctx,30,30,40)
  },[state])

  const base={width:58,height:58,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',
    cursor:disabled?'default':'pointer',transition:'all .15s',position:'relative',overflow:'hidden'}

  if(state==='hidden') return (
    <div onClick={()=>!disabled&&onClick(index)} style={{...base,background:'#101028',border:`1px solid ${C.border}`,
      cursor:disabled?'not-allowed':'pointer'}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.borderColor=C.gold+'60'}}
      onMouseLeave={e=>{if(!disabled)e.currentTarget.style.borderColor=C.border}}>
      <span style={{fontSize:18,opacity:.25,color:C.muted}}>?</span>
    </div>
  )
  if(state==='token') return (
    <div style={{...base,background:`${C.gold}12`,border:`1px solid ${C.gold}40`}}>
      <canvas ref={canvasRef} width={60} height={60} style={{position:'absolute',inset:0}}/>
    </div>
  )
  if(state==='mine') return (
    <div style={{...base,background:`${C.red}25`,border:`2px solid ${C.red}70`,boxShadow:`0 0 16px ${C.red}40`}}>
      <img src={SPRITE(VOLTORBE_DEX)} alt="Voltorbe" style={{width:52,height:52,imageRendering:'pixelated'}}/>
    </div>
  )
  if(state==='mine_other') return (
    <div style={{...base,background:`${C.red}08`,border:`1px solid ${C.red}25`,opacity:.6}}>
      <img src={SPRITE(VOLTORBE_DEX)} alt="Voltorbe" style={{width:48,height:48,imageRendering:'pixelated',filter:'grayscale(.5)'}}/>
    </div>
  )
  return null
}

export default function Mines() {
  const {user,updateBalance}=useAuth()
  const [bet,setBet]=useState(100)
  const [minesCount,setMinesCount]=useState(3)
  const [phase,setPhase]=useState('idle')
  const [revealed,setRevealed]=useState([])
  const [mines,setMines]=useState([])
  const [multiplier,setMultiplier]=useState(1.00)
  const [payout,setPayout]=useState(0)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [history,setHistory]=useState([])
  const [hitMine,setHitMine]=useState(null)

  function getCellState(i) {
    if(['exploded','cashed','won'].includes(phase)){
      if(i===hitMine)return'mine'
      if(mines.includes(i))return'mine_other'
      if(revealed.includes(i))return'token'
    }
    if(revealed.includes(i))return'token'
    return'hidden'
  }

  async function handleStart() {
    if(bet<10||bet>(user?.balance||0))return
    setLoading(true);setError('')
    try{
      const{data}=await axios.post('/api/games/mines',{action:'start',bet,minesCount})
      updateBalance(data.balance);setPhase('playing');setRevealed([]);setMines([]);setMultiplier(1.00);setPayout(0);setHitMine(null)
    }catch(err){setError(err.response?.data?.error||'Erreur réseau')}
    finally{setLoading(false)}
  }

  async function handleReveal(i) {
    if(phase!=='playing'||revealed.includes(i)||loading)return
    setLoading(true)
    try{
      const{data}=await axios.post('/api/games/mines',{action:'reveal',cellIndex:i})
      if(data.status==='exploded'){
        setHitMine(i);setMines(data.mines||[]);setRevealed(p=>[...p,i]);setPhase('exploded');setMultiplier(0);setPayout(0)
        setHistory(p=>[{status:'exploded',bet,payout:0,mines:minesCount},...p].slice(0,8))
      } else {
        setRevealed(p=>[...p,i]);setMultiplier(data.multiplier);setPayout(data.payout)
        if(data.status==='won'){
          setMines(data.mines||[]);setPhase('won');updateBalance(data.balance)
          setHistory(p=>[{status:'won',bet,payout:data.payout,mines:minesCount},...p].slice(0,8))
        }
      }
    }catch(err){setError(err.response?.data?.error||'Erreur réseau')}
    finally{setLoading(false)}
  }

  async function handleCashout() {
    if(phase!=='playing'||revealed.length===0||loading)return
    setLoading(true)
    try{
      const{data}=await axios.post('/api/games/mines',{action:'cashout'})
      setMines(data.mines||[]);setPhase('cashed');setMultiplier(data.multiplier);setPayout(data.payout);updateBalance(data.balance)
      setHistory(p=>[{status:'cashed',bet,payout:data.payout,mines:minesCount},...p].slice(0,8))
    }catch(err){setError(err.response?.data?.error||'Erreur réseau')}
    finally{setLoading(false)}
  }

  const isPlaying=phase==='playing'
  const isDone=['exploded','cashed','won'].includes(phase)
  const canCashout=isPlaying&&revealed.length>0&&!loading
  const statusColor=phase==='exploded'?C.red:C.green
  const firstCaseMult=parseFloat((0.92*(25/(25-minesCount))).toFixed(2))

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'14px',boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Lobby</Link>
        <span style={{color:C.dim}}>/</span>
        <span style={{fontSize:13,color:C.gold,fontWeight:700}}>💣 Mines</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:12,alignItems:'start'}}>

        {/* Panneau gauche */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            {!isPlaying?(
              <>
                <BetInput bet={bet} setBet={setBet} disabled={loading}/>
                <div style={{marginTop:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <label style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Voltorbe</label>
                    <div style={{fontSize:15,fontWeight:800,color:C.red,background:`${C.red}12`,padding:'2px 10px',borderRadius:8,border:`1px solid ${C.red}25`}}>
                      {minesCount}
                    </div>
                  </div>
                  <input type="range" min={1} max={24} value={minesCount} onChange={e=>setMinesCount(parseInt(e.target.value))}
                    style={{width:'100%',accentColor:C.red}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.muted,marginTop:2}}>
                    <span>1 (facile)</span><span>24 (extrême)</span>
                  </div>
                </div>
                <div style={{marginTop:10,padding:'8px 12px',background:'#07071a',border:`1px solid ${C.border}`,
                  borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:C.muted}}>1ère case sûre</span>
                  <span style={{fontSize:13,color:C.gold,fontWeight:700}}>×{firstCaseMult}</span>
                </div>
                {error&&<div style={{marginTop:8,background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}
                <button onClick={handleStart} disabled={loading||bet<10||bet>(user?.balance||0)}
                  style={{width:'100%',marginTop:12,padding:'13px',
                    background:loading?C.dim:C.gold,color:loading?C.muted:'#06060f',
                    fontWeight:800,fontSize:15,borderRadius:10,border:'none',
                    cursor:loading?'not-allowed':'pointer',
                    opacity:loading||bet>(user?.balance||0)?.5:1,
                    boxShadow:`0 0 20px ${C.gold}44`}}>
                  {loading?'Démarrage...':(isDone?'🔄 Nouvelle partie':'💣 Commencer')}
                </button>
              </>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{textAlign:'center',padding:'8px',background:'#07071a',borderRadius:8,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Multiplicateur actuel</div>
                  <div style={{fontSize:28,fontWeight:900,color:C.gold}}>×{multiplier}</div>
                  {revealed.length>0&&<div style={{fontSize:13,color:C.green,marginTop:2,fontWeight:700}}>{payout.toLocaleString()} jetons</div>}
                </div>
                <div style={{fontSize:11,color:C.muted,textAlign:'center'}}>
                  Mise : <span style={{color:C.gold,fontWeight:700}}>{bet.toLocaleString()}</span>
                  {'  ·  '}<span style={{color:C.red}}>{minesCount} 💣</span>
                </div>
                <button onClick={handleCashout} disabled={!canCashout}
                  style={{width:'100%',padding:'13px',
                    background:canCashout?'#0f2a0f':C.dim,
                    color:canCashout?C.green:C.muted,
                    border:`1px solid ${canCashout?C.green+'40':C.border}`,
                    fontWeight:800,fontSize:14,borderRadius:10,cursor:canCashout?'pointer':'not-allowed',
                    boxShadow:canCashout?`0 0 20px ${C.green}25`:'none',transition:'all .15s'}}>
                  {revealed.length===0?'Retourne une case…':`💰 Encaisser ${payout.toLocaleString()} jetons`}
                </button>
                {error&&<div style={{background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:11,borderRadius:8,padding:'8px 12px'}}>⚠️ {error}</div>}
              </div>
            )}
          </div>

          {/* Résultat */}
          {isDone&&(
            <div style={{background:phase==='exploded'?`${C.red}08`:`${C.green}08`,
              border:`1px solid ${statusColor}25`,borderRadius:12,padding:14}}>
              <div style={{fontSize:14,fontWeight:800,color:statusColor,marginBottom:4}}>
                {phase==='exploded'?'💥 Voltorbe ! Tout perdu':phase==='won'?'🏆 Toutes les cases sûres !':` ✅ Encaissé à ×${multiplier}`}
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>
                {revealed.length} case{revealed.length>1?'s':''} · {minesCount} Voltorbe{minesCount>1?'s':''}
              </div>
              <div style={{fontSize:22,fontWeight:900,color:statusColor}}>
                {phase==='exploded'?`−${bet.toLocaleString()}`:`+${(payout-bet).toLocaleString()}`}
              </div>
              <div style={{fontSize:11,color:C.muted}}>jetons</div>
            </div>
          )}

          {/* Historique */}
          {history.length>0&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {history.map((h,i)=>(
                <div key={i} style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
                  background:h.status==='exploded'?`${C.red}12`:`${C.green}12`,
                  color:h.status==='exploded'?C.red:C.green,
                  border:`1px solid ${h.status==='exploded'?C.red+'25':C.green+'25'}`}}>
                  {h.status==='exploded'?'💥':`+${(h.payout-h.bet).toLocaleString()}`}
                </div>
              ))}
            </div>
          )}

          {/* Règles */}
          <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:10,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📋 Comment jouer</div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.9}}>
              <div>🎯 Choisis le nombre de Voltorbe (1–24)</div>
              <div>🪙 Retourne des cases pour trouver des jetons</div>
              <div>💰 Encaisse quand tu veux pour empocher</div>
              <div>💥 Un Voltorbe touché = tout est perdu</div>
              <div>📈 Plus de mines = multiplicateurs plus élevés</div>
            </div>
          </div>

          <LiveFeed compact/>
        </div>

        {/* Grille */}
        <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:900,color:C.gold,letterSpacing:3}}>MINES</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Grille 5×5 · Évite les Voltorbe</div>
          </div>

          {isPlaying&&revealed.length>0&&(
            <div style={{background:`${C.gold}08`,border:`1px solid ${C.gold}20`,borderRadius:10,
              padding:'8px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:11,color:C.muted}}>{revealed.length} case{revealed.length>1?'s':''} retournée{revealed.length>1?'s':''}</div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{color:C.gold,fontWeight:700,fontSize:13}}>×{multiplier}</span>
                <span style={{color:C.green,fontWeight:800,fontSize:13}}>{payout.toLocaleString()} jetons</span>
              </div>
            </div>
          )}

          <div style={{background:'#080814',border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,58px)',gap:7,justifyContent:'center'}}>
              {Array.from({length:GRID},(_,i)=>(
                <Cell key={i} index={i} state={getCellState(i)} onClick={handleReveal} disabled={!isPlaying||loading}/>
              ))}
            </div>
          </div>

          {phase==='idle'&&(
            <div style={{textAlign:'center',padding:'20px 0',fontSize:12,color:C.muted}}>
              Configure ta mise à gauche et lance la partie !
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes tokenReveal{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes explode{0%{transform:scale(1)}30%{transform:scale(1.3)}100%{transform:scale(1)}}
      `}</style>
    </div>
  )
}
