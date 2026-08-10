import { IsUUID, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'uuid-del-destinatario' })
  @IsUUID()
  receiverId: string;

  @ApiProperty({ example: 'Hola, ¿cómo va esa recuperación?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
