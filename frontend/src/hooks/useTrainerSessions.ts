import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export function useClientSessions(clientId?: string) {
  return useQuery({
    queryKey: ['trainer-sessions', clientId],
    queryFn: () => api.get('/workout-sessions', { params: { clientId } }).then(r => r.data),
    enabled: !!clientId,
  })
}

export function useClientRecords(clientId?: string) {
  return useQuery({
    queryKey: ['trainer-records', clientId],
    queryFn: () => api.get('/workout-sessions/records', { params: { clientId } }).then(r => r.data),
    enabled: !!clientId,
  })
}
