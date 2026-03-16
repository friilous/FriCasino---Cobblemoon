import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Casino from './pages/Casino'
import Slots from './pages/games/Slots'
import Plinko from './pages/games/Plinko'
import Roulette from './pages/games/Roulette'
import Crash from './pages/games/Crash'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#07071a',
    }}>
      <div style={{ color: '#f0c040', fontSize: 18, fontWeight: 700 }}>Chargement...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.is_temp_pw) return <Navigate to="/changer-mot-de-passe" replace />
  if (adminOnly && !user.is_admin) return <Navigate to="/casino" replace />
  return children
}

// Pages sans sidebar (login, change password)
const NO_SIDEBAR_PATHS = ['/login', '/changer-mot-de-passe']

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  const showSidebar = user && !NO_SIDEBAR_PATHS.includes(location.pathname)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#07071a' }}>
      {showSidebar && <Sidebar />}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <Routes>
          <Route path="/"                      element={<Navigate to={user ? '/casino' : '/login'} />} />
          <Route path="/login"                 element={user ? <Navigate to="/casino" /> : <Login />} />
          <Route path="/changer-mot-de-passe"  element={<ChangePassword />} />
          <Route path="/casino"                element={<ProtectedRoute><Casino /></ProtectedRoute>} />
          <Route path="/casino/slots"          element={<ProtectedRoute><Slots /></ProtectedRoute>} />
          <Route path="/casino/plinko"         element={<ProtectedRoute><Plinko /></ProtectedRoute>} />
          <Route path="/casino/roulette"       element={<ProtectedRoute><Roulette /></ProtectedRoute>} />
          <Route path="/casino/crash"          element={<ProtectedRoute><Crash /></ProtectedRoute>} />
          <Route path="/profil"                element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin"                 element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="*"                      element={<Navigate to="/" />} />
        </Routes>
      </main>
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
