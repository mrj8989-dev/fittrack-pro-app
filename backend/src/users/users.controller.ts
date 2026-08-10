import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AssignClientDto } from './dto/assign-client.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('clients')
  @ApiOperation({ summary: 'Obtener clientes del entrenador autenticado' })
  findClients(@CurrentUser() user: any) {
    return this.usersService.findClientsByTrainer(user.id);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Asignar un cliente existente (por email) al entrenador autenticado' })
  assignClient(
    @Body() dto: AssignClientDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.assignClient(dto.email, user.id);
  }

  @Delete('clients/:clientId')
  @ApiOperation({ summary: 'Desasignar un cliente de la cartera del entrenador' })
  unassignClient(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.unassignClient(clientId, user.id);
  }

  @Get('my-trainer')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Obtener el entrenador asignado al cliente autenticado (o null)' })
  findMyTrainer(@CurrentUser() user: any) {
    return this.usersService.findMyTrainer(user.trainerId);
  }
}
