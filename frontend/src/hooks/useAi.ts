import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { API_BASE_URL } from '../lib/api'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/** limit/remaining null = sin límite (p. ej. con clave de API propia). */
export interface AiUsage { used: number; limit: number | null; remaining: number | null }

export interface AiConversation {
  configured: boolean
  usingOwnKey: boolean
  model: string
  usage: AiUsage
  messages: AiMessage[]
}

export function useAiConversation() {
  return useQuery<AiConversation>({
    queryKey: ['ai', 'conversation'],
    queryFn: () => api.get('/ai/conversation').then(r => r.data),
  })
}

export function useNewAiConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/ai/conversation'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'conversation'] }),
  })
}

/**
 * Envía un mensaje y va llamando a onText con cada trozo de la respuesta (Server-Sent Events).
 * Devuelve el uso del día al terminar. Lanza Error con el mensaje del servidor si falla.
 */
export async function streamAiChat(
  message: string,
  onText: (delta: string) => void,
  signal?: AbortSignal,
): Promise<{ reply: string; refused: boolean; usage: AiUsage }> {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('ft-token') ?? ''}`,
    },
    body: JSON.stringify({ message }),
    signal,
  })

  // Errores previos al stream (límite diario, sin configurar...) llegan como JSON normal.
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null) as { message?: string | string[] } | null
    const msg = Array.isArray(data?.message) ? data.message.join('. ') : data?.message
    throw new Error(msg || 'El asistente no ha podido responder.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // Cada evento SSE termina en una línea en blanco.
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const line = raw.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const event = JSON.parse(line.slice(6))
      if (event.type === 'text') onText(event.text)
      else if (event.type === 'done') return event
      else if (event.type === 'error') throw new Error(event.message)
    }
  }
  throw new Error('La respuesta se ha cortado. Inténtalo de nuevo.')
}
