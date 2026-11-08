import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiSettingsService } from './ai-settings.service';
import { AdminAiController } from './admin-ai.controller';

@Module({
  imports: [NutritionModule],
  controllers: [AiController, AdminAiController],
  providers: [AiService, AiSettingsService],
})
export class AiModule {}
