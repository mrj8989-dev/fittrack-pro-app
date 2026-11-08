import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { CopyWorkoutPlanDto } from './dto/copy-workout-plan.dto';
import {
  AuthUser,
  canEditPlan,
  canReadPlan,
  ownerSelect,
} from './plan-access';

const planInclude = {
  ...ownerSelect,
  workouts: {
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.WorkoutPlanInclude;

type PlanWithWorkouts = Prisma.WorkoutPlanGetPayload<{
  include: typeof planInclude;
}>;

/**
 * Planes de entrenamiento.
 * - Plan de un cliente: lo gestionan el cliente, su entrenador y el admin; es lo que se entrena.
 * - Plantilla: rutina reutilizable de un entrenador (las del admin las ven todos los entrenadores).
 *   No se entrena: se copia a un cliente.
 */
@Injectable()
export class WorkoutPlansService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(dto: CreateWorkoutPlanDto, user: AuthUser) {
    const { targetUserId, asTemplate, ...data } = dto;
    if (asTemplate) {
      this.assertStaff(user);
      const plan = await this.prisma.workoutPlan.create({
        data: { ...data, isTemplate: true, userId: user.id },
        include: planInclude,
      });
      return this.view(plan, user);
    }

    const ownerId = await this.resolveOwnerId(targetUserId, user);
    const plan = await this.prisma.workoutPlan.create({
      data: { ...data, userId: ownerId },
      include: planInclude,
    });
    return this.view(plan, user);
  }

  /** Planes (no plantillas) propios, o de un cliente si eres su entrenador o admin. */
  async findAll(user: AuthUser, clientId?: string) {
    const ownerId = clientId
      ? await this.resolveOwnerId(clientId, user, false)
      : user.id;
    const plans = await this.prisma.workoutPlan.findMany({
      where: { userId: ownerId, isTemplate: false },
      include: planInclude,
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((p) => this.view(p, user));
  }

  /** Plantillas visibles: las propias y las del admin (el admin ve todas). */
  async findTemplates(user: AuthUser) {
    this.assertStaff(user);
    const plans = await this.prisma.workoutPlan.findMany({
      where: {
        isTemplate: true,
        ...(user.role === Role.ADMIN
          ? {}
          : { OR: [{ userId: user.id }, { user: { role: Role.ADMIN } }] }),
      },
      include: planInclude,
      orderBy: { name: 'asc' },
    });
    return plans.map((p) => this.view(p, user));
  }

  async findOne(id: string, user: AuthUser) {
    return this.view(await this.loadReadable(id, user), user);
  }

  async update(id: string, dto: UpdateWorkoutPlanDto, user: AuthUser) {
    await this.loadEditable(id, user);
    const plan = await this.prisma.workoutPlan.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      include: planInclude,
    });
    return this.view(plan, user);
  }

  /** Borra el plan con sus días y ejercicios; las sesiones ya hechas se conservan en el historial. */
  async remove(id: string, user: AuthUser) {
    await this.loadEditable(id, user);
    await this.prisma.workoutPlan.delete({ where: { id } });
    return { id };
  }

  /**
   * Copia completa (días y ejercicios) de un plan o plantilla:
   * - asTemplate → como plantilla propia;
   * - targetUserId → a un cliente (asignar una plantilla, o pasar un plan de un cliente a otro);
   * - sin nada → duplicado para el mismo dueño.
   */
  async copy(id: string, dto: CopyWorkoutPlanDto, user: AuthUser) {
    const source = await this.loadReadable(id, user);

    let ownerId: string;
    if (dto.asTemplate) {
      this.assertStaff(user);
      ownerId = user.id;
    } else {
      const target =
        dto.targetUserId ?? (source.isTemplate ? undefined : source.userId);
      if (!target)
        throw new BadRequestException(
          'Indica el cliente al que asignar la plantilla',
        );
      ownerId = await this.resolveOwnerId(target, user);
    }

    const sameOwner = !dto.asTemplate && ownerId === source.userId;
    const name =
      dto.name ??
      (sameOwner && !source.isTemplate ? `${source.name} (copia)` : source.name);

    const plan = await this.prisma.workoutPlan.create({
      data: {
        name,
        description: source.description,
        isTemplate: !!dto.asTemplate,
        userId: ownerId,
        workouts: {
          create: source.workouts.map((w) => ({
            name: w.name,
            dayOfWeek: w.dayOfWeek,
            exercises: {
              create: w.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                sets: e.sets,
                reps: e.reps,
                duration: e.duration,
                restTime: e.restTime,
                order: e.order,
              })),
            },
          })),
        },
      },
      include: planInclude,
    });
    return this.view(plan, user);
  }

  // ── Permisos ─────────────────────────────────────────────────

  private async load(id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: planInclude,
    });
    if (!plan) throw new NotFoundException(`Plan con id ${id} no encontrado`);
    return plan;
  }

  private async loadReadable(id: string, user: AuthUser) {
    const plan = await this.load(id);
    if (!canReadPlan(plan, user))
      throw new ForbiddenException('No tienes acceso a este plan');
    return plan;
  }

  private async loadEditable(id: string, user: AuthUser) {
    const plan = await this.load(id);
    if (!canEditPlan(plan, user))
      throw new ForbiddenException(
        plan.isTemplate
          ? 'Solo su autor puede modificar esta plantilla'
          : 'No tienes acceso a este plan',
      );
    return plan;
  }

  private assertStaff(user: AuthUser) {
    if (user.role !== Role.TRAINER && user.role !== Role.ADMIN)
      throw new ForbiddenException(
        'Solo entrenadores y administradores gestionan plantillas',
      );
  }

  /** Respuesta pública: el plan sin datos internos del dueño, más si es global y si se puede editar. */
  private view(plan: PlanWithWorkouts, user: AuthUser) {
    const { user: owner, ...rest } = plan;
    return {
      ...rest,
      ownerName: owner.name,
      isGlobal: plan.isTemplate && owner.role === Role.ADMIN,
      editable: canEditPlan(plan, user),
    };
  }

  /**
   * Dueño del plan: el propio usuario, o un cliente gestionado por él
   * (su entrenador, o el admin). Para escribir, el cliente debe tener el módulo de entrenamiento.
   */
  private async resolveOwnerId(
    targetUserId: string | undefined,
    user: AuthUser,
    forWrite = true,
  ) {
    if (!targetUserId || targetUserId === user.id) return user.id;

    if (user.role !== Role.TRAINER && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Solo un entrenador puede gestionar el plan de otro usuario',
      );
    }

    const client = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        trainerId: true,
        subscriptionPlan: true,
      },
    });
    if (!client) throw new NotFoundException('Usuario no encontrado');
    if (user.role === Role.TRAINER && client.trainerId !== user.id) {
      throw new ForbiddenException(
        'Ese usuario no está en tu cartera de clientes',
      );
    }
    if (client.role !== Role.CLIENT) {
      throw new BadRequestException(
        'Los planes de entrenamiento se asignan a clientes',
      );
    }
    if (forWrite && !(await this.access.entitled(client, 'training'))) {
      throw new ForbiddenException(
        'El plan de este cliente no incluye entrenamiento (necesita PRO o PREMIUM)',
      );
    }
    return targetUserId;
  }
}
