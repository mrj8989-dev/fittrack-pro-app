import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignClientDto {
  @ApiProperty({ example: 'cliente@fittrack.com' })
  @IsEmail()
  email: string;
}
