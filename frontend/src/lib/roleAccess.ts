// Fuente única de qué ve cada rol: la usan el Sidebar (menú) y App (protección de rutas).

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
}

const dashboard: NavItem = { path: '/', label: 'Dashboard', icon: 'ti-layout-dashboard' }
const workout: NavItem = { path: '/workout', label: 'Entrenar', icon: 'ti-barbell' }
const progress: NavItem = { path: '/progreso', label: 'Progreso', icon: 'ti-chart-line' }
const revisions: NavItem = { path: '/revisiones', label: 'Revisiones', icon: 'ti-camera' }
const nutrition: NavItem = { path: '/nutricion', label: 'Nutrición', icon: 'ti-salad' }
const exercises: NavItem = { path: '/ejercicios', label: 'Ejercicios', icon: 'ti-crown' }
const chat: NavItem = { path: '/chat', label: 'Chat', icon: 'ti-message-circle' }
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

export function isRole(role: string | undefined): role is Role {
  return role === 'ADMIN' || role === 'TRAINER' || role === 'CLIENT'
}

export function homePathFor(role: string | undefined): string {
  return isRole(role) ? NAV_BY_ROLE[role][0].path : '/login'
}

export function canAccess(role: string | undefined, path: string): boolean {
  if (!isRole(role)) return false
  return SHARED_PATHS.includes(path) || NAV_BY_ROLE[role].some(item => item.path === path)
}
