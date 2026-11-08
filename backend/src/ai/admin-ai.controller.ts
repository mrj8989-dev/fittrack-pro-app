import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiSettingsService } from './ai-settings.service';
import { SetAiApiKeyDto, UpdateAiSettingsDto } from './dto/ai-settings.dto';

/** El admin gestiona la configuración del asistente de cualquier usuario, límite diario incluido. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users/:id/ai')
export class AdminAiController {
  constructor(
    private settings: AiSettingsService,
    private prisma: PrismaService,
  ) {}

  private async assertUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
  }

  @Get()
  @ApiOperation({ summary: 'Configuración del asistente de un usuario' })
  async get(@Param('id') id: string) {
    await this.assertUser(id);
    return this.settings.toView(await this.settings.get(id));
  }

  @Put()
  @ApiOperation({
    summary:
      'Cambiar preferencias, datos compartidos y límite diario de un usuario',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateAiSettingsDto) {
    await this.assertUser(id);
    return this.settings.update(id, dto, true);
  }

  @Put('api-key')
  @ApiOperation({ summary: 'Poner una clave de API propia a un usuario' })
  async setApiKey(@Param('id') id: string, @Body() dto: SetAiApiKeyDto) {
    await this.assertUser(id);
    return this.settings.setApiKey(id, dto.apiKey);
  }

  @Delete('api-key')
  @ApiOperation({ summary: 'Quitar la clave propia de un usuario' })
  async clearApiKey(@Param('id') id: string) {
    await this.assertUser(id);
    return this.settings.clearApiKey(id);
  }
}
