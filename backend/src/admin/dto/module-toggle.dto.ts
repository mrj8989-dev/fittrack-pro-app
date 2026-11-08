import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetModuleDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

export class SetUserModuleDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'true/false fuerza el módulo; null vuelve a lo que diga su plan',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean | null;
}
