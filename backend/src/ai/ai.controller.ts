import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FeatureGuard } from '../access/feature.guard';
import { RequiresFeature } from '../access/requires-feature.decorator';
import type { AccessUser } from '../access/access.service';
import { AiService } from './ai.service';
import { AiSettingsService } from './ai-settings.service';
import { SetAiApiKeyDto, UpdateAiSettingsDto } from './dto/ai-settings.dto';

class ChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(Role.CLIENT)
@RequiresFeature('ai')
@Controller('ai')
export class AiController {
  constructor(
    private ai: AiService,
    private settings: AiSettingsService,
  ) {}

  // ── Configuración propia ──────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Mi configuración del asistente (sin la clave)' })
  async getSettings(@CurrentUser() user: AccessUser) {
    return this.settings.toView(await this.settings.get(user.id));
  }

  @Put('settings')
  @ApiOperation({
    summary: 'Cambiar mis preferencias y qué datos ve el asistente',
  })
  updateSettings(
    @CurrentUser() user: AccessUser,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    return this.settings.update(user.id, dto, false);
  }

  @Put('settings/api-key')
  @ApiOperation({
    summary:
      'Usar mi propia clave de API de Anthropic (se comprueba y se guarda cifrada)',
  })
  setApiKey(@CurrentUser() user: AccessUser, @Body() dto: SetAiApiKeyDto) {
    return this.settings.setApiKey(user.id, dto.apiKey);
  }

  @Delete('settings/api-key')
  @ApiOperation({
    summary: 'Quitar mi clave propia y volver a la del servidor',
  })
  clearApiKey(@CurrentUser() user: AccessUser) {
    return this.settings.clearApiKey(user.id);
  }

  @Get('conversation')
  @ApiOperation({
    summary: 'Conversación actual con el asistente y mensajes restantes hoy',
  })
  getConversation(@CurrentUser() user: AccessUser) {
    return this.ai.getConversation(user);
  }

  @Delete('conversation')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Empezar una conversación nueva (la anterior se archiva)',
  })
  async archive(@CurrentUser() user: AccessUser) {
    await this.ai.archiveConversation(user.id);
  }

  /**
   * Responde en streaming (Server-Sent Events): eventos `text` con cada trozo, y al final
   * `done` (con el uso del día) o `error`. Los errores previos (límite, configuración)
   * se devuelven como respuesta HTTP normal antes de abrir el stream.
   */
  @Post('chat')
  @ApiOperation({
    summary: 'Enviar un mensaje al asistente (respuesta en streaming SSE)',
  })
  async chat(
    @Body() dto: ChatDto,
    @CurrentUser() user: AccessUser,
    @Res() res: Response,
  ) {
    await this.ai.assertCanChat(user, dto.message);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const send = (event: object) =>
      res.write(`data: ${JSON.stringify(event)}\n\n`);

    // Si el cliente cierra la conexión, se corta la petición a la API y no se gasta el mensaje.
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort();
    });

    try {
      const result = await this.ai.chat(
        user,
        dto.message,
        (text) => send({ type: 'text', text }),
        abort.signal,
      );
      send({ type: 'done', ...result });
    } catch (error) {
      if (!abort.signal.aborted) {
        send({
          type: 'error',
          message:
            error instanceof HttpException
              ? error.message
              : 'El asistente no ha podido responder.',
        });
      }
    } finally {
      res.end();
    }
  }
}
