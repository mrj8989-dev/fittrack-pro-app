import { Role } from '@prisma/client';

export type AuthUser = { id: string; role: Role };

/** Lo mínimo de un plan para decidir quién puede verlo o editarlo. */
export type PlanOwnership = {
  userId: string;
  isTemplate: boolean;
  user: { trainerId: string | null; role: Role };
};

/** Incluir siempre esto al cargar un plan que se va a comprobar con canRead/canEdit. */
export const ownerSelect = {
  user: { select: { trainerId: true, role: true, name: true } },
} as const;

/**
 * Editar un plan:
 * - plantilla → su autor (entrenador o admin) y el admin;
 * - plan de un cliente → el propio cliente, su entrenador y el admin.
 */
export function canEditPlan(plan: PlanOwnership, user: AuthUser): boolean {
  if (user.role === Role.ADMIN || plan.userId === user.id) return true;
  if (plan.isTemplate) return false;
  return user.role === Role.TRAINER && plan.user.trainerId === user.id;
}

/** Ver un plan: quien puede editarlo y, además, cualquier entrenador las plantillas del admin (globales). */
export function canReadPlan(plan: PlanOwnership, user: AuthUser): boolean {
  if (canEditPlan(plan, user)) return true;
  return (
    plan.isTemplate &&
    user.role === Role.TRAINER &&
    plan.user.role === Role.ADMIN
  );
}
