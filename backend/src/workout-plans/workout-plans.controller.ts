import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkoutPlansService } from './workout-plans.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('workout-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workout-plans')
export class WorkoutPlansController {
  constructor(private workoutPlansService: WorkoutPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Crear plan de entrenamiento' })
  create(
    @Body() dto: CreateWorkoutPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.workoutPlansService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener planes de entrenamiento (propios, o de un cliente si eres su entrenador)' })
  @ApiQuery({ name: 'clientId', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
  ) {
    return this.workoutPlansService.findAll(user, clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plan por id' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.workoutPlansService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plan de entrenamiento' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.workoutPlansService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plan de entrenamiento' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.workoutPlansService.remove(id, user);
  }
}