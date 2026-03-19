import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

const GAME_ICONS = { slots: '🎰', plinko: '🪀', roulette: '🎯', crash: '📈', blackjack: '🃏', mines: '💣' }

const INFO_STEPS = [
  {
    icon: '🎮',
    title: 'Joue sur Cobblemon',
    desc: 'Gagne des Pokédollars en jeu sur le serveur CobbleMoon.',
    color: '#40f080',
  },
  {
    icon: '💬',
    title: 'Contacte Frilous',
    desc: 'Envoie tes Pokédollars à Frilous en jeu. Il crédite ton compte en jetons (1 jeton = 1 ₽).',
    color: '#f0c040',
  },
  {
    icon: '🎰',
    title: 'Joue au casino',
    desc: 'Mise tes jetons sur les machines disponibles. Mise min 10, max 10 000 jetons.',
    color: '#c040f0',
  },
  {
    icon: '💸',
    title: 'Retire tes gains',
    desc: 'Demande un retrait depuis ton profil. Frilous te verse les Pokédollars en jeu.',
    color: '#4080f0',
  },
]

const RULES = [
  { label: 'Mise minimum',    value: '10 jetons',        icon: '⬇️' },
  { label: 'Mise maximum',    value: '10 000 jetons',    icon: '⬆️' },
  { label: 'Retrait minimum', value: '100 jetons',       icon: '💸' },
  { label: 'Retrait max/jour','value': 'Illimité',       icon: '✅' },
  { label: 'Support',         value: '.Frilous (Discord)', icon: '💬' },
  { label: 'Problème ?',      value: 'Contact Frilous, pas le staff', icon: '⚠️' },
]

export default function Casino() {
  const { user } = useAuth()
  const { liveFeed, gameSettings } = useSocket()

  const activeGames = Object.entries(gameSettings).filter(([, v]) => v).length
  const totalGames  = Object.keys(gameSettings).length

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: '#07071a' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#d8d8f0', margin: '0 0 4px' }}>
          Bienvenue, <span style={{ color: '#f0c040' }}>{user?.username}</span> 👋
        </h1>
        <p style={{ fontSize: 12, color: '#44446a', margin: 0 }}>
          Casino indépendant pour le serveur Minecraft <span style={{ color: '#9898b8' }}>CobbleMoon</span>
        </p>
      </div>

      {/* Bannière statut */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20,
      }}>
        <StatCard icon="🪙" label="Ton solde" value={`${(user?.balance || 0).toLocaleString()} jetons`} color="#f0c040" />
        <StatCard icon="🎮" label="Machines actives" value={`${activeGames} / ${totalGames}`} color="#40f080" />
        <StatCard icon="🎯" label="Mise max jackpot" value="×190 ta mise" color="#c040f0" />
      </div>

      {/* Comment ça marche */}
      <div style={{
        background: '#0a0a20', border: '1px solid #1e1e40',
        borderRadius: 12, padding: '18px 20px', marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: '0 0 16px' }}>
          🚀 Comment jouer
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {INFO_STEPS.map((step, i) => (
            <div key={i} style={{
              background: '#07071a', border: '1px solid #1e1e40',
              borderRadius: 10, padding: '14px 12px', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 10, right: 10,
                width: 18, height: 18, borderRadius: '50%',
                background: step.color + '20', border: `1px solid ${step.color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: step.color, fontWeight: 800,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{step.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: step.color, marginBottom: 4 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 10, color: '#44446a', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Règles & infos */}
        <div style={{
          background: '#0a0a20', border: '1px solid #1e1e40',
          borderRadius: 12, padding: '18px 20px',
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: '0 0 14px' }}>
            📋 Règles & Limites
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RULES.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0',
                borderBottom: i < RULES.length - 1 ? '1px solid #12122a' : 'none',
              }}>
                <span style={{ fontSize: 11, color: '#5a5a8a' }}>
                  {r.icon} {r.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#d8d8f0' }}>{r.value}</span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 14, padding: '10px 12px',
            background: 'rgba(240,192,64,0.05)', border: '1px solid rgba(240,192,64,0.12)',
            borderRadius: 8, fontSize: 10, color: '#555540', lineHeight: 1.6,
          }}>
            ⚠️ Projet indépendant de Frilous — sans lien avec le staff CobbleMoon.
            En cas de problème, contactez <span style={{ color: '#f0c040' }}>Frilous</span> uniquement.
          </div>

          {/* Bouton accès machines */}
          <Link to="/machines" style={{ textDecoration: 'none', display: 'block', marginTop: 14 }}>
            <div style={{
              background: '#f0c040', color: '#07071a',
              fontWeight: 800, fontSize: 13, padding: '11px',
              borderRadius: 8, textAlign: 'center',
              cursor: 'pointer',
            }}>
              🎰 Accéder aux machines →
            </div>
          </Link>
        </div>

        {/* Live feed */}
        <div style={{
          background: '#0a0a20', border: '1px solid #1e1e40',
          borderRadius: 12, padding: '18px 20px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: '#40f080',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }} />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#d8d8f0', margin: 0 }}>
              Activité en direct
            </h2>
          </div>

          {liveFeed.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#2e2e55', fontSize: 12,
            }}>
              Aucune activité — sois le premier !
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {liveFeed.slice(0, 10).map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: '#07071a',
                  borderRadius: 7,
                  border: e.payout > e.bet * 3 ? '1px solid rgba(240,192,64,0.2)' : '1px solid #12122a',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{GAME_ICONS[e.game] || '🎲'}</span>
                    <div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#c8c8e8',
                        cursor: 'pointer',
                      }}>
                        {e.username}
                      </span>
                      <span style={{ fontSize: 10, color: '#44446a', marginLeft: 6 }}>
                        mise {e.bet?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: e.payout > e.bet ? '#40f080' : '#f06060',
                    }}>
                      {e.payout > e.bet
                        ? `+${(e.payout - e.bet).toLocaleString()}`
                        : `-${e.bet?.toLocaleString()}`}
                    </div>
                    {e.bet_id && (
                      <div style={{ fontSize: 9, color: '#2e2e50' }}>{e.bet_id}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link to="/classement" style={{
            textDecoration: 'none', marginTop: 12,
            display: 'block', textAlign: 'center',
            fontSize: 11, color: '#44446a',
            padding: '8px',
            borderTop: '1px solid #12122a',
          }}>
            🏆 Voir le classement →
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: '#0a0a20', border: `1px solid ${color}22`,
      borderRadius: 10, padding: '12px 16px',
    }}>
      <div style={{ fontSize: 9, color: '#44446a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
