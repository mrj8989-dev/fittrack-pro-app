import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutPage from './pages/WorkoutPage'
import ProgressPage from './pages/ProgressPage'
import SettingsPage from './pages/SettingsPage'
import RevisionsPage from './pages/RevisionsPage'
import TrainerPage from './pages/TrainerPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>Cargando...</div>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="progreso" element={<ProgressPage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="revisiones" element={<RevisionsPage />} />
        <Route path="entrenador" element={<TrainerPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  )
}