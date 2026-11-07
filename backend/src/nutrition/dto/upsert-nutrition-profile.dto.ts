import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityLevel, NutritionGoal, Sex } from '@prisma/client';

export class UpsertNutritionProfileDto {
  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ example: '1992-04-15' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: 178 })
  @IsNumber()
  @Min(120)
  @Max(230)
  heightCm: number;

  @ApiPropertyOptional({
    example: 78,
    description: 'Solo si no tienes revisiones corporales con peso',
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  weightKg?: number;

  @ApiProperty({ enum: ActivityLevel })
  @IsEnum(ActivityLevel)
  activityLevel: ActivityLevel;

  @ApiProperty({ enum: NutritionGoal })
  @IsEnum(NutritionGoal)
  goal: NutritionGoal;
}
