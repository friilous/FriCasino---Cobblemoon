import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import LivePanel from './components/LivePanel'
import GameGuard from './components/GameGuard'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Casino from './pages/Casino'
import Machines from './pages/Machines'
import Classement from './pages/Classement'
import PublicProfile from './pages/PublicProfile'
import Slots from './pages/games/Slots'
import Roulette from './pages/games/Roulette'
import Blackjack from './pages/games/Blackjack'
import Mines from './pages/games/Mines'
import Plinko from './pages/games/Plinko'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import SuperJackpot from './pages/SuperJackpot'
import RoueDuJour from './pages/RoueDuJour'

const NO_SHELL_PATHS = ['/login', '/changer-mot-de-passe']

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0C0608',
    }}>
      <div style={{
        fontFamily: 'Cinzel Decorative, serif',
        fontSize: 18, color: '#F0B429',
        animation: 'jackpotPulse 1.5s ease-in-out infinite',
      }}>
        🎰 Chargement…
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.is_temp_pw) return <Navigate to="/changer-mot-de-passe" replace />
  if (adminOnly && !user.is_admin) return <Navigate to="/casino" replace />
  return children
}

function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const showShell = user && !NO_SHELL_PATHS.includes(location.pathname)

  if (!showShell) {
    return (
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/casino" /> : <Login />} />
        <Route path="/changer-mot-de-passe" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header fixe */}
      <Header />

      {/* Corps : sidebar + contenu */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />

        {/* Contenu scrollable */}
        <main style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          background: 'transparent',
          position: 'relative',
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/casino" />} />
            <Route path="/casino"           element={<ProtectedRoute><Casino /></ProtectedRoute>} />
            <Route path="/machines"         element={<ProtectedRoute><Machines /></ProtectedRoute>} />
            <Route path="/classement"       element={<ProtectedRoute><Classement /></ProtectedRoute>} />
            <Route path="/joueur/:username" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
            <Route path="/superjackpot"     element={<ProtectedRoute><SuperJackpot /></ProtectedRoute>} />
            <Route path="/roue-du-jour"     element={<ProtectedRoute><RoueDuJour /></ProtectedRoute>} />
            <Route path="/profil"           element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin"            element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

            <Route path="/casino/slots"     element={<ProtectedRoute><GameGuard game="slots"><Slots /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/roulette"  element={<ProtectedRoute><GameGuard game="roulette"><Roulette /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/blackjack" element={<ProtectedRoute><GameGuard game="blackjack"><Blackjack /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/mines"     element={<ProtectedRoute><GameGuard game="mines"><Mines /></GameGuard></ProtectedRoute>} />
            <Route path="/casino/plinko"    element={<ProtectedRoute><GameGuard game="plinko"><Plinko /></GameGuard></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/casino" />} />
          </Routes>
        </main>
      </div>

      {/* Panel Live flottant */}
      <LivePanel />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppShell />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
