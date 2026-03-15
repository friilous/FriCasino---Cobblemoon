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
    color: 'from-yellow-600/20 to-orange-600/20',
    border: 'border-yellow-500/30',
  },
  {
    id: 'plinko',
    name: 'Plinko',
    emoji: '🪀',
    desc: 'Choisissez votre niveau de risque, lâchez la balle et regardez-la rebondir.',
    rtp: 95,
    jackpot: "Misez 100 → gagnez jusqu'à 3 060 en risque élevé",
    color: 'from-blue-600/20 to-purple-600/20',
    border: 'border-blue-500/30',
  },
  {
    id: 'roulette',
    name: 'Roulette Pokémon',
    emoji: '🎡',
    desc: 'Misez sur une catégorie de types Pokémon. Méfiez-vous du Magicarpe !',
    rtp: 93.8,
    jackpot: 'Misez 100 → gagnez 1 500 sur Légendaire ✨',
    color: 'from-pink-600/20 to-red-600/20',
    border: 'border-pink-500/30',
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-casino-bg">

      {/* ── Disclaimer — visible immédiatement en haut ── */}
      <div className="bg-yellow-500/8 border-b border-yellow-500/20 px-4 py-3">
        <p className="max-w-4xl mx-auto text-center text-yellow-400/80 text-xs leading-relaxed">
          ⚠️{' '}
          <span className="font-semibold text-yellow-400">Fri'Casino est un projet personnel de Frilous</span>,{' '}
          <span className="font-bold text-yellow-300 bg-yellow-500/15 px-1 rounded">sans aucun lien avec le staff ou l'équipe CobbleMoon</span>.{' '}
          En cas de problème,{' '}
          <span className="font-bold text-red-400 bg-red-500/15 px-1 rounded">ne contactez pas le staff CobbleMoon — ils ne peuvent pas vous aider</span>.{' '}
          Contactez{' '}
          <span className="text-yellow-400 font-semibold">Frilous</span> directement sur Minecraft
          ou{' '}
          <span className="text-yellow-400 font-semibold">.Frilous</span> sur Discord.
          {' '}· Aucun argent réel — jetons virtuels sans valeur monétaire.
        </p>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-casino-purple/10 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="text-6xl mb-4 animate-float inline-block">🎰</div>
          <h1 className="font-casino text-5xl md:text-6xl font-black text-gradient mb-3">
            Fri'Casino
          </h1>
          <p className="text-gray-300 text-xl mb-2 font-medium">
            Le casino Pokémon fait par des joueurs, pour des joueurs
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Demandez vos jetons à Frilous en jeu sur CobbleMoon et tentez votre chance
          </p>
          {user ? (
            <Link to="/casino" className="btn-gold text-lg px-8 py-3 inline-block">
              Jouer maintenant →
            </Link>
          ) : (
            <Link to="/login" className="btn-gold text-lg px-8 py-3 inline-block">
              Se connecter pour jouer
            </Link>
          )}
        </div>
      </section>

      {/* ── Games ── */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <h2 className="font-casino text-3xl font-bold text-center text-white mb-10">
          Nos <span className="text-gradient">Jeux</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {GAMES.map(game => (
            <div key={game.id} className={`card bg-gradient-to-br ${game.color} border ${game.border} hover:scale-105 transition-transform cursor-pointer group`}>
              <Link to={user ? `/casino/${game.id}` : '/login'}>
                <div className="text-5xl mb-4 group-hover:animate-float inline-block">{game.emoji}</div>
                <h3 className="font-casino text-xl font-bold text-white mb-2">{game.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{game.desc}</p>
                <div className="text-xs text-casino-gold/80 mb-3 bg-casino-gold/5 border border-casino-gold/15 rounded-lg px-3 py-2">
                  🏆 {game.jackpot}
                </div>
                <div className="flex items-center justify-between">
                  <span className="badge-gold">RTP {game.rtp}%</span>
                  <span className="text-casino-gold text-sm font-medium">Jouer →</span>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* ── C'est quoi le RTP ? ── */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="card border border-blue-500/20 bg-blue-500/5 text-center">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="text-white font-semibold mb-2">C'est quoi le RTP ?</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Le <span className="text-white font-semibold">RTP (Return To Player)</span> indique
              le pourcentage de vos mises que le jeu vous rend en moyenne sur le long terme.
              Un RTP de <span className="text-casino-gold font-semibold">94%</span> signifie que
              pour 100 jetons misés, vous récupérez en moyenne 94 jetons.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              C'est une moyenne calculée sur des milliers de parties — sur une seule session vous pouvez
              gagner beaucoup plus ou perdre davantage.
            </p>
          </div>
        </div>

        {/* ── Live feed ── */}
        <div className="max-w-2xl mx-auto mb-12">
          <LiveFeed />
        </div>

        {/* ── Info cards ── */}
        <div className="grid md:grid-cols-3 gap-4 text-center">
          {[
            {
              icon: '🔒',
              title: 'Équitable & Transparent',
              desc: 'RTP affiché sur chaque jeu. Résultats calculés côté serveur, jamais manipulés.',
            },
            {
              icon: '🎮',
              title: 'Jetons gratuits',
              desc: "Aucun achat réel — demande tes jetons à Frilous directement en jeu sur CobbleMoon.",
            },
            {
              icon: '💬',
              title: 'Un problème ?',
              desc: 'Contacte Frilous sur Minecraft ou .Frilous sur Discord. Ne contacte pas le staff CobbleMoon.',
            },
          ].map(item => (
            <div key={item.title} className="card text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <h4 className="text-white font-semibold mb-1">{item.title}</h4>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}