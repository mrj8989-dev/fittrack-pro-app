import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { AddExerciseDto } from './dto/add-exercise.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { Role } from '@prisma/client';

type AuthUser = { id: string; role: Role };

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkoutDto, user: AuthUser) {
    // Verificar que el plan es accesible (dueño, o su entrenador)
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
      include: { user: { select: { trainerId: true } } },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!this.canAccess(plan.userId, plan.user.trainerId, user)) {
      throw new ForbiddenException('No tienes acceso a este plan');
    }

    return this.prisma.workout.create({
      data: dto,
      include: { exercises: { include: { exercise: true } } },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
        workoutPlan: { include: { user: { select: { trainerId: true } } } },
      },
    });
    if (!workout) throw new NotFoundException('Workout no encontrado');
    if (!this.canAccess(workout.workoutPlan.userId, workout.workoutPlan.user.trainerId, user)) {
      throw new ForbiddenException('No tienes acceso');
    }
    return workout;
  }

  async update(id: string, dto: UpdateWorkoutDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.workout.update({
      where: { id },
      data: dto,
      include: { exercises: { include: { exercise: true } } },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.workout.delete({ where: { id } });
  }

  async addExercise(workoutId: string, dto: AddExerciseDto, user: AuthUser) {
    await this.findOne(workoutId, user);
    return this.prisma.workoutExercise.create({
      data: {
        workoutId,
        ...dto,
      },
      include: { exercise: true },
    });
  }

  async removeExercise(workoutId: string, exerciseId: string, user: AuthUser) {
    await this.findOne(workoutId, user);
    return this.prisma.workoutExercise.delete({
      where: { id: exerciseId },
    });
  }

  async reorderExercises(workoutId: string, dto: ReorderExercisesDto, user: AuthUser) {
    const workout = await this.findOne(workoutId, user);

    const currentIds = new Set(workout.exercises.map(e => e.id));
    const sameSet =
      dto.orderedIds.length === currentIds.size &&
      dto.orderedIds.every(id => currentIds.has(id));
    if (!sameSet) {
      throw new BadRequestException('orderedIds debe contener exactamente los ejercicios del workout');
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((exerciseId, index) =>
        this.prisma.workoutExercise.update({
          where: { id: exerciseId },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.findOne(workoutId, user);
  }

  /** Un workout es accesible por el dueño del plan al que pertenece, o por su entrenador asignado. */
  private canAccess(planOwnerId: string, planOwnerTrainerId: string | null, user: AuthUser) {
    if (planOwnerId === user.id) return true;
    return user.role === Role.TRAINER && planOwnerTrainerId === user.id;
  }
}