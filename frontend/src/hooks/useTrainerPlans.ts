import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Exercise } from './useExercises'

const PLANS_KEY = 'trainer-plans'
const TEMPLATES_KEY = 'workout-templates'

export interface PlanExercise {
  id: string
  exerciseId: string
  sets: number
  reps: number | null
  duration: number | null
  restTime: number | null
  order: number
  exercise: Exercise
}

export interface PlanWorkout {
  id: string
  name: string
  dayOfWeek: number | null
  exercises: PlanExercise[]
}

export interface WorkoutPlan {
  id: string
  name: string
  description: string | null
  userId: string
  isTemplate: boolean
  /** Plantilla del admin: la ven todos los entrenadores. */
  isGlobal: boolean
  /** Si el usuario actual puede modificarlo (si no, solo copiarlo). */
  editable: boolean
  ownerName: string
  workouts: PlanWorkout[]
}

// Cualquier cambio en un plan puede afectar a planes de clientes, plantillas y al inicio del entrenador.
function invalidateAll(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: [PLANS_KEY] })
  qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
  qc.invalidateQueries({ queryKey: ['workout-plans'] })
  qc.invalidateQueries({ queryKey: ['trainer-dashboard'] })
}

function usePlanMutation<V>(fn: (vars: V) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => invalidateAll(qc) })
}

// ── Lectura ─────────────────────────────────────────────────

export function useClientPlans(clientId?: string) {
  return useQuery<WorkoutPlan[]>({
    queryKey: [PLANS_KEY, clientId],
    queryFn: () => api.get('/workout-plans', { params: { clientId } }).then(r => r.data),
    enabled: !!clientId,
  })
}

export function useWorkoutTemplates() {
  return useQuery<WorkoutPlan[]>({
    queryKey: [TEMPLATES_KEY],
    queryFn: () => api.get('/workout-plans/templates').then(r => r.data),
  })
}

// ── Planes ──────────────────────────────────────────────────

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; targetUserId?: string; asTemplate?: boolean }) =>
      api.post<WorkoutPlan>('/workout-plans', data).then(r => r.data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdatePlan() {
  return usePlanMutation(({ id, ...data }: { id: string; name?: string; description?: string }) =>
    api.put(`/workout-plans/${id}`, data).then(r => r.data))
}

export function useDeletePlan() {
  return usePlanMutation((id: string) => api.delete(`/workout-plans/${id}`).then(r => r.data))
}

/** Duplicar (sin destino), asignar/copiar a un cliente (targetUserId) o guardar como plantilla (asTemplate). */
export function useCopyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; targetUserId?: string; asTemplate?: boolean; name?: string }) =>
      api.post<WorkoutPlan>(`/workout-plans/${id}/copy`, data).then(r => r.data),
    onSuccess: () => invalidateAll(qc),
  })
}

// ── Días ────────────────────────────────────────────────────

export function useCreateWorkout() {
  return usePlanMutation((data: { name: string; dayOfWeek?: number; workoutPlanId: string }) =>
    api.post('/workouts', data).then(r => r.data))
}

export function useUpdateWorkout() {
  return usePlanMutation(({ id, ...data }: { id: string; name?: string; dayOfWeek?: number }) =>
    api.put(`/workouts/${id}`, data).then(r => r.data))
}

export function useDeleteWorkout() {
  return usePlanMutation((id: string) => api.delete(`/workouts/${id}`).then(r => r.data))
}

// ── Ejercicios de un día ────────────────────────────────────

export function useAddExercise() {
  return usePlanMutation(({ workoutId, ...data }: { workoutId: string; exerciseId: string; sets: number; reps?: number; restTime?: number }) =>
    api.post(`/workouts/${workoutId}/exercises`, data).then(r => r.data))
}

export function useUpdateExercise() {
  return usePlanMutation(({ workoutId, exerciseId, ...data }: { workoutId: string; exerciseId: string; sets?: number; reps?: number; restTime?: number }) =>
    api.patch(`/workouts/${workoutId}/exercises/${exerciseId}`, data).then(r => r.data))
}

export function useRemoveExercise() {
  return usePlanMutation(({ workoutId, exerciseId }: { workoutId: string; exerciseId: string }) =>
    api.delete(`/workouts/${workoutId}/exercises/${exerciseId}`).then(r => r.data))
}

export function useReorderExercises() {
  return usePlanMutation(({ workoutId, orderedIds }: { workoutId: string; orderedIds: string[] }) =>
    api.patch(`/workouts/${workoutId}/exercises/reorder`, { orderedIds }).then(r => r.data))
}
