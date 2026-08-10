import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.get('/exercises').then(r => r.data),
  })
}
