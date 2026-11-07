import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Role } from '../lib/roleAccess'

export type SubscriptionPlan = 'FREE' | 'PRO' | 'PREMIUM'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
  subscriptionPlan: SubscriptionPlan
  revisionInterval: number
  profilePhoto: string | null
  createdAt: string
  trainerId: string | null
  trainer: { id: string; name: string } | null
  _count: { trainerClients: number; workoutSessions: number; bodyRevisions: number; mealPlans: number }
}

export interface AdminStats {
  users: { total: number; admins: number; trainers: number; clients: number; unassignedClients: number; new30d: number }
  clientsByPlan: Partial<Record<SubscriptionPlan, number>>
  sessions: { last7d: number; total: number }
  exercises: number
  mealPlans: number
  revisions30d: number
  activity: { date: string; sessions: number }[]
  recentUsers: AdminUser[]
}

export interface AdminUserInput {
  name: string
  email: string
  password: string
  role: Role
  subscriptionPlan?: SubscriptionPlan
  trainerId?: string
}

export type AdminUserPatch = Partial<Omit<AdminUserInput, 'trainerId'>> & {
  trainerId?: string | null
  revisionInterval?: number
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })
}

export function useAdminUsers(filters: { role?: Role; search?: string } = {}) {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users', filters],
    queryFn: () => api.get('/admin/users', { params: filters }).then(r => r.data),
    placeholderData: prev => prev,
  })
}

function useInvalidateAdmin() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] })
    queryClient.invalidateQueries({ queryKey: ['trainer-clients'] })
  }
}

export function useCreateUser() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: (data: AdminUserInput) => api.post<AdminUser>('/admin/users', data).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, ...data }: AdminUserPatch & { id: string }) =>
      api.patch<AdminUser>(`/admin/users/${id}`, data).then(r => r.data),
    onSuccess: invalidate,
  })
}
