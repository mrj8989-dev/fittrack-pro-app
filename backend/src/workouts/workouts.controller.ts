import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { AddExerciseDto } from './dto/add-exercise.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear workout dentro de un plan' })
  create(
    @Body() dto: CreateWorkoutDto,
    @CurrentUser() user: any,
  ) {
    return this.workoutsService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener workout por id con ejercicios' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.workoutsService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar workout' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutDto,
    @CurrentUser() user: any,
  ) {
    return this.workoutsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar workout' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.workoutsService.remove(id, user);
  }

  @Post(':id/exercises')
  @ApiOperation({ summary: 'Añadir ejercicio a un workout' })
  addExercise(
    @Param('id') id: string,
    @Body() dto: AddExerciseDto,
    @CurrentUser() user: any,
  ) {
    return this.workoutsService.addExercise(id, dto, user);
  }

  @Patch(':id/exercises/reorder')
  @ApiOperation({ summary: 'Reordenar los ejercicios de un workout' })
  reorderExercises(
    @Param('id') id: string,
    @Body() dto: ReorderExercisesDto,
    @CurrentUser() user: any,
  ) {
    return this.workoutsService.reorderExercises(id, dto, user);
  }

  @Delete(':id/exercises/:exerciseId')
  @ApiOperation({ summary: 'Eliminar ejercicio de un workout' })
  removeExercise(
    @Param('id') id: string,
    @Param('exerciseId') exerciseId: string,
    @CurrentUser() user: any,
  ) {
    return this.workoutsService.removeExercise(id, exerciseId, user);
  }
}