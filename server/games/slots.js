const SYMBOLS = [
  { id: 'mew',        label: 'Mew',        emoji: '✨', weight: 2,  isWild: true  },
  { id: 'masterball', label: 'Master Ball', emoji: '🔵', weight: 3,  isWild: false },
  { id: 'dragon',     label: 'Dragon',      emoji: '🐉', weight: 5,  isWild: false },
  { id: 'dark',       label: 'Ténèbres',    emoji: '🌑', weight: 8,  isWild: false },
  { id: 'psychic',    label: 'Psy',         emoji: '🔮', weight: 10, isWild: false },
  { id: 'electric',   label: 'Électrik',    emoji: '⚡', weight: 14, isWild: false },
  { id: 'fire',       label: 'Feu',         emoji: '🔥', weight: 18, isWild: false },
  { id: 'water',      label: 'Eau',         emoji: '💧', weight: 18, isWild: false },
  { id: 'grass',      label: 'Plante',      emoji: '🌿', weight: 22, isWild: false },
  { id: 'magikarp',   label: 'Magicarpe',   emoji: '🐟', weight: 28, isWild: false },
];
const PAYOUTS_3 = { masterball:261.5, dragon:104.5, dark:52.5, psychic:26, electric:14, fire:6, water:6, grass:6, magikarp:0.5 };
const PAYOUTS_2 = { masterball:26, dragon:10.5, dark:6.5, psychic:4, electric:2.5, fire:2, water:2, grass:2, magikarp:0 };
const TOTAL_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
function spinReel() { let r=Math.random()*TOTAL_WEIGHT; for(const sym of SYMBOLS){r-=sym.weight;if(r<=0)return sym} return SYMBOLS[SYMBOLS.length-1]; }
function isWild(sym) { return sym.isWild===true; }
function resolveLine(line) {
  const [s0,s1,s2]=line; const nonWilds=line.filter(s=>!isWild(s)); const wilds=line.length-nonWilds.length;
  if(wilds===3)return{winSymId:null,multiplier:0,winType:null,hasWild:true};
  const eff=(a,b)=>a.id===b.id||isWild(a)||isWild(b);
  if(eff(s0,s1)&&eff(s1,s2)&&eff(s0,s2)){const realSym=nonWilds[0];if(!realSym)return{winSymId:null,multiplier:0,winType:null,hasWild:true};const multiplier=PAYOUTS_3[realSym.id]??0;return{winSymId:realSym.id,multiplier,winType:'3x',hasWild:wilds>0};}
  if(wilds===1&&nonWilds.length===2&&nonWilds[0].id!==nonWilds[1].id){const[a,b]=nonWilds;const pa=PAYOUTS_2[a.id]??0;const pb=PAYOUTS_2[b.id]??0;const multiplier=Math.min(pa,pb);const weakest=pa<=pb?a:b;if(multiplier>0)return{winSymId:weakest.id,multiplier,winType:'2x',hasWild:true};return{winSymId:null,multiplier:0,winType:null,hasWild:true};}
  const pairs=[[s0,s1],[s1,s2],[s0,s2]];let bestMult=0,bestSymId=null,bestHasWild=false;
  for(const[a,b]of pairs){let symId=null,hw=false;if(!isWild(a)&&!isWild(b)&&a.id===b.id){symId=a.id;}else if(isWild(a)&&!isWild(b)){symId=b.id;hw=true;}else if(isWild(b)&&!isWild(a)){symId=a.id;hw=true;}if(symId){const mult=PAYOUTS_2[symId]??0;if(mult>bestMult){bestMult=mult;bestSymId=symId;bestHasWild=hw;}}}
  if(bestMult>0)return{winSymId:bestSymId,multiplier:bestMult,winType:'2x',hasWild:bestHasWild};
  return{winSymId:null,multiplier:0,winType:null,hasWild:false};
}
function play(bet){
  const reels=[[spinReel(),spinReel(),spinReel()],[spinReel(),spinReel(),spinReel()],[spinReel(),spinReel(),spinReel()]];
  const line=[reels[0][1],reels[1][1],reels[2][1]];
  const{winSymId,multiplier,winType,hasWild}=resolveLine(line);
  const payout=multiplier>0?Math.floor(bet*multiplier):0;
  return{reels:reels.map(r=>r.map(s=>({id:s.id,label:s.label,emoji:s.emoji,isWild:s.isWild}))),line:line.map(s=>({id:s.id,label:s.label,emoji:s.emoji,isWild:s.isWild})),winSymId,multiplier,payout,winType,hasWild,isWin:payout>0};
}
module.exports={play,SYMBOLS,PAYOUTS_3,PAYOUTS_2};
