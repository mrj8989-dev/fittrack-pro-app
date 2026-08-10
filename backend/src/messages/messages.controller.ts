import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Enviar un mensaje a tu entrenador o a uno de tus clientes' })
  send(
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.send(dto, user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Obtener número de mensajes sin leer' })
  getUnreadCount(@CurrentUser() user: any) {
    return this.messagesService.getUnreadCount(user.id);
  }

  @Get(':otherUserId')
  @ApiOperation({ summary: 'Obtener el hilo de conversación con otro usuario (marca como leídos)' })
  getThread(
    @Param('otherUserId') otherUserId: string,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.getThread(user.id, otherUserId);
  }
}
