import { Injectable } from '@nestjs/common';
import { Role, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Feature, hasFeature } from './plan-features';

/** Módulos que el admin puede apagar en general o por usuario. */
export const TOGGLEABLE_MODULES = [
  'training',
  'revisions',
  'trainer',
  'nutrition',
  'ai',
] as const satisfies readonly Feature[];
export type ToggleableModule = (typeof TOGGLEABLE_MODULES)[number];

export const isToggleable = (f: string): f is ToggleableModule =>
  (TOGGLEABLE_MODULES as readonly string[]).includes(f);

/**
 * Por qué un usuario tiene (o no) un módulo:
 * - disabled: apagado en general por el admin
 * - user-off / user-on: excepción puesta para ese usuario
 * - plan: su plan no lo incluye
 * - ok: lo incluye su plan o su rol
 */
export type AccessReason = 'ok' | 'plan' | 'disabled' | 'user-off' | 'user-on';
export interface FeatureAccess {
  enabled: boolean;
  reason: AccessReason;
}

export interface AccessUser {
  id: string;
  role: Role;
  subscriptionPlan: SubscriptionPlan;
}

const ALL_FEATURES: Feature[] = [
  'exercises',
  'dashboard',
  'trainer',
  'training',
  'revisions',
  'nutrition',
  'ai',
];

const CACHE_MS = 30_000;

@Injectable()
export class AccessService {
  // Los interruptores generales se leen en cada petición protegida: se cachean unos segundos.
  private globals: { at: number; map: Map<string, boolean> } | null = null;

  constructor(private prisma: PrismaService) {}

  async getGlobalModules(): Promise<Record<ToggleableModule, boolean>> {
    const map = await this.loadGlobals();
    return Object.fromEntries(
      TOGGLEABLE_MODULES.map((m) => [m, map.get(m) ?? true]),
    ) as Record<ToggleableModule, boolean>;
  }

  async setGlobalModule(module: ToggleableModule, enabled: boolean) {
    await this.prisma.moduleSetting.upsert({
      where: { module },
      update: { enabled },
      create: { module, enabled },
    });
    this.globals = null;
    return this.getGlobalModules();
  }

  async getUserOverrides(
    userId: string,
  ): Promise<Partial<Record<ToggleableModule, boolean>>> {
    const rows = await this.prisma.userModuleOverride.findMany({
      where: { userId },
    });
    return Object.fromEntries(
      rows
        .filter((r) => isToggleable(r.module))
        .map((r) => [r.module, r.enabled]),
    );
  }

  /** null = quitar la excepción y volver a lo que diga su plan. */
  async setUserOverride(
    userId: string,
    module: ToggleableModule,
    enabled: boolean | null,
  ) {
    if (enabled === null) {
      await this.prisma.userModuleOverride.deleteMany({
        where: { userId, module },
      });
    } else {
      await this.prisma.userModuleOverride.upsert({
        where: { userId_module: { userId, module } },
        update: { enabled },
        create: { userId, module, enabled },
      });
    }
  }

  /** Acceso efectivo a todos los módulos (para el frontend y el panel de admin). */
  async resolveAll(user: AccessUser): Promise<Record<Feature, FeatureAccess>> {
    const [globals, overrides] = await Promise.all([
      this.loadGlobals(),
      user.id ? this.getUserOverrides(user.id) : Promise.resolve({}),
    ]);
    return Object.fromEntries(
      ALL_FEATURES.map((f) => [f, this.decide(user, f, globals, overrides)]),
    ) as Record<Feature, FeatureAccess>;
  }

  async check(user: AccessUser, feature: Feature): Promise<FeatureAccess> {
    return (await this.resolveAll(user))[feature];
  }

  async can(user: AccessUser, feature: Feature): Promise<boolean> {
    return (await this.check(user, feature)).enabled;
  }

  /**
   * Derecho a la funcionalidad según su plan y su excepción personal, ignorando los interruptores
   * generales. Lo usan las reglas de asignación (entrenador, menús): apagar un módulo en general
   * lo oculta, pero no debe deshacer relaciones como cliente–entrenador.
   */
  async entitled(user: AccessUser, feature: Feature): Promise<boolean> {
    if (user.role !== Role.CLIENT) return true;
    const override =
      isToggleable(feature) && user.id
        ? (await this.getUserOverrides(user.id))[feature]
        : undefined;
    return override ?? hasFeature(user, feature);
  }

  // Orden: apagado general > excepción del usuario > plan > rol. El admin no se ve afectado
  // por los interruptores para poder seguir gestionando el contenido de un módulo apagado.
  private decide(
    user: AccessUser,
    feature: Feature,
    globals: Map<string, boolean>,
    overrides: Partial<Record<ToggleableModule, boolean>>,
  ): FeatureAccess {
    if (user.role === Role.ADMIN || !isToggleable(feature)) {
      const base = hasFeature(user, feature);
      return { enabled: base, reason: base ? 'ok' : 'plan' };
    }
    if (globals.get(feature) === false)
      return { enabled: false, reason: 'disabled' };
    const override = overrides[feature];
    if (override !== undefined) {
      return { enabled: override, reason: override ? 'user-on' : 'user-off' };
    }
    const base = hasFeature(user, feature);
    return { enabled: base, reason: base ? 'ok' : 'plan' };
  }

  private async loadGlobals(): Promise<Map<string, boolean>> {
    if (this.globals && Date.now() - this.globals.at < CACHE_MS)
      return this.globals.map;
    const rows = await this.prisma.moduleSetting.findMany();
    this.globals = {
      at: Date.now(),
      map: new Map(rows.map((r) => [r.module, r.enabled])),
    };
    return this.globals.map;
  }
}
