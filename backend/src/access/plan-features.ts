import { Role, SubscriptionPlan } from '@prisma/client';

/**
 * Qué incluye cada plan. Los planes solo aplican a clientes: entrenadores y admins
 * acceden a todo lo que permite su rol. Fuente única: la usan el guard y los servicios.
 */
export type Feature =
  | 'exercises'
  | 'dashboard'
  | 'trainer'
  | 'training'
  | 'revisions'
  | 'nutrition'
  | 'ai';

export const PLAN_FEATURES: Record<SubscriptionPlan, readonly Feature[]> = {
  FREE: ['exercises'],
  PRO: ['exercises', 'dashboard', 'trainer', 'training', 'revisions', 'ai'],
  PREMIUM: [
    'exercises',
    'dashboard',
    'trainer',
    'training',
    'revisions',
    'nutrition',
    'ai',
  ],
};

/** Mensajes diarios del asistente IA por plan. */
export const AI_DAILY_LIMIT: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 20,
  PREMIUM: 20,
};

export const FEATURE_LABEL: Record<Feature, string> = {
  exercises: 'el catálogo de ejercicios',
  dashboard: 'el dashboard',
  trainer: 'entrenador personal y chat',
  training: 'planes y sesiones de entrenamiento',
  revisions: 'las revisiones corporales',
  nutrition: 'nutrición',
  ai: 'el asistente IA',
};

/** Plan mínimo que incluye cada funcionalidad (para los mensajes de "mejora tu plan"). */
export function minimumPlanFor(feature: Feature): SubscriptionPlan {
  return (['FREE', 'PRO', 'PREMIUM'] as const).find((p) =>
    PLAN_FEATURES[p].includes(feature),
  )!;
}

export function hasFeature(
  user: { role: Role; subscriptionPlan: SubscriptionPlan },
  feature: Feature,
): boolean {
  if (user.role !== Role.CLIENT) return true;
  return PLAN_FEATURES[user.subscriptionPlan].includes(feature);
}

/** Solo los clientes con estos planes pueden tener entrenador. */
export const canHaveTrainer = (plan: SubscriptionPlan) =>
  PLAN_FEATURES[plan].includes('trainer');
