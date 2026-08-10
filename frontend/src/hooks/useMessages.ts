import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export function useThread(otherUserId?: string) {
  return useQuery({
    queryKey: ['messages', otherUserId],
    queryFn: () => api.get(`/messages/${otherUserId}`).then(r => r.data),
    enabled: !!otherUserId,
    refetchInterval: 4000,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { receiverId: string; content: string }) =>
      api.post('/messages', data).then(r => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.receiverId] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/messages/unread-count').then(r => r.data.count as number),
    refetchInterval: 5000,
  })
}

export function useMyTrainer() {
  return useQuery({
    queryKey: ['my-trainer'],
    queryFn: () => api.get('/users/my-trainer').then(r => r.data),
  })
}
