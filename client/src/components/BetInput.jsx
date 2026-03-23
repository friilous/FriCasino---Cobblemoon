import { useAuth } from '../contexts/AuthContext'

export default function BetInput({ bet, setBet, min = 10, max = 10000, disabled }) {
  const { user } = useAuth()
  const presets  = [50, 100, 500, 1000, 5000]

  function handleChange(e) {
    const val = Math.min(max, Math.max(0, parseInt(e.target.value) || 0))
    setBet(val)
  }

  const s = {
    label: {
      fontSize: 11, color: '#5a5a8a', textTransform: 'uppercase',
      letterSpacing: 1, display: 'block', marginBottom: 8,
    },
    input: {
      width: '100%', background: '#07071a',
      border: '1px solid #2a2a4a', borderRadius: 8,
      padding: '10px 14px', color: '#f0c040',
      fontSize: 18, fontWeight: 800, textAlign: 'center',
      outline: 'none', boxSizing: 'border-box',
      opacity: disabled ? 0.5 : 1,
    },
    presetRow: {
      display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8,
    },
    preset: (active, disabled) => ({
      fontSize: 11, padding: '4px 10px', borderRadius: 6,
      background: active ? 'rgba(240,192,64,0.15)' : '#0f0f28',
      border: `1px solid ${active ? 'rgba(240,192,64,0.4)' : '#1e1e40'}`,
      color: active ? '#f0c040' : '#5a5a8a',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.35 : 1,
      transition: 'all 0.15s',
    }),
    max: {
      fontSize: 11, padding: '4px 10px', borderRadius: 6,
      background: 'rgba(240,192,64,0.12)',
      border: '1px solid rgba(240,192,64,0.3)',
      color: '#f0c040', fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.35 : 1,
    },
    info: {
      display: 'flex', justifyContent: 'space-between',
      fontSize: 10, color: '#2e2e50', marginTop: 8,
    },
  }

  return (
    <div>
      <label style={s.label}>Mise</label>
      <input
        type="number"
        value={bet}
        onChange={handleChange}
        min={min}
        max={max}
        disabled={disabled}
        style={s.input}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#f0c040' }}
        onBlur={e => e.target.style.borderColor = '#2a2a4a'}
      />
      <div style={s.presetRow}>
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setBet(Math.min(p, user?.balance || 0))}
            disabled={disabled || (user?.balance || 0) < p}
            style={s.preset(bet === p, disabled || (user?.balance || 0) < p)}
          >
            {p.toLocaleString()}
          </button>
        ))}
        <button
          onClick={() => setBet(Math.min(user?.balance || 0, max))}
          disabled={disabled}
          style={s.max}
        >
          MAX
        </button>
      </div>
      <div style={s.info}>
        <span>Min : {min.toLocaleString()}</span>
        <span>Solde : <span style={{ color: '#f0c040', fontWeight: 700 }}>{(user?.balance || 0).toLocaleString()}</span></span>
        <span>Max : {max.toLocaleString()}</span>
      </div>
    </div>
  )
}
