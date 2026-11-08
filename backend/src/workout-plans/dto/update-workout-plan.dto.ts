import { PartialType, PickType } from '@nestjs/swagger';
import { CreateWorkoutPlanDto } from './create-workout-plan.dto';

/** Solo nombre y descripción: el dueño de un plan no cambia (para eso está copiar). */
export class UpdateWorkoutPlanDto extends PartialType(
  PickType(CreateWorkoutPlanDto, ['name', 'description'] as const),
) {}
