import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SubscriptionPlan } from '@prisma/client';

export class AdminCreateUserDto {
  @ApiProperty({ example: 'Laura Gómez' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'laura@fittrack.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'cambiame123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Entrenador asignado (solo para clientes)',
  })
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional({
    description:
      'Pedir que cambie la contraseña en el primer acceso (por defecto, sí)',
  })
  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}
