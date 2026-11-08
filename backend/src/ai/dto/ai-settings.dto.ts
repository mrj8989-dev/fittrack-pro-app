import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export const AI_TONES = ['friendly', 'technical', 'motivational'] as const;
export const AI_DETAILS = ['brief', 'detailed'] as const;

export class UpdateAiSettingsDto {
  @ApiPropertyOptional({ enum: AI_TONES })
  @IsOptional()
  @IsIn(AI_TONES)
  tone?: string;

  @ApiPropertyOptional({ enum: AI_DETAILS })
  @IsOptional()
  @IsIn(AI_DETAILS)
  detail?: string;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  goal?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  limitations?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() shareTraining?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shareSessions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shareRevisions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shareNutrition?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Solo admin. null = el de su plan (o sin límite con clave propia)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(1000)
  dailyLimit?: number | null;
}

export class SetAiApiKeyDto {
  @ApiProperty({ description: 'Clave de API de Anthropic (sk-ant-...)' })
  @IsString()
  @MinLength(20)
  @MaxLength(300)
  apiKey: string;
}
