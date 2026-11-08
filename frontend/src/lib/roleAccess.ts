// Fuente única de qué ve cada rol: la usan el Sidebar (menú) y App (protección de rutas).
// Lo que depende del plan del cliente (FREE/PRO/PREMIUM) se marca con `feature`: ver planAccess.ts.
import type { Feature } from './planAccess'

export type Role = 'ADMIN' | 'TRAINER' | 'CLIENT'

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  TRAINER: 'Entrenador',
  CLIENT: 'Cliente',
}

export interface NavItem {
  path: string
  label: string
  icon: string
  /** Funcionalidad del plan necesaria (solo aplica a clientes). */
  feature?: Feature
}

const dashboard: NavItem = { path: '/', label: 'Dashboard', icon: 'ti-layout-dashboard', feature: 'dashboard' }
const workout: NavItem = { path: '/workout', label: 'Entrenar', icon: 'ti-barbell', feature: 'training' }
const progress: NavItem = { path: '/progreso', label: 'Progreso', icon: 'ti-chart-line', feature: 'training' }
const revisions: NavItem = { path: '/revisiones', label: 'Revisiones', icon: 'ti-camera', feature: 'revisions' }
const nutrition: NavItem = { path: '/nutricion', label: 'Nutrición', icon: 'ti-salad', feature: 'nutrition' }
const exercises: NavItem = { path: '/ejercicios', label: 'Ejercicios', icon: 'ti-list-search', feature: 'exercises' }
const chat: NavItem = { path: '/chat', label: 'Chat', icon: 'ti-message-circle', feature: 'trainer' }
const clients: NavItem = { path: '/entrenador', label: 'Clientes', icon: 'ti-users' }
const admin: NavItem = { path: '/admin', label: 'Panel', icon: 'ti-shield-star' }

// Entrenar, Progreso y Revisiones son datos personales del CLIENT. En Nutrición, el CLIENT
// gestiona sus menús; el TRAINER, sus plantillas y los menús de sus clientes; el ADMIN, todo:
// usuarios y roles (Panel), planes e historial de cualquier cliente (Clientes), menús y catálogos.
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  CLIENT: [dashboard, workout, progress, revisions, nutrition, exercises, chat],
  TRAINER: [clients, nutrition, exercises],
  ADMIN: [admin, clients, nutrition, exercises],
}

// Rutas accesibles a todos los roles autenticados aunque no estén en el menú principal.
const SHARED_PATHS = ['/ajustes']
// Página de planes: solo tiene sentido para clientes.
const CLIENT_EXTRA_PATHS = ['/planes']

/** Funcionalidad de plan que exige una ruta (para el guard de App). */
export function featureForPath(path: string): Feature | undefined {
  return NAV_BY_ROLE.CLIENT.find(item => item.path === path)?.feature
}

export function isRole(role: string | undefined): role is Role {
  return role === 'ADMIN' || role === 'TRAINER' || role === 'CLIENT'
}

export function homePathFor(role: string | undefined): string {
  return isRole(role) ? NAV_BY_ROLE[role][0].path : '/login'
}

export function canAccess(role: string | undefined, path: string): boolean {
  if (!isRole(role)) return false
  if (role === 'CLIENT' && CLIENT_EXTRA_PATHS.includes(path)) return true
  return SHARED_PATHS.includes(path) || NAV_BY_ROLE[role].some(item => item.path === path)
}
