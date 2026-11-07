import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodGroup } from '@prisma/client';

export class CreateFoodDto {
  @ApiProperty({ example: 'Requesón' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: FoodGroup, example: FoodGroup.PROTEIN })
  @IsEnum(FoodGroup)
  group: FoodGroup;

  @ApiProperty({ example: 98, description: 'kcal por 100 g en crudo' })
  @IsNumber()
  @Min(0)
  @Max(900)
  kcal: number;

  @ApiProperty({ example: 11, description: 'g de proteína por 100 g' })
  @IsNumber()
  @Min(0)
  @Max(100)
  protein: number;

  @ApiProperty({ example: 3.4, description: 'g de hidratos por 100 g' })
  @IsNumber()
  @Min(0)
  @Max(100)
  carbs: number;

  @ApiProperty({ example: 4.3, description: 'g de grasa por 100 g' })
  @IsNumber()
  @Min(0)
  @Max(100)
  fat: number;

  @ApiPropertyOptional({ example: 'unidad' })
  @IsOptional()
  @IsString()
  unitName?: string;

  @ApiPropertyOptional({
    example: 125,
    description: 'Gramos que pesa una unidad',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  gramsPerUnit?: number;
}
