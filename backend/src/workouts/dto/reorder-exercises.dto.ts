import { IsArray, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderExercisesDto {
  @ApiProperty({ description: 'Ids de WorkoutExercise en el nuevo orden', example: ['uuid-1', 'uuid-2', 'uuid-3'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds: string[];
}
