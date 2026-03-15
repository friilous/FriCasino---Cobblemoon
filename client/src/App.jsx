import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Casino from './pages/Casino'
import Slots from './pages/games/Slots'
import Plinko from './pages/games/Plinko'
import Roulette from './pages/games/Roulette'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-casino-gold text-2xl animate-pulse">Chargement...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.is_temp_pw) return <Navigate to="/changer-mot-de-passe" replace />
  if (adminOnly && !user.is_admin) return <Navigate to="/casino" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/casino" /> : <Login />} />
        <Route path="/changer-mot-de-passe" element={<ChangePassword />} />
        <Route path="/casino" element={<ProtectedRoute><Casino /></ProtectedRoute>} />
        <Route path="/casino/slots" element={<ProtectedRoute><Slots /></ProtectedRoute>} />
        <Route path="/casino/plinko" element={<ProtectedRoute><Plinko /></ProtectedRoute>} />
        <Route path="/casino/roulette" element={<ProtectedRoute><Roulette /></ProtectedRoute>} />
        <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
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
