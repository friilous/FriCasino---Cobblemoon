import { Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const C={bg:'#06060f',surf:'#0c0c1e',border:'#1e1e3a',txt:'#e2e2f0',muted:'#44446a',dim:'#12121f'}

const GAMES=[
  {
    path:'/casino/slots',id:'slots',
    name:'Slot Machine',icon:'🎰',color:'#f0c040',
    hook:'Aligne les Pokémon. Mew est Wild.',
    max:'Jackpot ×261.5',
  },
  {
    path:'/casino/blackjack',id:'blackjack',
    name:'Blackjack',icon:'🃏',color:'#4080f0',
    hook:'Bats le dealer sans dépasser 21.',
    max:'Blackjack ×2.2',
  },
  {
    path:'/casino/crash',id:'crash',
    name:'Crash',icon:'📈',color:'#f04040',
    hook:'Encaisse avant que tout s\'effondre.',
    max:'Jusqu\'à ×150',
  },
  {
    path:'/casino/mines',id:'mines',
    name:'Mines',icon:'💣',color:'#40f080',
    hook:'Chaque case safe fait monter le gain.',
    max:'×100+ possible',
  },
  {
    path:'/casino/roulette',id:'roulette',
    name:'Roulette Pokémon',icon:'🎡',color:'#c040f0',
    hook:'Mise sur un type. La roue décide.',
    max:'Légendaire ×14.0',
  },
  {
    path:'/casino/plinko',id:'plinko',
    name:'Plinko',icon:'⚪',color:'#a040f0',
    hook:'Lâche la Poké Ball. Regarde-la tomber.',
    max:'Jackpot ×37.5',
  },
]

export default function Machines(){
  const {gameSettings}=useSocket()
  return(
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px',boxSizing:'border-box'}}>

      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <Link to="/casino" style={{fontSize:11,color:C.muted,textDecoration:'none'}}>← Accueil</Link>
          <span style={{color:C.dim}}>/</span>
          <span style={{fontSize:11,color:'#9898b8'}}>Machines</span>
        </div>
        <h1 style={{fontSize:28,fontWeight:900,color:C.txt,margin:'0 0 6px',letterSpacing:1}}>Nos machines</h1>
        <p style={{fontSize:12,color:C.muted,margin:0}}>Choisis ton jeu · Mise min. 10 — max. 10 000 jetons</p>
      </div>

      {/* Grille 2 colonnes */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,maxWidth:900}}>
        {GAMES.map(g=>{
          const enabled=gameSettings[g.id]!==false
          const card=(
            <div
              style={{background:C.surf,border:`1px solid ${enabled?g.color+'28':C.border}`,borderRadius:16,overflow:'hidden',opacity:enabled?1:.5,cursor:enabled?'pointer':'default',transition:'border-color .2s,box-shadow .2s,transform .15s'}}
              onMouseEnter={e=>{if(!enabled)return;e.currentTarget.style.borderColor=g.color+'70';e.currentTarget.style.boxShadow=`0 0 28px ${g.color}18`;e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=enabled?g.color+'28':C.border;e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none'}}
            >
              {/* Ligne couleur top */}
              <div style={{height:3,background:enabled?g.color:C.dim}}/>

              <div style={{padding:'18px 20px',display:'flex',alignItems:'center',gap:16}}>
                {/* Icône */}
                <div style={{width:56,height:56,borderRadius:14,background:g.color+'18',border:`1px solid ${g.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>
                  {g.icon}
                </div>

                {/* Texte */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:15,fontWeight:800,color:C.txt}}>{g.name}</span>
                    {!enabled&&<span style={{fontSize:9,padding:'2px 6px',borderRadius:5,background:`${C.muted}20`,color:C.muted,border:`1px solid ${C.muted}25`}}>🔧 Maintenance</span>}
                  </div>
                  <div style={{fontSize:12,color:g.color,fontWeight:600,marginBottom:6}}>{g.hook}</div>
                  <div style={{fontSize:10,color:C.muted}}>Max · <span style={{color:C.txt,fontWeight:600}}>{g.max}</span></div>
                </div>

                {/* Flèche */}
                {enabled&&<div style={{fontSize:18,color:g.color,flexShrink:0,opacity:.8}}>→</div>}
              </div>
            </div>
          )
          if(!enabled)return<div key={g.id}>{card}</div>
          return<Link key={g.id} to={g.path} style={{textDecoration:'none'}}>{card}</Link>
        })}
      </div>

      <p style={{marginTop:24,fontSize:10,color:C.muted,textAlign:'center'}}>
        Générateur aléatoire équitable · Gains distribués instantanément · Mise min. 10 jetons
      </p>
    </div>
  )
}
