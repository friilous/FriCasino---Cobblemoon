import { useAuth } from '../contexts/AuthContext'

export default function BetInput({ bet, setBet, min=10, max=10000, disabled }) {
  const { user } = useAuth()
  const bal = user?.balance || 0
  const presets = [50,100,500,1000,5000]

  return (
    <div>
      <div className="field-label">Mise</div>
      <input
        type="number" className="bet-field" style={{ fontSize:18, padding:'9px 12px' }}
        value={bet} min={min} max={max} disabled={disabled}
        onChange={e => setBet(Math.min(max, Math.max(0, parseInt(e.target.value)||0)))}
      />
      <div className="presets" style={{ marginTop:6 }}>
        {presets.map(p => (
          <button
            key={p}
            className={`preset-btn${bet===p?' active':''}`}
            disabled={disabled || bal < p}
            onClick={() => setBet(Math.min(p, bal, max))}
          >
            {p >= 1000 ? `${p/1000}k` : p}
          </button>
        ))}
        <button
          className="preset-btn max"
          disabled={disabled || bal === 0}
          onClick={() => setBet(Math.min(bal, max))}
          style={{ marginLeft:'auto' }}
        >
          MAX
        </button>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#5b3fa0', fontFamily:'Orbitron,monospace', marginTop:4 }}>
        <span>Min {min}</span>
        <span style={{ color:'#6d28d9' }}>Solde: <span style={{ color:'#fbbf24', fontWeight:700 }}>{bal.toLocaleString('fr-FR')}</span></span>
        <span>Max {max.toLocaleString('fr-FR')}</span>
      </div>
    </div>
  )
}
