import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { AddExerciseDto } from './dto/add-exercise.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { UpdateWorkoutExerciseDto } from './dto/update-workout-exercise.dto';
import {
  AuthUser,
  canEditPlan,
  canReadPlan,
  ownerSelect,
} from '../workout-plans/plan-access';

const workoutInclude = {
  exercises: {
    include: { exercise: true },
    orderBy: { order: 'asc' as const },
  },
  workoutPlan: { include: ownerSelect },
};

/** Días de un plan y sus ejercicios. Los permisos son los del plan al que pertenecen. */
@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkoutDto, user: AuthUser) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
      include: ownerSelect,
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!canEditPlan(plan, user)) {
      throw new ForbiddenException('No puedes modificar este plan');
    }

    return this.prisma.workout.create({
      data: dto,
      include: { exercises: { include: { exercise: true } } },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const workout = await this.load(id);
    if (!canReadPlan(workout.workoutPlan, user)) {
      throw new ForbiddenException('No tienes acceso');
    }
    return this.view(workout);
  }

  async update(id: string, dto: UpdateWorkoutDto, user: AuthUser) {
    await this.loadEditable(id, user);
    return this.prisma.workout.update({
      where: { id },
      data: { name: dto.name, dayOfWeek: dto.dayOfWeek },
      include: { exercises: { include: { exercise: true } } },
    });
  }

  /** Borra el día y sus ejercicios; las sesiones hechas se quedan en el historial con su nombre. */
  async remove(id: string, user: AuthUser) {
    await this.loadEditable(id, user);
    await this.prisma.workout.delete({ where: { id } });
    return { id };
  }

  async addExercise(workoutId: string, dto: AddExerciseDto, user: AuthUser) {
    const workout = await this.loadEditable(workoutId, user);
    const exists = await this.prisma.exercise.count({
      where: { id: dto.exerciseId },
    });
    if (!exists) throw new NotFoundException('Ejercicio no encontrado');

    const last = workout.exercises.reduce((m, e) => Math.max(m, e.order), 0);
    return this.prisma.workoutExercise.create({
      data: { workoutId, ...dto, order: dto.order ?? last + 1 },
      include: { exercise: true },
    });
  }

  async updateExercise(
    workoutId: string,
    workoutExerciseId: string,
    dto: UpdateWorkoutExerciseDto,
    user: AuthUser,
  ) {
    const workout = await this.loadEditable(workoutId, user);
    this.assertInWorkout(workout, workoutExerciseId);
    return this.prisma.workoutExercise.update({
      where: { id: workoutExerciseId },
      data: {
        sets: dto.sets,
        reps: dto.reps,
        duration: dto.duration,
        restTime: dto.restTime,
      },
      include: { exercise: true },
    });
  }

  async removeExercise(
    workoutId: string,
    workoutExerciseId: string,
    user: AuthUser,
  ) {
    const workout = await this.loadEditable(workoutId, user);
    this.assertInWorkout(workout, workoutExerciseId);
    await this.prisma.workoutExercise.delete({
      where: { id: workoutExerciseId },
    });
    return { id: workoutExerciseId };
  }

  async reorderExercises(
    workoutId: string,
    dto: ReorderExercisesDto,
    user: AuthUser,
  ) {
    const workout = await this.loadEditable(workoutId, user);

    const currentIds = new Set(workout.exercises.map((e) => e.id));
    const sameSet =
      dto.orderedIds.length === currentIds.size &&
      dto.orderedIds.every((id) => currentIds.has(id));
    if (!sameSet) {
      throw new BadRequestException(
        'orderedIds debe contener exactamente los ejercicios del workout',
      );
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

  private async load(id: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: workoutInclude,
    });
    if (!workout) throw new NotFoundException('Workout no encontrado');
    return workout;
  }

  private async loadEditable(id: string, user: AuthUser) {
    const workout = await this.load(id);
    if (!canEditPlan(workout.workoutPlan, user)) {
      throw new ForbiddenException('No puedes modificar este plan');
    }
    return workout;
  }

  /** Evita tocar, desde un día propio, ejercicios de otro plan. */
  private assertInWorkout(
    workout: { exercises: { id: string }[] },
    workoutExerciseId: string,
  ) {
    if (!workout.exercises.some((e) => e.id === workoutExerciseId)) {
      throw new NotFoundException('Ese ejercicio no está en este día');
    }
  }

  private view(workout: Awaited<ReturnType<WorkoutsService['load']>>) {
    const { workoutPlan, ...rest } = workout;
    return {
      ...rest,
      workoutPlan: {
        id: workoutPlan.id,
        name: workoutPlan.name,
        isTemplate: workoutPlan.isTemplate,
      },
    };
  }
}
