import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export type AiTone = 'friendly' | 'technical' | 'motivational'
export type AiDetail = 'brief' | 'detailed'

export interface AiSettings {
  tone: AiTone
  detail: AiDetail
  goal: string | null
  limitations: string | null
  shareTraining: boolean
  shareSessions: boolean
  shareRevisions: boolean
  shareNutrition: boolean
  /** Solo lo cambia un admin. null = el de su plan (o sin límite con clave propia). */
  dailyLimit: number | null
  hasOwnApiKey: boolean
  apiKeyLast4: string | null
}

export type AiSettingsPatch = Partial<Omit<AiSettings, 'hasOwnApiKey' | 'apiKeyLast4'>>

/** Sin `userId`: la configuración propia. Con `userId`: la de ese usuario, vista por un admin. */
function basePath(userId?: string) {
  return userId ? `/admin/users/${userId}/ai` : '/ai/settings'
}

export function useAiSettings(userId?: string) {
  return useQuery<AiSettings>({
    queryKey: ['ai-settings', userId ?? 'me'],
    queryFn: () => api.get(basePath(userId)).then(r => r.data),
  })
}

function useSettingsMutation<T>(userId: string | undefined, fn: (vars: T) => Promise<AiSettings>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: data => {
      queryClient.setQueryData(['ai-settings', userId ?? 'me'], data)
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversation'] })
    },
  })
}

export function useUpdateAiSettings(userId?: string) {
  return useSettingsMutation(userId, (patch: AiSettingsPatch) =>
    api.put<AiSettings>(basePath(userId), patch).then(r => r.data))
}

export function useSetAiApiKey(userId?: string) {
  return useSettingsMutation(userId, (apiKey: string) =>
    api.put<AiSettings>(`${basePath(userId)}/api-key`, { apiKey }).then(r => r.data))
}

export function useClearAiApiKey(userId?: string) {
  return useSettingsMutation<void>(userId, () =>
    api.delete<AiSettings>(`${basePath(userId)}/api-key`).then(r => r.data))
}
