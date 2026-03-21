import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Casino from './pages/Casino'
import Machines from './pages/Machines'
import Classement from './pages/Classement'
import PublicProfile from './pages/PublicProfile'
import Slots from './pages/games/Slots'
import Plinko from './pages/games/Plinko'
import Roulette from './pages/games/Roulette'
import Crash from './pages/games/Crash'
import Blackjack from './pages/games/Blackjack'
import Mines from './pages/games/Mines'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import GameGuard from './components/GameGuard'
import SuperJackpot from './pages/SuperJackpot'
import RoueDuJour from './pages/RoueDuJour'
import JackpotBanner from './components/JackpotBanner'
import Fishing from './pages/games/Fishing'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#07071a' }}>
      <div style={{ color:'#f0c040', fontSize:18, fontWeight:700 }}>Chargement...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.is_temp_pw) return <Navigate to="/changer-mot-de-passe" replace />
  if (adminOnly && !user.is_admin) return <Navigate to="/casino" replace />
  return children
}

const NO_SIDEBAR_PATHS = ['/login', '/changer-mot-de-passe']

function AppRoutes() {
  const { user }    = useAuth()
  const location    = useLocation()
  const showSidebar = user && !NO_SIDEBAR_PATHS.includes(location.pathname)

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#07071a' }}>
      {showSidebar && <Sidebar />}

      {/* main avec bannière sticky en haut */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
        {showSidebar && (
          <div style={{ position:'sticky', top:0, zIndex:50, flexShrink:0 }}>
            <JackpotBanner />
          </div>
        )}
        <main style={{ flex:1, overflowY:'auto' }}>
          <Routes>
            <Route path="/"                     element={<Navigate to={user ? '/casino' : '/login'} />} />
            <Route path="/login"                element={user ? <Navigate to="/casino" /> : <Login />} />
            <Route path="/changer-mot-de-passe" element={<ChangePassword />} />

            <Route path="/casino"           element={<ProtectedRoute><Casino /></ProtectedRoute>} />
            <Route path="/machines"         element={<ProtectedRoute><Machines /></ProtectedRoute>} />
            <Route path="/classement"       element={<ProtectedRoute><Classement /></ProtectedRoute>} />
            <Route path="/joueur/:username" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
            <Route path="/superjackpot"     element={<ProtectedRoute><SuperJackpot /></ProtectedRoute>} />
            <Route path="/roue-du-jour"     element={<ProtectedRoute><RoueDuJour /></ProtectedRoute>} />

            <Route path="/casino/slots"     element={<ProtectedRoute><GameGuard game="slots"><Slots /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/plinko"    element={<ProtectedRoute><GameGuard game="plinko"><Plinko /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/roulette"  element={<ProtectedRoute><GameGuard game="roulette"><Roulette /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/crash"     element={<ProtectedRoute><GameGuard game="crash"><Crash /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/blackjack" element={<ProtectedRoute><GameGuard game="blackjack"><Blackjack /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/mines"     element={<ProtectedRoute><GameGuard game="mines"><Mines /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/fishing"   element={<ProtectedRoute><GameGuard game="fishing"><Fishing /></GameGuard></ProtectedRoute>} />

            <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin"  element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*"       element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
