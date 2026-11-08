import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccessService,
  TOGGLEABLE_MODULES,
  isToggleable,
} from '../access/access.service';
import { hasFeature } from '../access/plan-features';
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';

// Campos públicos de un usuario en el panel de admin (nunca la contraseña).
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  subscriptionPlan: true,
  revisionInterval: true,
  profilePhoto: true,
  createdAt: true,
  active: true,
  lastLoginAt: true,
  mustChangePassword: true,
  trainerId: true,
  trainer: { select: { id: true, name: true } },
  _count: {
    select: {
      trainerClients: true,
      workoutSessions: true,
      bodyRevisions: true,
      mealPlans: true,
    },
  },
} satisfies Prisma.UserSelect;

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async getStats() {
    const now = Date.now();
    const weekAgo = new Date(now - 7 * DAY);
    const monthAgo = new Date(now - 30 * DAY);

    const [
      byRole,
      byPlan,
      unassignedClients,
      newUsers30d,
      sessions7d,
      sessionsTotal,
      exercises,
      mealPlans,
      revisions30d,
      recentUsers,
      sessionsLast14,
      inactiveUsers,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.user.groupBy({
        by: ['subscriptionPlan'],
        where: { role: Role.CLIENT },
        _count: true,
      }),
      this.prisma.user.count({ where: { role: Role.CLIENT, trainerId: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.workoutSession.count({ where: { date: { gte: weekAgo } } }),
      this.prisma.workoutSession.count(),
      this.prisma.exercise.count(),
      this.prisma.mealPlan.count({ where: { isTemplate: false } }),
      this.prisma.bodyRevision.count({ where: { date: { gte: monthAgo } } }),
      this.prisma.user.findMany({
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.workoutSession.findMany({
        where: { date: { gte: new Date(now - 13 * DAY) } },
        select: { date: true },
      }),
      this.prisma.user.count({ where: { active: false } }),
    ]);

    // Sesiones por día de las últimas dos semanas, incluidos los días sin actividad.
    const activity: { date: string; sessions: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * DAY).toISOString().slice(0, 10);
      activity.push({ date: d, sessions: 0 });
    }
    for (const s of sessionsLast14) {
      const day = activity.find(
        (a) => a.date === s.date.toISOString().slice(0, 10),
      );
      if (day) day.sessions++;
    }

    const roleCount = (r: Role) =>
      byRole.find((x) => x.role === r)?._count ?? 0;

    return {
      users: {
        total: byRole.reduce((acc, x) => acc + x._count, 0),
        admins: roleCount(Role.ADMIN),
        trainers: roleCount(Role.TRAINER),
        clients: roleCount(Role.CLIENT),
        unassignedClients,
        new30d: newUsers30d,
        inactive: inactiveUsers,
      },
      clientsByPlan: Object.fromEntries(
        byPlan.map((p) => [p.subscriptionPlan, p._count]),
      ),
      sessions: { last7d: sessions7d, total: sessionsTotal },
      exercises,
      mealPlans,
      revisions30d,
      activity,
      recentUsers,
    };
  }

  findUsers(filters: {
    role?: Role;
    search?: string;
    trainerId?: string;
    active?: boolean;
  }) {
    const search = filters.search?.trim();
    return this.prisma.user.findMany({
      where: {
        role: filters.role,
        trainerId: filters.trainerId,
        active: filters.active,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: userSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async findUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async createUser(dto: AdminCreateUserDto) {
    await this.assertEmailFree(dto.email);
    if (dto.trainerId) {
      if (dto.role !== Role.CLIENT)
        throw new BadRequestException(
          'Solo los clientes pueden tener entrenador',
        );
      const entitled = await this.access.entitled(
        {
          id: '',
          role: dto.role,
          subscriptionPlan: dto.subscriptionPlan ?? 'FREE',
        },
        'trainer',
      );
      if (!entitled)
        throw new BadRequestException(
          'Solo los clientes PRO o PREMIUM pueden tener entrenador',
        );
      await this.assertTrainer(dto.trainerId);
    }

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: await bcrypt.hash(dto.password, 10),
        role: dto.role,
        subscriptionPlan: dto.subscriptionPlan,
        trainerId: dto.trainerId,
        mustChangePassword: dto.mustChangePassword ?? true,
      },
      select: userSelect,
    });
  }

  async updateUser(
    id: string,
    dto: AdminUpdateUserDto,
    currentAdminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (id === currentAdminId && dto.role && dto.role !== Role.ADMIN) {
      throw new BadRequestException(
        'No puedes quitarte el rol de administrador a ti mismo',
      );
    }
    if (id === currentAdminId && dto.active === false) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    if (dto.email && dto.email.toLowerCase() !== user.email)
      await this.assertEmailFree(dto.email);

    const nextRole = dto.role ?? user.role;
    const nextPlan = dto.subscriptionPlan ?? user.subscriptionPlan;
    const trainerAllowed = await this.access.entitled(
      { id, role: nextRole, subscriptionPlan: nextPlan },
      'trainer',
    );
    const data: Prisma.UserUncheckedUpdateInput = {
      name: dto.name,
      email: dto.email?.toLowerCase(),
      role: dto.role,
      subscriptionPlan: dto.subscriptionPlan,
      revisionInterval: dto.revisionInterval,
      active: dto.active,
      mustChangePassword: dto.mustChangePassword,
    };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
      data.mustChangePassword = dto.mustChangePassword ?? true;
    }

    if (dto.trainerId !== undefined) {
      if (dto.trainerId !== null) {
        if (nextRole !== Role.CLIENT)
          throw new BadRequestException(
            'Solo los clientes pueden tener entrenador',
          );
        if (!trainerAllowed)
          throw new BadRequestException(
            'Solo los clientes PRO o PREMIUM pueden tener entrenador',
          );
        await this.assertTrainer(dto.trainerId);
      }
      data.trainerId = dto.trainerId;
    }
    // Un cliente que baja a FREE pierde el entrenador (sus datos se conservan).
    if (nextRole === Role.CLIENT && !trainerAllowed) data.trainerId = null;
    // Un usuario que deja de ser cliente no puede seguir colgando de un entrenador.
    if (nextRole !== Role.CLIENT) data.trainerId = null;

    return this.prisma.$transaction(async (tx) => {
      // Si deja de ser entrenador, sus clientes quedan sin asignar.
      if (user.role === Role.TRAINER && nextRole !== Role.TRAINER) {
        await tx.user.updateMany({
          where: { trainerId: id },
          data: { trainerId: null },
        });
      }
      return tx.user.update({ where: { id }, data, select: userSelect });
    });
  }

  // ── Módulos ────────────────────────────────────────────────

  /** Estado de cada módulo para un usuario: excepción, lo que da su plan y el resultado final. */
  async getUserModules(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const [overrides, effective] = await Promise.all([
      this.access.getUserOverrides(id),
      this.access.resolveAll(user),
    ]);
    return TOGGLEABLE_MODULES.map((module) => ({
      module,
      override: overrides[module] ?? null,
      includedByPlan: hasFeature(user, module),
      effective: effective[module],
    }));
  }

  async setUserModule(id: string, module: string, enabled: boolean | null) {
    if (!isToggleable(module))
      throw new BadRequestException('Módulo desconocido');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === Role.ADMIN) {
      throw new BadRequestException(
        'Los administradores tienen siempre todos los módulos',
      );
    }
    await this.access.setUserOverride(id, module, enabled);
    return this.getUserModules(id);
  }

  /**
   * Elimina un usuario y todo lo que le pertenece. Se hace a mano y en orden porque varias
   * relaciones del esquema no tienen borrado en cascada (sesiones, planes, revisiones, mensajes).
   */
  async deleteUser(id: string, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { bodyRevisions: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const ownSessions: Prisma.WorkoutSessionWhereInput = {
      OR: [{ userId: id }, { workout: { workoutPlan: { userId: id } } }],
    };

    await this.prisma.$transaction(async (tx) => {
      // Sus clientes (si era entrenador) quedan sin asignar.
      await tx.user.updateMany({
        where: { trainerId: id },
        data: { trainerId: null },
      });

      await tx.sessionSet.deleteMany({
        where: { workoutSession: ownSessions },
      });
      await tx.workoutSession.deleteMany({ where: ownSessions });
      await tx.workoutExercise.deleteMany({
        where: { workout: { workoutPlan: { userId: id } } },
      });
      await tx.workout.deleteMany({ where: { workoutPlan: { userId: id } } });
      await tx.workoutPlan.deleteMany({ where: { userId: id } });
      await tx.bodyRevision.deleteMany({ where: { userId: id } });
      await tx.message.deleteMany({
        where: { OR: [{ senderId: id }, { receiverId: id }] },
      });

      // Sus alimentos personalizados pueden estar en menús de otros: pasan al admin que borra.
      await tx.food.updateMany({
        where: { createdById: id },
        data: { createdById: currentAdminId },
      });

      // Perfil nutricional y menús propios caen en cascada; los asignados por él quedan sin autor.
      await tx.user.delete({ where: { id } });
    });

    // Fotos en disco: si alguna falla, el usuario ya está borrado; solo se registra.
    const files = [
      user.profilePhoto,
      ...user.bodyRevisions.flatMap((r) => [
        r.photoFront,
        r.photoBack,
        r.photoSide,
      ]),
    ].filter((f): f is string => !!f);
    for (const file of files) {
      try {
        const full = path.join(process.cwd(), 'public', file);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      } catch (err) {
        this.logger.warn(`No se pudo borrar ${file}: ${String(err)}`);
      }
    }

    return { id, deleted: true };
  }

  private async assertEmailFree(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing)
      throw new ConflictException('Ya existe un usuario con ese email');
  }

  private async assertTrainer(trainerId: string) {
    const trainer = await this.prisma.user.findUnique({
      where: { id: trainerId },
    });
    if (!trainer || trainer.role !== Role.TRAINER)
      throw new BadRequestException('El entrenador indicado no existe');
  }
}
