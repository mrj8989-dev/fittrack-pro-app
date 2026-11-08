import {
  Controller, Get, Post, Delete, Put,
  Body, Param, Query, UseGuards, UseInterceptors, UploadedFiles
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BodyRevisionsService } from './body-revisions.service';
import { CreateBodyRevisionDto } from './dto/create-body-revision.dto';
import { UpdateRevisionIntervalDto } from './dto/update-revision-interval.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { FeatureGuard } from '../access/feature.guard';
import { RequiresFeature } from '../access/requires-feature.decorator';

const storage = diskStorage({
  destination: './public/uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `revision-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('body-revisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(Role.CLIENT)
@RequiresFeature('revisions')
@Controller('body-revisions')
export class BodyRevisionsController {
  constructor(private bodyRevisionsService: BodyRevisionsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear revisión corporal con fotos opcionales' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'photoFront', maxCount: 1 },
    { name: 'photoBack', maxCount: 1 },
    { name: 'photoSide', maxCount: 1 },
  ], { storage }))
  create(
    @Body() dto: CreateBodyRevisionDto,
    @CurrentUser() user: any,
    @UploadedFiles() files: {
      photoFront?: Express.Multer.File[];
      photoBack?: Express.Multer.File[];
      photoSide?: Express.Multer.File[];
    },
  ) {
    return this.bodyRevisionsService.create(dto, user.id, files);
  }

  @Get()
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({ summary: 'Historial de revisiones (propio, o de un cliente si eres su entrenador o admin)' })
  @ApiQuery({ name: 'clientId', required: false })
  async findAll(@CurrentUser() user: any, @Query('clientId') clientId?: string) {
    return this.bodyRevisionsService.findAll(await this.bodyRevisionsService.resolveTargetUserId(user, clientId));
  }

  @Get('progress')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({ summary: 'Progreso de peso y medidas (propio o de un cliente)' })
  @ApiQuery({ name: 'clientId', required: false })
  async getWeightProgress(@CurrentUser() user: any, @Query('clientId') clientId?: string) {
    return this.bodyRevisionsService.getWeightProgress(await this.bodyRevisionsService.resolveTargetUserId(user, clientId));
  }

  @Get('next-revision')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @ApiOperation({ summary: 'Fecha de la próxima revisión (propia o de un cliente)' })
  @ApiQuery({ name: 'clientId', required: false })
  async getNextRevisionDate(@CurrentUser() user: any, @Query('clientId') clientId?: string) {
    return this.bodyRevisionsService.getNextRevisionDate(await this.bodyRevisionsService.resolveTargetUserId(user, clientId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener revisión por id' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.bodyRevisionsService.findOne(id, user.id);
  }

  @Put('interval')
  @ApiOperation({ summary: 'Actualizar intervalo de revisiones' })
  updateRevisionInterval(
    @Body() dto: UpdateRevisionIntervalDto,
    @CurrentUser() user: any,
  ) {
    return this.bodyRevisionsService.updateRevisionInterval(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar revisión' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.bodyRevisionsService.remove(id, user.id);
  }
}