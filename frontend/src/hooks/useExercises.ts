import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export function useExercises(filters?: { muscleGroup?: string; equipment?: string }) {
  return useQuery({
    queryKey: ['exercises', filters],
    queryFn: () => api.get('/exercises', { params: filters }).then(r => r.data),
  })
}

export interface ExerciseInput {
  name: string
  description?: string
  muscleGroup: string
  equipment?: string
  videoUrl?: string
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ExerciseInput) => api.post('/exercises', data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

export function useUpdateExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: ExerciseInput & { id: string }) =>
      api.put(`/exercises/${id}`, data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

export function useDeleteExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/exercises/${id}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
