import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CopyWorkoutPlanDto {
  @ApiPropertyOptional({
    description:
      'Cliente que recibe la copia. Si se omite (y no es plantilla), se duplica para el mismo dueño.',
  })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @ApiPropertyOptional({ description: 'Guardar la copia como plantilla propia' })
  @IsOptional()
  @IsBoolean()
  asTemplate?: boolean;

  @ApiPropertyOptional({ example: 'Hipertrofia 4 días' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
