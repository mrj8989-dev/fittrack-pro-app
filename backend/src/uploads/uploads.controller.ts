import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import {
  isPrivateUpload,
  uploadsDir,
  verifyUploadSignature,
} from '../common/uploads';

/**
 * Entrega las fotos subidas. Las de perfil son públicas; las de revisiones exigen el
 * enlace firmado que genera la API (ver signUploadUrl).
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('uploads')
export class UploadsController {
  @Get(':file')
  get(
    @Param('file') file: string,
    @Query('exp') exp: string | undefined,
    @Query('sig') sig: string | undefined,
    @Res() res: Response,
  ) {
    // Solo un nombre de fichero: nada de rutas ("../") para salir de la carpeta.
    if (basename(file) !== file) throw new NotFoundException();

    const isPrivate = isPrivateUpload(file);
    if (isPrivate && !verifyUploadSignature(file, Number(exp), sig)) {
      throw new ForbiddenException('Enlace caducado o no válido');
    }

    const full = join(uploadsDir(), file);
    if (!existsSync(full)) throw new NotFoundException();

    res.setHeader(
      'Cache-Control',
      isPrivate ? 'private, max-age=3600' : 'public, max-age=86400',
    );
    res.sendFile(full);
  }
}
