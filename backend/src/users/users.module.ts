import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TrainerDashboardService } from './trainer-dashboard.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, TrainerDashboardService],
  exports: [UsersService],
})
export class UsersModule {}