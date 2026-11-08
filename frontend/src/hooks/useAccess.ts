import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { hasFeature } from '../lib/planAccess'
import type { Feature, Plan } from '../lib/planAccess'

/** Por qué un usuario tiene o no un módulo (ver backend/src/access/access.service.ts). */
export type AccessReason = 'ok' | 'plan' | 'disabled' | 'user-off' | 'user-on'
export interface FeatureAccess { enabled: boolean; reason: AccessReason }

export interface MyAccess {
  plan: Plan | null
  aiDailyLimit: number | null
  features: Record<Feature, FeatureAccess>
}

/** Módulos que el admin puede apagar en general o por usuario. */
export const TOGGLEABLE_MODULES = ['training', 'revisions', 'trainer', 'nutrition', 'ai'] as const
export type ToggleableModule = (typeof TOGGLEABLE_MODULES)[number]

export const MODULE_LABEL: Record<ToggleableModule, string> = {
  training: 'Entrenamiento',
  revisions: 'Revisiones',
  trainer: 'Chat con entrenador',
  nutrition: 'Nutrición',
  ai: 'Asistente IA',
}

export const MODULE_HINT: Record<ToggleableModule, string> = {
  training: 'Plan semanal, sesiones y progreso',
  revisions: 'Peso, medidas y fotos',
  trainer: 'Chat entre cliente y entrenador',
  nutrition: 'Objetivos, menús y alimentos',
  ai: 'Asistente de entrenamiento (próximamente)',
}

export function useMyAccess() {
  const { user } = useAuth()
  return useQuery<MyAccess>({
    queryKey: ['access', 'me', user?.id],
    queryFn: () => api.get('/access/me').then(r => r.data),
    enabled: !!user,
    staleTime: 60_000,
  })
}

/**
 * Cómo tratar un módulo en la interfaz:
 * - available: se puede usar
 * - locked: su plan no lo incluye (se enseña con candado y lleva a los planes)
 * - hidden: apagado por el admin, en general o para este usuario (no se enseña)
 * Mientras llega la respuesta del backend se usa el plan guardado en la sesión.
 */
export function useFeatureState() {
  const { user } = useAuth()
  const { data } = useMyAccess()
  return (feature: Feature): 'available' | 'locked' | 'hidden' => {
    const access = data?.features[feature]
    if (!access) return hasFeature(user, feature) ? 'available' : 'locked'
    if (access.enabled) return 'available'
    return access.reason === 'plan' ? 'locked' : 'hidden'
  }
}

// ── Admin ─────────────────────────────────────────────────────

export function useGlobalModules() {
  return useQuery<Record<ToggleableModule, boolean>>({
    queryKey: ['admin', 'modules'],
    queryFn: () => api.get('/admin/modules').then(r => r.data),
  })
}

export function useSetGlobalModule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ module, enabled }: { module: ToggleableModule; enabled: boolean }) =>
      api.put(`/admin/modules/${module}`, { enabled }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'modules'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-modules'] })
      queryClient.invalidateQueries({ queryKey: ['access'] })
    },
  })
}

export interface UserModuleState {
  module: ToggleableModule
  override: boolean | null
  includedByPlan: boolean
  effective: FeatureAccess
}

export function useUserModules(userId: string | undefined) {
  return useQuery<UserModuleState[]>({
    queryKey: ['admin', 'user-modules', userId],
    queryFn: () => api.get(`/admin/users/${userId}/modules`).then(r => r.data),
    enabled: !!userId,
  })
}

export function useSetUserModule(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ module, enabled }: { module: ToggleableModule; enabled: boolean | null }) =>
      api.put<UserModuleState[]>(`/admin/users/${userId}/modules/${module}`, { enabled }).then(r => r.data),
    onSuccess: data => {
      queryClient.setQueryData(['admin', 'user-modules', userId], data)
      queryClient.invalidateQueries({ queryKey: ['trainer-clients'] })
    },
  })
}
