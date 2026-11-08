import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SubscriptionPlan } from '@prisma/client';

export class AdminUpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Nueva contraseña (restablecer)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Entrenador asignado; null para quitarlo',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  trainerId?: string | null;

  @ApiPropertyOptional({ minimum: 7, maximum: 28 })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(28)
  revisionInterval?: number;

  @ApiPropertyOptional({
    description:
      'false desactiva la cuenta: no puede iniciar sesión pero conserva sus datos',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Pedir un cambio de contraseña en el siguiente acceso',
  })
  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}
