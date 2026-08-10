import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkoutPlanDto {
  @ApiProperty({ example: 'Plan fuerza 12 semanas' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Plan enfocado en ganar fuerza máxima' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Solo para entrenadores: id del cliente para el que se crea el plan', example: 'uuid-del-cliente' })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}