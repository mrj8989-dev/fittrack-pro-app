import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export type ClientAlert = 'inactive' | 'revision' | 'no-plan' | 'no-menu' | 'messages'

export interface DashboardClient {
  id: string
  name: string
  email: string
  profilePhoto: string | null
  subscriptionPlan: string
  lastSessionAt: string | null
  daysSinceSession: number | null
  sessionsLast7d: number
  lastRevisionAt: string | null
  nextRevisionAt: string
  hasPlan: boolean
  hasMenu: boolean
  nutritionEnabled: boolean
  unreadMessages: number
  alerts: ClientAlert[]
}

export interface TrainerDashboard {
  totals: {
    clients: number
    sessionsLast7d: number
    activeLast7d: number
    revisionsDue: number
    unreadMessages: number
    needAttention: number
  }
  clients: DashboardClient[]
  recentSessions: {
    id: string
    date: string
    completed: boolean
    duration: number | null
    clientId: string
    clientName: string
    workoutName: string
    sets: number
    volume: number
  }[]
}

export function useTrainerDashboard() {
  return useQuery<TrainerDashboard>({
    queryKey: ['trainer-dashboard'],
    queryFn: () => api.get('/users/trainer-dashboard').then(r => r.data),
    refetchInterval: 60_000,
  })
}
