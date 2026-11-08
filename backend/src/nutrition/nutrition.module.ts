import { Module } from '@nestjs/common';
import { FoodsService } from './foods.service';
import { MealPlansService } from './meal-plans.service';
import { NutritionProfileService } from './nutrition-profile.service';
import {
  FoodsController,
  MealPlansController,
  NutritionProfileController,
} from './nutrition.controller';

@Module({
  controllers: [
    FoodsController,
    NutritionProfileController,
    MealPlansController,
  ],
  providers: [FoodsService, MealPlansService, NutritionProfileService],
  exports: [NutritionProfileService],
})
export class NutritionModule {}
