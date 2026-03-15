import { useAuth } from '../contexts/AuthContext'

export default function BetInput({ bet, setBet, min = 10, max = 10000, disabled }) {
  const { user } = useAuth()
  const presets = [50, 100, 500, 1000, 5000]

  function handleChange(e) {
    const val = Math.min(max, Math.max(0, parseInt(e.target.value) || 0))
    setBet(val)
  }

  return (
    <div className="space-y-3">
      <label className="text-sm text-gray-400 font-medium">Mise</label>
      <div className="flex gap-2">
        <input
          type="number"
          value={bet}
          onChange={handleChange}
          min={min}
          max={max}
          disabled={disabled}
          className="input-field text-center text-lg font-bold text-casino-gold"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setBet(Math.min(p, user?.balance || 0))}
            disabled={disabled || (user?.balance || 0) < p}
            className="text-xs bg-casino-bg border border-casino-border rounded px-2 py-1
                       hover:border-casino-gold hover:text-casino-gold transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {p.toLocaleString()}
          </button>
        ))}
        <button
          onClick={() => setBet(Math.min(user?.balance || 0, max))}
          disabled={disabled}
          className="text-xs bg-casino-gold/20 text-casino-gold border border-casino-gold/40 
                     rounded px-2 py-1 hover:bg-casino-gold/30 transition-colors
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          MAX
        </button>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Min : {min.toLocaleString()}</span>
        <span>Solde : <span className="text-casino-gold font-bold">{(user?.balance || 0).toLocaleString()}</span></span>
        <span>Max : {max.toLocaleString()}</span>
      </div>
    </div>
  )
}
