import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateSessionSetDto } from './dto/create-session-set.dto';
import { Role } from '@prisma/client';

type AuthUser = { id: string; role: Role };

@Injectable()
export class WorkoutSessionsService {
  constructor(private prisma: PrismaService) {}

  /** Resuelve el userId cuyas sesiones se consultan: el propio caller, o (si es su entrenador) un cliente. */
  private async resolveTargetUserId(clientId: string | undefined, user: AuthUser) {
    if (!clientId || clientId === user.id) return user.id;

    if (user.role !== Role.TRAINER) {
      throw new ForbiddenException('Solo un entrenador puede consultar el historial de otro usuario');
    }

    const client = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!client || client.trainerId !== user.id) {
      throw new ForbiddenException('Ese usuario no está en tu cartera de clientes');
    }

    return clientId;
  }

  async create(dto: CreateSessionDto, userId: string) {
    return this.prisma.workoutSession.create({
      data: {
        ...dto,
        userId,
      },
      include: {
        workout: true,
        sets: true,
      },
    });
  }

  async findAll(user: AuthUser, clientId?: string) {
    const userId = await this.resolveTargetUserId(clientId, user);
    return this.prisma.workoutSession.findMany({
      where: { userId },
      include: {
        workout: { include: { workoutPlan: true } },
        sets: { include: { workoutSession: false } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id },
      include: {
        workout: {
          include: {
            exercises: { include: { exercise: true } },
          },
        },
        sets: true,
      },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.userId !== userId) throw new ForbiddenException('No tienes acceso');
    return session;
  }

  async complete(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.workoutSession.update({
      where: { id },
      data: { completed: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.workoutSession.delete({ where: { id } });
  }

  async addSet(sessionId: string, dto: CreateSessionSetDto, userId: string) {
    await this.findOne(sessionId, userId);
    return this.prisma.sessionSet.create({
      data: {
        workoutSessionId: sessionId,
        ...dto,
      },
    });
  }

  async getProgress(user: AuthUser, exerciseId: string, clientId?: string) {
    const userId = await this.resolveTargetUserId(clientId, user);
    const sets = await this.prisma.sessionSet.findMany({
      where: {
        exerciseId,
        workoutSession: { userId },
        completed: true,
        weight: { not: null },
      },
      include: {
        workoutSession: { select: { date: true } },
      },
      orderBy: {
        workoutSession: { date: 'asc' },
      },
    });

    return sets.map(set => ({
      date: set.workoutSession.date,
      weight: set.weight,
      reps: set.reps,
      setNumber: set.setNumber,
      volume: (set.weight || 0) * (set.reps || 0),
    }));
  }

  async getPersonalRecords(user: AuthUser, clientId?: string) {
    const userId = await this.resolveTargetUserId(clientId, user);
    const sets = await this.prisma.sessionSet.findMany({
      where: {
        workoutSession: { userId },
        completed: true,
        weight: { not: null },
      },
      include: {
        workoutSession: { select: { date: true } },
      },
      orderBy: { weight: 'desc' },
    });

    const records: Record<string, any> = {};
    for (const set of sets) {
      if (!records[set.exerciseId]) {
        records[set.exerciseId] = {
          exerciseId: set.exerciseId,
          maxWeight: set.weight,
          reps: set.reps,
          date: set.workoutSession.date,
          volume: (set.weight || 0) * (set.reps || 0),
        };
      }
    }

    return Object.values(records);
  }
}