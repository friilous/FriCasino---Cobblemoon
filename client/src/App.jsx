import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider, useSocket } from './contexts/SocketContext'
import { getRankFromWagered } from './utils/ranks'

// Pages
import Login        from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Casino       from './pages/Casino'
import Machines     from './pages/Machines'
import Classement   from './pages/Classement'
import Profile      from './pages/Profile'
import PublicProfile from './pages/PublicProfile'
import SuperJackpot from './pages/SuperJackpot'
import RoueDuJour   from './pages/RoueDuJour'
import Admin        from './pages/Admin'
import Slots        from './pages/games/Slots'
import Blackjack    from './pages/games/Blackjack'
import Mines        from './pages/games/Mines'
import Roulette     from './pages/games/Roulette'
import Plinko       from './pages/games/Plinko'
import GameGuard    from './components/GameGuard'
import { RANKS, getRankFromWagered as getRank, getNextRank as getNext, getXPProgress as getXP } from './utils/ranks'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || ''

const NAV = [
  { section: 'Hall' },
  { to: '/casino',       icon: '🏠', label: 'Accueil' },
  { to: '/machines',     icon: '🎮', label: 'Machines' },
  { to: '/classement',   icon: '🏆', label: 'Classement' },
  { section: 'Jeux' },
  { to: '/casino/slots',     icon: '🎰', label: 'Slots',     badge: 'HOT' },
  { to: '/casino/blackjack', icon: '🃏', label: 'Blackjack' },
  { to: '/casino/mines',     icon: '💣', label: 'Mines' },
  { to: '/casino/roulette',  icon: '🎡', label: 'Roulette' },
  { to: '/casino/plinko',    icon: '⚪', label: 'Plinko' },
  { section: 'Bonus' },
  { to: '/superjackpot', icon: '💎', label: 'SuperJackpot', badgeClass: 'new' },
  { to: '/roue-du-jour', icon: '🎁', label: 'Coffre du Jour', badge: '!', badgeClass: 'new' },
  { section: 'Compte' },
  { to: '/profil',       icon: '👤', label: 'Mon Profil' },
]

function Protected({ children, admin = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d0018' }}>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, color:'#7c3aed', letterSpacing:3 }}>CHARGEMENT…</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.is_temp_pw) return <Navigate to="/changer-mot-de-passe" replace />
  if (admin && !user.is_admin) return <Navigate to="/casino" replace />
  return children
}

/* ── Header ── */
function Header() {
  const { user, logout } = useAuth()
  const { socket } = useSocket()
  const [jackpot, setJackpot]   = useState(null)
  const [pulse,   setPulse]     = useState(false)
  const [balPulse,setBalPulse]  = useState(false)
  const [menu,    setMenu]      = useState(false)
  const menuRef = useRef(null)
  const rank = user?.total_wagered !== undefined ? getRankFromWagered(user.total_wagered) : null

  useEffect(() => {
    axios.get('/api/superjackpot').then(r => setJackpot(r.data.amount)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('superjackpot_update', ({ amount }) => {
      setJackpot(amount); setPulse(true); setTimeout(() => setPulse(false), 800)
    })
    return () => socket.off('superjackpot_update')
  }, [socket])

  useEffect(() => {
    setBalPulse(true); setTimeout(() => setBalPulse(false), 500)
  }, [user?.balance])

  useEffect(() => {
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  if (!user) return null
  return (
    <header className="app-header">
      <div className="logo">Cobble<em>Moon</em></div>
      <div className="hdr-sep" />

      {/* Solde */}
      <div className="hdr-pill" style={{ borderColor: balPulse ? 'rgba(251,191,36,.6)' : undefined, boxShadow: balPulse ? '0 0 12px rgba(251,191,36,.2)' : undefined, transition: 'all .3s' }}>
        <div className="lbl">Solde</div>
        <div className="val">{(user.balance || 0).toLocaleString('fr-FR')} ✦</div>
      </div>

      {/* Jackpot */}
      {jackpot !== null && (
        <Link to="/superjackpot" style={{ textDecoration:'none' }}>
          <div className="hdr-pill" style={{ borderColor: pulse ? 'rgba(236,72,153,.7)' : 'rgba(236,72,153,.25)', transition:'all .3s' }}>
            <div className="pulse" />
            <div className="lbl">Jackpot</div>
            <div className="val pink" style={{ transform: pulse ? 'scale(1.1)' : 'scale(1)', transition:'transform .3s' }}>
              {jackpot.toLocaleString('fr-FR')} ✦
            </div>
          </div>
        </Link>
      )}

      <div className="hdr-spacer" />

      {/* Rang */}
      {rank && (
        <div className="hdr-rank">
          <span style={{ fontSize:14 }}>{rank.icon}</span>
          <span className="rn">{rank.name}</span>
        </div>
      )}

      {/* Avatar + menu */}
      <div ref={menuRef} style={{ position:'relative' }}>
        <div className="hdr-avatar" onClick={() => setMenu(!menu)}>
          {user.username?.slice(0,2).toUpperCase()}
        </div>
        {menu && (
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', right:0,
            background:'#130023', border:'1px solid rgba(124,58,237,.35)',
            borderRadius:10, padding:6, minWidth:160,
            boxShadow:'0 8px 30px rgba(0,0,0,.6)',
            animation:'slideUp .2s ease', zIndex:200,
          }}>
            {[
              { to:'/profil',     icon:'👤', label:'Mon Profil' },
              { to:'/classement', icon:'🏆', label:'Classement' },
              { to:'/roue-du-jour',icon:'🎁', label:'Coffre du Jour' },
              ...(user.is_admin ? [{ to:'/admin', icon:'⚙️', label:'Admin' }] : []),
            ].map(({ to, icon, label }) => (
              <Link key={to} to={to} onClick={() => setMenu(false)} style={{ textDecoration:'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:7, color:'#c4b5fd', fontSize:13, fontFamily:'Rajdhani,sans-serif', fontWeight:500, cursor:'pointer', transition:'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(109,40,217,.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{icon}</span>{label}
                </div>
              </Link>
            ))}
            <div style={{ height:1, background:'rgba(124,58,237,.15)', margin:'4px 0' }} />
            <div onClick={() => { logout(); setMenu(false) }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:7, color:'#f87171', fontSize:13, fontFamily:'Rajdhani,sans-serif', fontWeight:500, cursor:'pointer', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              🚪 Déconnexion
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

/* ── Sidebar ── */
function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const rank = user?.total_wagered !== undefined ? getRankFromWagered(user.total_wagered) : null
  // imported above
  const nextRank = rank ? getNextRank(rank.id) : null
  const xp = rank && nextRank ? getXPProgress(user?.total_wagered || 0, rank, nextRank) : 100

  if (!user) return null

  const isActive = (to) => location.pathname === to || (to !== '/casino' && location.pathname.startsWith(to + '/'))

  return (
    <aside className="sidebar">
      {/* Rang + XP */}
      {rank && (
        <div style={{ margin:'10px 10px 4px', padding:'10px 12px', background:'rgba(109,40,217,.08)', border:'1px solid rgba(109,40,217,.15)', borderRadius:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
            <span style={{ fontSize:18 }}>{rank.icon}</span>
            <div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, fontWeight:700, color:'#a78bfa' }}>{rank.name}</div>
              {nextRank && <div style={{ fontSize:9, color:'#5b3fa0', fontFamily:'Rajdhani,sans-serif' }}>→ {nextRank.name}</div>}
            </div>
          </div>
          {nextRank && (
            <div className="xp-track"><div className="xp-fill" style={{ width: `${xp}%` }} /></div>
          )}
        </div>
      )}

      <nav>
        {NAV.map((item, i) => {
          if (item.section) return <div key={i} className="nav-section">{item.section}</div>
          const active = isActive(item.to)
          return (
            <Link key={item.to} to={item.to} className={`nav-item${active ? ' active' : ''}`}>
              <span className="ni">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className={`nav-badge${item.badgeClass ? ' ' + item.badgeClass : ''}`}>{item.badge}</span>}
            </Link>
          )
        })}
        {user?.is_admin && (
          <>
            <div className="nav-section">Admin</div>
            <Link to="/admin" className={`nav-item${location.pathname === '/admin' ? ' active' : ''}`}>
              <span className="ni">⚙️</span><span>Panel Admin</span>
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="su-avatar">{user.username?.slice(0,2).toUpperCase()}</div>
          <div>
            <div className="su-name">{user.username}</div>
            <div className="su-bal">{(user.balance || 0).toLocaleString('fr-FR')} ✦</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ── LivePanel ── */
function LivePanel() {
  const { liveFeed, setLiveFeed, chatMessages, sendChatMessage, connected } = useSocket()
  const [open,  setOpen]  = useState(false)
  const [tab,   setTab]   = useState('feed')
  const [chat,  setChat]  = useState('')
  const [hasNew,setHasNew]= useState(false)
  const endRef = useRef(null)
  const GAME_ICONS = { slots:'🎰', blackjack:'🃏', mines:'💣', roulette:'🎡', plinko:'⚪', jackpot:'💎' }

  useEffect(() => {
    axios.get('/api/games/live-feed').then(r => setLiveFeed(r.data)).catch(() => {})
  }, [])

  useEffect(() => { if (!open) setHasNew(true) }, [liveFeed])
  useEffect(() => { if (open) setHasNew(false) }, [open])
  useEffect(() => { if (tab === 'chat') endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [chatMessages, tab])

  function send(e) {
    e.preventDefault()
    if (!chat.trim()) return
    sendChatMessage(chat)
    setChat('')
  }

  const ago = ts => {
    const s = Math.floor((Date.now() - new Date(ts)) / 1000)
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}min` : `${Math.floor(s/3600)}h`
  }

  return (
    <>
      <div className="live-fab" onClick={() => setOpen(!open)}>
        {open ? '✕' : '📡'}
        {!open && hasNew && <div className="notif-dot" />}
      </div>

      <div className={`live-drawer${open ? ' open' : ''}`}>
        <div className="live-tabs">
          <div className={`live-tab${tab==='feed'?' active':''}`} onClick={() => setTab('feed')}>📡 Live</div>
          <div className={`live-tab${tab==='chat'?' active':''}`} onClick={() => setTab('chat')}>💬 Chat</div>
          <div style={{ display:'flex', alignItems:'center', padding:'0 8px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: connected ? '#10b981' : '#6b7280', animation: connected ? 'blink 1.4s ease-in-out infinite' : 'none' }} />
          </div>
        </div>

        <div className="live-content">
          {tab === 'feed' && (
            liveFeed.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:'#5b3fa0', fontFamily:'Exo 2,sans-serif', fontSize:13 }}>Aucune activité…</div>
              : liveFeed.map((e, i) => {
                const isWin = e.payout > e.bet
                const isBig = e.payout >= e.bet * 3
                return (
                  <div key={i} className="feed-row" style={{ background: i === 0 ? 'rgba(109,40,217,.06)' : isBig ? 'rgba(16,185,129,.04)' : undefined }}>
                    <div className={`feed-dot${i < 3 ? ' live' : ' dead'}`} />
                    <div className="feed-icon">{GAME_ICONS[e.game] || '🎲'}</div>
                    <div>
                      <div className="feed-user">{e.username}</div>
                      <div className="feed-game">{e.game} · {ago(e.timestamp || e.created_at)}</div>
                    </div>
                    <div className={`feed-amt${isWin ? ' w' : ' l'}`}>
                      {isWin ? `+${e.payout.toLocaleString('fr-FR')}` : `−${e.bet?.toLocaleString('fr-FR')}`}
                      {isBig && ' 🔥'}
                    </div>
                  </div>
                )
              })
          )}
          {tab === 'chat' && (
            <div style={{ padding:'6px 0' }}>
              {chatMessages.length === 0 && <div style={{ textAlign:'center', padding:'40px 20px', color:'#5b3fa0', fontFamily:'Exo 2,sans-serif', fontSize:13 }}>Aucun message…</div>}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ padding:'8px 12px', borderBottom:'1px solid rgba(109,40,217,.08)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                    <span style={{ fontSize:10, fontFamily:'Orbitron,monospace', fontWeight:700, color:'#a78bfa' }}>{m.rankIcon} {m.username}</span>
                    <span style={{ fontSize:9, color:'#5b3fa0', fontFamily:'Rajdhani,sans-serif' }}>{ago(m.timestamp)}</span>
                  </div>
                  <div style={{ fontFamily:'Exo 2,sans-serif', fontSize:12, color:'rgba(226,212,240,.8)', lineHeight:1.4 }}>{m.text}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {tab === 'chat' && (
          <div className="chat-input-row">
            <form onSubmit={send} style={{ display:'flex', gap:6, width:'100%' }}>
              <input className="chat-input" value={chat} onChange={e => setChat(e.target.value)} placeholder="Message…" maxLength={200} />
              <button type="submit" className="chat-send">➤</button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Shell principal ── */
function Shell() {
  const { user } = useAuth()
  const location = useLocation()
  const noShell = ['/login', '/changer-mot-de-passe'].includes(location.pathname)

  if (noShell || !user) return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/casino" /> : <Login />} />
      <Route path="/changer-mot-de-passe" element={<ChangePassword />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )

  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/"               element={<Navigate to="/casino" />} />
            <Route path="/casino"         element={<Protected><Casino /></Protected>} />
            <Route path="/machines"       element={<Protected><Machines /></Protected>} />
            <Route path="/classement"     element={<Protected><Classement /></Protected>} />
            <Route path="/superjackpot"   element={<Protected><SuperJackpot /></Protected>} />
            <Route path="/roue-du-jour"   element={<Protected><RoueDuJour /></Protected>} />
            <Route path="/profil"         element={<Protected><Profile /></Protected>} />
            <Route path="/joueur/:u"      element={<Protected><PublicProfile /></Protected>} />
            <Route path="/admin"          element={<Protected admin><Admin /></Protected>} />
            <Route path="/casino/slots"     element={<Protected><GameGuard game="slots"><Slots /></GameGuard></Protected>} />
            <Route path="/casino/blackjack" element={<Protected><GameGuard game="blackjack"><Blackjack /></GameGuard></Protected>} />
            <Route path="/casino/mines"     element={<Protected><GameGuard game="mines"><Mines /></GameGuard></Protected>} />
            <Route path="/casino/roulette"  element={<Protected><GameGuard game="roulette"><Roulette /></GameGuard></Protected>} />
            <Route path="/casino/plinko"    element={<Protected><GameGuard game="plinko"><Plinko /></GameGuard></Protected>} />
            <Route path="*"               element={<Navigate to="/casino" />} />
          </Routes>
        </div>
      </div>
      <LivePanel />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Shell />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
