import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignClientDto {
  @ApiProperty({ example: 'cliente@fittrack.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Nombre del cliente si hay que darlo de alta',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    description: 'Contraseña inicial si hay que darlo de alta',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
