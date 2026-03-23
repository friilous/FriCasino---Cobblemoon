import { useAuth } from '../contexts/AuthContext'

export default function BetInput({ bet, setBet, min = 10, max = 10000, disabled }) {
  const { user } = useAuth()
  const presets = [50, 100, 500, 1000, 5000]
  const balance = user?.balance || 0

  function handleChange(e) {
    const val = Math.min(max, Math.max(0, parseInt(e.target.value) || 0))
    setBet(val)
  }

  return (
    <div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(240,180,41,0.5)', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
        Mise
      </div>

      {/* Input principal */}
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          value={bet}
          onChange={handleChange}
          min={min}
          max={max}
          disabled={disabled}
          style={{
            width: '100%',
            background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(240,180,41,0.06)',
            border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : 'rgba(240,180,41,0.25)'}`,
            borderRadius: 10,
            padding: '10px 40px 10px 14px',
            color: '#FFD700',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 20, fontWeight: 700,
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: disabled ? 0.5 : 1,
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { if (!disabled) { e.target.style.borderColor = 'rgba(240,180,41,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(240,180,41,0.1)' } }}
          onBlur={e => { e.target.style.borderColor = disabled ? 'rgba(255,255,255,0.08)' : 'rgba(240,180,41,0.25)'; e.target.style.boxShadow = 'none' }}
        />
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 12, color: 'rgba(240,180,41,0.4)',
          fontFamily: 'Cinzel, serif',
          pointerEvents: 'none',
        }}>✦</span>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
        {presets.map(p => {
          const isActive = bet === p
          const isAffordable = balance >= p && !disabled
          return (
            <button
              key={p}
              onClick={() => setBet(Math.min(p, balance))}
              disabled={!isAffordable}
              style={{
                fontSize: 10, padding: '4px 9px', borderRadius: 6,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                background: isActive ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? 'rgba(240,180,41,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? '#FFD700' : 'rgba(245,230,200,0.35)',
                cursor: isAffordable ? 'pointer' : 'not-allowed',
                opacity: isAffordable ? 1 : 0.3,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (isAffordable && !isActive) e.currentTarget.style.borderColor = 'rgba(240,180,41,0.3)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              {p >= 1000 ? `${p/1000}k` : p}
            </button>
          )
        })}
        <button
          onClick={() => setBet(Math.min(balance, max))}
          disabled={disabled || balance === 0}
          style={{
            fontSize: 10, padding: '4px 9px', borderRadius: 6,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            background: 'rgba(196,30,58,0.12)',
            border: '1px solid rgba(196,30,58,0.3)',
            color: '#E8556A',
            cursor: disabled || balance === 0 ? 'not-allowed' : 'pointer',
            opacity: disabled || balance === 0 ? 0.3 : 1,
            marginLeft: 'auto',
          }}
        >
          MAX
        </button>
      </div>

      {/* Infos min/solde/max */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 9, color: 'rgba(245,230,200,0.25)',
        fontFamily: 'JetBrains Mono, monospace',
        marginTop: 6,
      }}>
        <span>Min {min.toLocaleString('fr-FR')}</span>
        <span style={{ color: 'rgba(240,180,41,0.5)' }}>
          Solde: <span style={{ color: '#F0B429', fontWeight: 700 }}>{balance.toLocaleString('fr-FR')}</span> ✦
        </span>
        <span>Max {max.toLocaleString('fr-FR')}</span>
      </div>
    </div>
  )
}
