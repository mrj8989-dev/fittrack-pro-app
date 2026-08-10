import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { AssignClientDto } from './dto/assign-client.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

const photoStorage = diskStorage({
  destination: './public/uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('clients')
  @ApiOperation({ summary: 'Obtener clientes del entrenador autenticado' })
  findClients(@CurrentUser() user: any) {
    return this.usersService.findClientsByTrainer(user.id);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Asignar un cliente existente (por email) al entrenador autenticado' })
  assignClient(
    @Body() dto: AssignClientDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.assignClient(dto.email, user.id);
  }

  @Delete('clients/:clientId')
  @ApiOperation({ summary: 'Desasignar un cliente de la cartera del entrenador' })
  unassignClient(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.unassignClient(clientId, user.id);
  }

  @Get('my-trainer')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Obtener el entrenador asignado al cliente autenticado (o null)' })
  findMyTrainer(@CurrentUser() user: any) {
    return this.usersService.findMyTrainer(user.trainerId);
  }

  @Post('me/photo')
  @Roles()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  @ApiOperation({ summary: 'Subir o actualizar tu propia foto de perfil (cualquier rol)' })
  uploadMyPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateProfilePhoto(user.id, file?.filename);
  }
}
