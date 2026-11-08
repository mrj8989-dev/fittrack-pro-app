// Qué incluye cada plan. Espejo de backend/src/access/plan-features.ts (el backend es quien
// decide; aquí solo se usa para el menú, los candados y la página de planes).
// Los planes solo aplican a clientes: entrenadores y admins ven todo lo de su rol.

export type Plan = 'FREE' | 'PRO' | 'PREMIUM'
export type Feature = 'exercises' | 'dashboard' | 'trainer' | 'training' | 'revisions' | 'nutrition' | 'ai'

export const PLANS: Plan[] = ['FREE', 'PRO', 'PREMIUM']

export const PLAN_FEATURES: Record<Plan, readonly Feature[]> = {
  FREE: ['exercises'],
  PRO: ['exercises', 'dashboard', 'trainer', 'training', 'revisions', 'ai'],
  PREMIUM: ['exercises', 'dashboard', 'trainer', 'training', 'revisions', 'nutrition', 'ai'],
}

export const AI_DAILY_LIMIT: Record<Plan, number> = { FREE: 0, PRO: 20, PREMIUM: 20 }

export const FEATURE_INFO: Record<Feature, { label: string; icon: string; description: string }> = {
  exercises: { label: 'Catálogo de ejercicios', icon: 'ti-list-search', description: 'Cerca de 200 ejercicios con técnica, músculos implicados y vídeo.' },
  dashboard: { label: 'Dashboard personal', icon: 'ti-layout-dashboard', description: 'Tu peso, sesiones, volumen y récords de un vistazo.' },
  trainer: { label: 'Entrenador personal y chat', icon: 'ti-user-star', description: 'Un entrenador que te sigue y con quien hablas directamente.' },
  training: { label: 'Plan de entrenamiento', icon: 'ti-barbell', description: 'Tu rutina semanal, registro de series en tiempo real y progreso por ejercicio.' },
  revisions: { label: 'Revisiones corporales', icon: 'ti-camera', description: 'Peso, medidas y fotos para ver tu evolución.' },
  nutrition: { label: 'Nutrición', icon: 'ti-salad', description: 'Calorías y macros a tu medida, menú semanal e intercambios de alimentos.' },
  ai: { label: 'Asistente IA', icon: 'ti-sparkles', description: 'Resuelve dudas de entrenamiento al momento.' },
}

export const PLAN_INFO: Record<Plan, { name: string; tagline: string; highlight?: boolean }> = {
  FREE: { name: 'Free', tagline: 'Explora el catálogo de ejercicios' },
  PRO: { name: 'Pro', tagline: 'Entrena con tu entrenador personal', highlight: true },
  PREMIUM: { name: 'Premium', tagline: 'Entrenamiento y nutrición completos' },
}

export function isPlan(plan: string | null | undefined): plan is Plan {
  return plan === 'FREE' || plan === 'PRO' || plan === 'PREMIUM'
}

/** Clientes según su plan; el resto de roles, siempre. */
export function hasFeature(user: { role?: string; subscriptionPlan?: string | null } | null | undefined, feature: Feature): boolean {
  if (!user) return false
  if (user.role !== 'CLIENT') return true
  const plan = isPlan(user.subscriptionPlan) ? user.subscriptionPlan : 'FREE'
  return PLAN_FEATURES[plan].includes(feature)
}

export function minimumPlanFor(feature: Feature): Plan {
  return PLANS.find(p => PLAN_FEATURES[p].includes(feature))!
}

export const canHaveTrainer = (plan: string | null | undefined) =>
  isPlan(plan) && PLAN_FEATURES[plan].includes('trainer')
