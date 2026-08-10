import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

const PLANS_KEY = 'trainer-plans'

export function useClientPlans(clientId?: string) {
  return useQuery({
    queryKey: [PLANS_KEY, clientId],
    queryFn: () => api.get('/workout-plans', { params: { clientId } }).then(r => r.data),
    enabled: !!clientId,
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; targetUserId: string }) =>
      api.post('/workout-plans', data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PLANS_KEY] }),
  })
}

export function useCreateWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; dayOfWeek?: number; workoutPlanId: string }) =>
      api.post('/workouts', data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PLANS_KEY] }),
  })
}

export function useAddExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workoutId, ...data }: { workoutId: string; exerciseId: string; sets: number; reps?: number; restTime?: number; order: number }) =>
      api.post(`/workouts/${workoutId}/exercises`, data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PLANS_KEY] }),
  })
}

export function useRemoveExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workoutId, exerciseId }: { workoutId: string; exerciseId: string }) =>
      api.delete(`/workouts/${workoutId}/exercises/${exerciseId}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PLANS_KEY] }),
  })
}

export function useReorderExercises() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workoutId, orderedIds }: { workoutId: string; orderedIds: string[] }) =>
      api.patch(`/workouts/${workoutId}/exercises/reorder`, { orderedIds }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PLANS_KEY] }),
  })
}
