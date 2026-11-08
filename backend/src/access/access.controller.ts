import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessService } from './access.service';
import type { AccessUser } from './access.service';
import { AI_DAILY_LIMIT } from './plan-features';

@ApiTags('access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('access')
export class AccessController {
  constructor(private access: AccessService) {}

  @Get('me')
  @ApiOperation({
    summary:
      'Módulos a los que tiene acceso el usuario autenticado y por qué (plan, interruptor general o excepción)',
  })
  async me(@CurrentUser() user: AccessUser) {
    return {
      plan: user.role === 'CLIENT' ? user.subscriptionPlan : null,
      aiDailyLimit:
        user.role === 'CLIENT' ? AI_DAILY_LIMIT[user.subscriptionPlan] : null,
      features: await this.access.resolveAll(user),
    };
  }
}
