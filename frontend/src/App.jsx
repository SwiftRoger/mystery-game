import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Game from './pages/Game'
import Graveyard from './pages/Graveyard'
import Admin from './pages/Admin'

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth()
  if (loading) return null
  return token ? children : <Navigate to='/login' />
}

const AppRoutes = () => {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path='/login' element={token ? <Navigate to='/dashboard' /> : <Login />} />
      <Route path='/register' element={token ? <Navigate to='/dashboard' /> : <Register />} />
      <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path='/game' element={<ProtectedRoute><Game /></ProtectedRoute>} />
      <Route path='/graveyard' element={<ProtectedRoute><Graveyard /></ProtectedRoute>} />
      <Route path='/admin' element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path='*' element={<Navigate to='/login' />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}