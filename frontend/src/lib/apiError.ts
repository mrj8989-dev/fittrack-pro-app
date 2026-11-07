/** Mensaje legible de un error de la API (NestJS devuelve `message` como string o array). */
export function apiErrorMessage(error: unknown, fallback = 'Ha ocurrido un error'): string {
  const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(msg) ? msg.join('. ') : msg || fallback
}
