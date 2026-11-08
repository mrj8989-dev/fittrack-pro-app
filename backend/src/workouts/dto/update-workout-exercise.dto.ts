import { PartialType, PickType } from '@nestjs/swagger';
import { AddExerciseDto } from './add-exercise.dto';

/** Cambiar series, repeticiones, duración o descanso de un ejercicio ya en el día. */
export class UpdateWorkoutExerciseDto extends PartialType(
  PickType(AddExerciseDto, ['sets', 'reps', 'duration', 'restTime'] as const),
) {}
