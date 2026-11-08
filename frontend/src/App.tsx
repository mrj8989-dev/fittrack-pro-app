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
import ExercisesPage from './pages/ExercisesPage'
import ChatPage from './pages/ChatPage'
import NutritionPage from './pages/NutritionPage'
import AdminPage from './pages/AdminPage'
import ForcePasswordChangePage from './pages/ForcePasswordChangePage'
import PlansPage from './pages/PlansPage'
import AssistantPage from './pages/AssistantPage'
import { canAccess, featureForPath, homePathFor } from './lib/roleAccess'
import { useFeatureState } from './hooks/useAccess'
import { EmptyState } from './components/ui'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>Cargando...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  // Contraseña provisional (puesta por un admin o entrenador): hay que cambiarla antes de seguir.
  if (user.mustChangePassword) return <ForcePasswordChangePage />
  return <>{children}</>
}

// Si el rol no tiene acceso a la ruta, lo manda a su página de inicio. Si es un cliente cuyo
// plan no incluye el módulo, le enseña los planes (en el inicio, sin el aviso de "bloqueado").
function RoleRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAuth()
  const featureState = useFeatureState()
  if (!canAccess(user?.role, path)) return <Navigate to={homePathFor(user?.role)} replace />
  const feature = featureForPath(path)
  const state = feature ? featureState(feature) : 'available'
  if (state === 'locked') {
    return <PlansPage key={path} lockedFeature={path === '/' ? undefined : feature} />
  }
  if (state === 'hidden') {
    return (
      <div className="page card" style={{ maxWidth: '560px', marginTop: '3rem' }}>
        <EmptyState icon="ti-plug-connected-x" title="Módulo no disponible">
          El administrador ha desactivado esta sección para tu cuenta.
        </EmptyState>
      </div>
    )
  }
  return <>{children}</>
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
        <Route index element={<RoleRoute path="/"><DashboardPage /></RoleRoute>} />
        <Route path="workout" element={<RoleRoute path="/workout"><WorkoutPage /></RoleRoute>} />
        <Route path="progreso" element={<RoleRoute path="/progreso"><ProgressPage /></RoleRoute>} />
        <Route path="ajustes" element={<RoleRoute path="/ajustes"><SettingsPage /></RoleRoute>} />
        <Route path="revisiones" element={<RoleRoute path="/revisiones"><RevisionsPage /></RoleRoute>} />
        <Route path="nutricion" element={<RoleRoute path="/nutricion"><NutritionPage /></RoleRoute>} />
        <Route path="entrenador" element={<RoleRoute path="/entrenador"><TrainerPage /></RoleRoute>} />
        <Route path="ejercicios" element={<RoleRoute path="/ejercicios"><ExercisesPage /></RoleRoute>} />
        <Route path="chat" element={<RoleRoute path="/chat"><ChatPage /></RoleRoute>} />
        <Route path="admin" element={<RoleRoute path="/admin"><AdminPage /></RoleRoute>} />
        <Route path="planes" element={<RoleRoute path="/planes"><PlansPage /></RoleRoute>} />
        <Route path="asistente" element={<RoleRoute path="/asistente"><AssistantPage /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  )
}