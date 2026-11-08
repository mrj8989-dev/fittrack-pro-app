import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBodyRevisionDto } from './dto/create-body-revision.dto';
import { UpdateRevisionIntervalDto } from './dto/update-revision-interval.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BodyRevisionsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateBodyRevisionDto,
    userId: string,
    files?: {
      photoFront?: Express.Multer.File[];
      photoBack?: Express.Multer.File[];
      photoSide?: Express.Multer.File[];
    },
  ) {
    const photoFront = files?.photoFront?.[0]?.filename
      ? `/uploads/${files.photoFront[0].filename}`
      : null;
    const photoBack = files?.photoBack?.[0]?.filename
      ? `/uploads/${files.photoBack[0].filename}`
      : null;
    const photoSide = files?.photoSide?.[0]?.filename
      ? `/uploads/${files.photoSide[0].filename}`
      : null;

    return this.prisma.bodyRevision.create({
      data: {
        ...dto,
        userId,
        photoFront,
        photoBack,
        photoSide,
      },
    });
  }

  /**
   * De quién se consultan las revisiones: las propias, las de un cliente si eres su entrenador,
   * o las de cualquiera si eres admin. Solo lectura: crear y borrar sigue siendo del cliente.
   */
  async resolveTargetUserId(user: { id: string; role: Role }, clientId?: string) {
    if (!clientId || clientId === user.id) return user.id;
    if (user.role === Role.ADMIN) return clientId;
    if (user.role !== Role.TRAINER) {
      throw new ForbiddenException('Solo un entrenador puede ver las revisiones de otro usuario');
    }
    const client = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!client || client.trainerId !== user.id) {
      throw new ForbiddenException('Ese usuario no está en tu cartera de clientes');
    }
    return clientId;
  }

  async findAll(userId: string) {
    return this.prisma.bodyRevision.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const revision = await this.prisma.bodyRevision.findUnique({
      where: { id },
    });
    if (!revision) throw new NotFoundException('Revisión no encontrada');
    if (revision.userId !== userId) throw new NotFoundException('Revisión no encontrada');
    return revision;
  }

  async remove(id: string, userId: string) {
    const revision = await this.findOne(id, userId);

    // Eliminar fotos del servidor si existen
    const photos = [revision.photoFront, revision.photoBack, revision.photoSide];
    for (const photo of photos) {
      if (photo) {
        const filePath = path.join(process.cwd(), 'public', photo);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    return this.prisma.bodyRevision.delete({ where: { id } });
  }

  async getWeightProgress(userId: string) {
    const revisions = await this.prisma.bodyRevision.findMany({
      where: { userId },
      select: {
        date: true,
        weight: true,
        bodyFat: true,
        chestCm: true,
        waistCm: true,
        armsCm: true,
        legsCm: true,
      },
      orderBy: { date: 'asc' },
    });
    return revisions;
  }

  async getNextRevisionDate(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { revisionInterval: true },
    });

    const lastRevision = await this.prisma.bodyRevision.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const revisionInterval = user?.revisionInterval || 14;

    // Sin revisiones previas, toca hacer la primera hoy.
    if (!lastRevision) {
      return { nextRevisionDate: new Date(), daysUntilRevision: 0, revisionInterval };
    }

    const nextDate = new Date(lastRevision.date);
    nextDate.setDate(nextDate.getDate() + revisionInterval);

    const today = new Date();
    const daysUntilRevision = Math.ceil(
      (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      nextRevisionDate: nextDate,
      daysUntilRevision: Math.max(0, daysUntilRevision),
      lastRevisionDate: lastRevision.date,
      revisionInterval,
    };
  }

  async updateRevisionInterval(userId: string, dto: UpdateRevisionIntervalDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { revisionInterval: dto.revisionInterval },
      select: { id: true, revisionInterval: true },
    });
  }
}