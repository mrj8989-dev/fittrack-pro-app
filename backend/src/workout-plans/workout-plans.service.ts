import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { Role } from '@prisma/client';

@Injectable()
export class WorkoutPlansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkoutPlanDto, user: { id: string; role: Role }) {
    const { targetUserId, ...data } = dto;
    const ownerId = await this.resolveOwnerId(targetUserId, user);

    return this.prisma.workoutPlan.create({
      data: {
        ...data,
        userId: ownerId,
      },
      include: { workouts: true },
    });
  }

  async findAll(user: { id: string; role: Role }, clientId?: string) {
    const ownerId = clientId ? await this.resolveOwnerId(clientId, user) : user.id;

    return this.prisma.workoutPlan.findMany({
      where: { userId: ownerId },
      include: {
        workouts: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: { id: string; role: Role }) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        workouts: {
          include: {
            exercises: {
              include: { exercise: true },
            },
          },
        },
        user: { select: { trainerId: true } },
      },
    });

    if (!plan) throw new NotFoundException(`Plan con id ${id} no encontrado`);
    if (!this.canAccess(plan.userId, plan.user.trainerId, user)) {
      throw new ForbiddenException('No tienes acceso a este plan');
    }

    return plan;
  }

  async update(id: string, dto: UpdateWorkoutPlanDto, user: { id: string; role: Role }) {
    await this.findOne(id, user);
    return this.prisma.workoutPlan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: { id: string; role: Role }) {
    await this.findOne(id, user);
    return this.prisma.workoutPlan.delete({
      where: { id },
    });
  }

  /** Un plan es accesible por su dueño, o por su entrenador asignado. */
  private canAccess(ownerId: string, ownerTrainerId: string | null, user: { id: string; role: Role }) {
    if (ownerId === user.id) return true;
    return user.role === Role.TRAINER && ownerTrainerId === user.id;
  }

  /** Resuelve el userId propietario de un plan: el propio caller, o (si es trainer) uno de sus clientes. */
  private async resolveOwnerId(targetUserId: string | undefined, user: { id: string; role: Role }) {
    if (!targetUserId || targetUserId === user.id) return user.id;

    if (user.role !== Role.TRAINER) {
      throw new ForbiddenException('Solo un entrenador puede gestionar el plan de otro usuario');
    }

    const client = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!client || client.trainerId !== user.id) {
      throw new ForbiddenException('Ese usuario no está en tu cartera de clientes');
    }

    return targetUserId;
  }
}