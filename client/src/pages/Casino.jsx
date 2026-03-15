import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LiveFeed from '../components/LiveFeed'

const GAMES = [
  {
    id: 'slots',
    name: 'Slot Machine',
    emoji: '🎰',
    desc: 'Alignez 3 symboles Pokémon identiques sur la ligne du milieu.',
    rtp: 94,
    jackpot: 'Misez 100 → gagnez 25 600 avec la Master Ball',
    gradient: 'from-yellow-900/40 to-orange-900/40',
    border: 'border-yellow-500/40',
    glow: 'hover:shadow-yellow-500/20',
  },
  {
    id: 'plinko',
    name: 'Plinko',
    emoji: '🪀',
    desc: 'Choisissez votre niveau de risque, lâchez la balle et regardez-la rebondir.',
    rtp: 95,
    jackpot: "Misez 100 → gagnez jusqu'à 3 060 en risque élevé",
    gradient: 'from-blue-900/40 to-violet-900/40',
    border: 'border-blue-500/40',
    glow: 'hover:shadow-blue-500/20',
  },
  {
    id: 'roulette',
    name: 'Roulette Pokémon',
    emoji: '🎡',
    desc: 'Misez sur une catégorie de types Pokémon. Méfiez-vous du Magicarpe !',
    rtp: 93.8,
    jackpot: 'Misez 100 → gagnez 1 500 sur Légendaire ✨',
    gradient: 'from-pink-900/40 to-red-900/40',
    border: 'border-pink-500/40',
    glow: 'hover:shadow-pink-500/20',
  },
]

export default function Casino() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-casino-bg py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-casino text-4xl font-black text-gradient mb-2">Fri'Casino</h1>
          <p className="text-gray-400 text-sm mb-1">
            Solde disponible :
            <span className="text-casino-gold font-bold text-lg ml-2">
              {(user?.balance || 0).toLocaleString()} jetons
            </span>
          </p>
          <p className="text-gray-600 text-xs">
            Besoin de jetons ? Demande à
            <span className="text-casino-gold/70 font-semibold mx-1">Frilous</span>
            en jeu · Problème ?
            <span className="text-casino-gold/70 font-semibold ml-1">.Frilous</span> sur Discord
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">

          {/* Games */}
          <div className="lg:col-span-2 grid sm:grid-cols-1 gap-4">
            {GAMES.map(game => (
              <Link
                key={game.id}
                to={`/casino/${game.id}`}
                className={`card bg-gradient-to-br ${game.gradient} border ${game.border}
                           hover:scale-[1.02] transition-all duration-200 hover:shadow-xl ${game.glow}
                           group flex items-center gap-6`}
              >
                <div className="text-6xl group-hover:animate-float shrink-0">{game.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-casino text-xl font-bold text-white">{game.name}</h2>
                    <span className="badge-gold">RTP {game.rtp}%</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{game.desc}</p>
                  <div className="text-xs text-casino-gold/70">
                    🏆 {game.jackpot}
                  </div>
                </div>
                <div className="text-casino-gold text-2xl group-hover:translate-x-1 transition-transform shrink-0">→</div>
              </Link>
            ))}
          </div>

          {/* Live feed sidebar */}
          <div>
            <LiveFeed />
          </div>
        </div>

        {/* Info bar */}
        <div className="card bg-casino-card/60 border-casino-gold/20 mb-4">
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <div>🎲 Mise min/max : <span className="text-white">10 — 10 000 jetons</span></div>
            <div>🎁 Jetons : <span className="text-white">gratuits, demande à Frilous en jeu</span></div>
            <div>📊 <span className="text-white">RTP</span> = % de tes mises récupérées en moyenne</div>
            <div>🔐 Résultats aléatoires côté serveur</div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="card border border-yellow-500/15 bg-yellow-500/5">
          <p className="text-yellow-400/60 text-xs text-center leading-relaxed">
            ⚠️ Fri'Casino est un projet <span className="font-semibold text-yellow-400/80">indépendant du staff CobbleMoon</span> — en cas de problème,
            ne faites pas de ticket, contactez{' '}
            <span className="text-yellow-400/80 font-semibold">Frilous</span> sur Minecraft
            ou <span className="text-yellow-400/80 font-semibold">.Frilous</span> sur Discord.
            Aucun argent réel impliqué.
          </p>
        </div>

      </div>
    </div>
  )
}