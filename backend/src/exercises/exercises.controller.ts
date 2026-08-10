import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TRAINER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear ejercicio (entrenador o admin)' })
  create(@Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los ejercicios con filtros opcionales' })
  @ApiQuery({ name: 'muscleGroup', required: false, example: 'Pecho' })
  @ApiQuery({ name: 'equipment', required: false, example: 'Barra' })
  findAll(
    @Query('muscleGroup') muscleGroup?: string,
    @Query('equipment') equipment?: string,
  ) {
    return this.exercisesService.findAll(muscleGroup, equipment);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ejercicio por id' })
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.TRAINER, Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar ejercicio (entrenador o admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.exercisesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.TRAINER, Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar ejercicio (entrenador o admin)' })
  remove(@Param('id') id: string) {
    return this.exercisesService.remove(id);
  }
}