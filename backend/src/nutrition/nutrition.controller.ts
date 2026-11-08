import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FoodGroup, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FoodsService } from './foods.service';
import { MealPlansService } from './meal-plans.service';
import type { AuthUser } from './meal-plans.service';
import { NutritionProfileService } from './nutrition-profile.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { UpsertNutritionProfileDto } from './dto/upsert-nutrition-profile.dto';
import {
  AddMealDto,
  AddMealItemDto,
  AssignMealPlanDto,
  CreateMealPlanDto,
  RenameMealDto,
  RenameMealPlanDto,
  ScaleMealPlanDto,
  SwapMealItemDto,
  UpdateMealItemDto,
} from './dto/meal-plan.dto';
import { FeatureGuard } from '../access/feature.guard';
import { RequiresFeature } from '../access/requires-feature.decorator';

@ApiTags('nutrition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
@RequiresFeature('nutrition')
@Controller('foods')
export class FoodsController {
  constructor(private foodsService: FoodsService) {}

  @Get()
  @ApiOperation({
    summary: 'Catálogo común de alimentos, valores por 100 g en crudo',
  })
  @ApiQuery({ name: 'group', required: false, enum: FoodGroup })
  findAll(@Query('group') group?: FoodGroup) {
    return this.foodsService.findAll(group);
  }

  @Post()
  @Roles(Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary: 'Añadir un alimento al catálogo (entrenador o admin)',
  })
  create(@Body() dto: CreateFoodDto, @CurrentUser() user: AuthUser) {
    return this.foodsService.create(dto, user);
  }

  @Put(':id')
  @Roles(Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary:
      'Editar un alimento (el entrenador, los suyos; el admin, cualquiera)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFoodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.foodsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar un alimento que no se use en ningún menú',
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.foodsService.remove(id, user);
  }
}

@ApiTags('nutrition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(Role.CLIENT)
@RequiresFeature('nutrition')
@Controller('nutrition/profile')
export class NutritionProfileController {
  constructor(private profileService: NutritionProfileService) {}

  @Get()
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary:
      'Perfil nutricional y objetivos diarios (propios, o de un cliente si eres su entrenador)',
  })
  @ApiQuery({ name: 'clientId', required: false })
  get(@CurrentUser() user: AuthUser, @Query('clientId') clientId?: string) {
    return clientId
      ? this.profileService.getForClient(user, clientId)
      : this.profileService.get(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Crear o actualizar el perfil nutricional' })
  upsert(
    @Body() dto: UpsertNutritionProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.profileService.upsert(user.id, dto);
  }
}

@ApiTags('nutrition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(Role.TRAINER, Role.ADMIN)
@RequiresFeature('nutrition')
@Controller('meal-plans')
export class MealPlansController {
  constructor(private mealPlansService: MealPlansService) {}

  @Get('templates')
  @ApiOperation({
    summary:
      'Plantillas visibles para ti, con su media diaria de kcal y macros',
  })
  findTemplates(@CurrentUser() user: AuthUser) {
    return this.mealPlansService.findTemplates(user);
  }

  @Get()
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary:
      'Menús de un cliente: los tuyos, o los de un cliente si eres su entrenador',
  })
  @ApiQuery({ name: 'clientId', required: false })
  findForClient(
    @CurrentUser() user: AuthUser,
    @Query('clientId') clientId?: string,
  ) {
    return this.mealPlansService.findForClient(user, clientId);
  }

  @Get(':id')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary: 'Menú completo por días y comidas, con totales calculados',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.mealPlansService.findOne(id, user);
  }

  @Post()
  @ApiOperation({
    summary:
      'Crear un menú de cero o a partir de otro (el cliente crea menús; entrenador y admin, plantillas)',
  })
  create(@Body() dto: CreateMealPlanDto, @CurrentUser() user: AuthUser) {
    return this.mealPlansService.create(dto, user);
  }

  @Post(':id/assign')
  @Roles(Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary:
      'Asignar a un cliente una copia del menú (opcionalmente ajustada a sus kcal)',
  })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignMealPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.assign(id, dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renombrar un menú' })
  rename(
    @Param('id') id: string,
    @Body() dto: RenameMealPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.rename(id, dto.name, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un menú' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.mealPlansService.remove(id, user);
  }

  @Post(':id/scale')
  @ApiOperation({
    summary: 'Ajustar las cantidades para que cada día sume las kcal indicadas',
  })
  scale(
    @Param('id') id: string,
    @Body() dto: ScaleMealPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.scale(id, dto, user);
  }

  @Post(':id/meals')
  @ApiOperation({ summary: 'Añadir una comida a un día' })
  addMeal(
    @Param('id') id: string,
    @Body() dto: AddMealDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.addMeal(id, dto, user);
  }

  @Patch(':id/meals/:mealId')
  @ApiOperation({ summary: 'Renombrar una comida' })
  renameMeal(
    @Param('id') id: string,
    @Param('mealId') mealId: string,
    @Body() dto: RenameMealDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.renameMeal(id, mealId, dto.name, user);
  }

  @Delete(':id/meals/:mealId')
  @ApiOperation({ summary: 'Eliminar una comida y sus alimentos' })
  removeMeal(
    @Param('id') id: string,
    @Param('mealId') mealId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.removeMeal(id, mealId, user);
  }

  @Post(':id/meals/:mealId/items')
  @ApiOperation({ summary: 'Añadir un alimento a una comida' })
  addItem(
    @Param('id') id: string,
    @Param('mealId') mealId: string,
    @Body() dto: AddMealItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.addItem(id, mealId, dto, user);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Cambiar los gramos de un alimento' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMealItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.updateItem(id, itemId, dto.grams, user);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Quitar un alimento de una comida' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.removeItem(id, itemId, user);
  }

  @Get(':id/items/:itemId/swap-options')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary:
      'Alternativas del mismo grupo con la cantidad equivalente calculada',
  })
  swapOptions(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.swapOptions(id, itemId, user);
  }

  @Post(':id/items/:itemId/swap')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({
    summary:
      'Cambiar un alimento por otro recalculando los gramos (p. ej. arroz → patata)',
  })
  swap(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: SwapMealItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mealPlansService.swap(id, itemId, dto.foodId, user);
  }
}
