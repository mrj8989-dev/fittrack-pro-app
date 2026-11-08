import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface TrainerClient {
  id: string
  name: string
  email: string
  subscriptionPlan: string
  createdAt: string
  profilePhoto: string | null
  /** Se le pueden asignar menús (plan PREMIUM o excepción del admin). */
  nutritionEnabled: boolean
}

export function useClients(enabled = true) {
  return useQuery<TrainerClient[]>({
    queryKey: ['trainer-clients'],
    queryFn: () => api.get('/users/clients').then(r => r.data),
    enabled,
  })
}

export function useAddClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; name?: string; password?: string }) =>
      api.post<TrainerClient>('/users/clients', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-clients'] })
    },
  })
}

export function useRemoveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => api.delete(`/users/clients/${clientId}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-clients'] })
    },
  })
}
