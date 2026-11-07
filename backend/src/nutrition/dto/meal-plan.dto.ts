import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMealPlanDto {
  @ApiPropertyOptional({
    description:
      'Menú o plantilla del que se copia. Sin él, se crea un menú vacío.',
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({
    example: 'Mi menú de definición',
    description: 'Obligatorio al crear de cero',
  })
  @ValidateIf((o: CreateMealPlanDto) => !o.sourceId || o.name !== undefined)
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    example: 2000,
    description: 'Si se indica, cada día se ajusta a estas kcal',
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(6000)
  targetKcal?: number;
}

export class AssignMealPlanDto {
  @ApiProperty({ description: 'Cliente al que se asigna una copia del menú' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({
    example: 2100,
    description: 'Si se indica, cada día se ajusta a estas kcal',
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(6000)
  targetKcal?: number;

  @ApiPropertyOptional({ example: 'Menú definición — Ana' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

export class AddMealDto {
  @ApiProperty({ example: 1, description: '1 = lunes … 7 = domingo' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({ example: 'Merienda' })
  @IsString()
  @MinLength(2)
  name: string;
}

export class RenameMealDto {
  @ApiProperty({ example: 'Merienda' })
  @IsString()
  @MinLength(2)
  name: string;
}

export class RenameMealPlanDto {
  @ApiProperty({ example: 'Menú volumen invierno' })
  @IsString()
  @MinLength(2)
  name: string;
}

export class ScaleMealPlanDto {
  @ApiProperty({ example: 2200 })
  @IsNumber()
  @Min(1000)
  @Max(6000)
  targetKcal: number;
}

export class AddMealItemDto {
  @ApiProperty()
  @IsString()
  foodId: string;

  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(1)
  @Max(2000)
  grams: number;
}

export class UpdateMealItemDto {
  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  @Max(2000)
  grams: number;
}

export class SwapMealItemDto {
  @ApiProperty({ description: 'Alimento por el que se cambia' })
  @IsString()
  foodId: string;
}
