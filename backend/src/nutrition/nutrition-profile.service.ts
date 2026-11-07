import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertNutritionProfileDto } from './dto/upsert-nutrition-profile.dto';
import { ageFrom, computeTargets } from './nutrition.calc';

@Injectable()
export class NutritionProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Perfil + objetivos diarios calculados. El peso sale de la última revisión corporal
   * (es el dato más fiable y actualizado); el peso del perfil solo se usa si no hay ninguna.
   */
  async get(userId: string) {
    const [profile, lastRevision] = await Promise.all([
      this.prisma.nutritionProfile.findUnique({ where: { userId } }),
      this.prisma.bodyRevision.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: { weight: true, date: true },
      }),
    ]);

    const weightKg = lastRevision?.weight ?? profile?.weightKg ?? null;
    const weightSource = lastRevision
      ? 'revision'
      : profile?.weightKg
        ? 'profile'
        : null;

    const targets =
      profile && weightKg
        ? computeTargets({
            sex: profile.sex,
            age: ageFrom(profile.birthDate),
            heightCm: profile.heightCm,
            weightKg,
            activityLevel: profile.activityLevel,
            goal: profile.goal,
          })
        : null;

    return { profile, weightKg, weightSource, targets };
  }

  /** Objetivos de un cliente consultados por su entrenador o el admin (p. ej. para asignarle un menú ajustado). */
  async getForClient(user: { id: string; role: Role }, clientId: string) {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });
    const managed =
      client?.role === Role.CLIENT &&
      (user.role === Role.ADMIN ||
        (user.role === Role.TRAINER && client.trainerId === user.id));
    if (!managed) {
      throw new ForbiddenException(
        'Ese usuario no está en tu cartera de clientes',
      );
    }
    return this.get(clientId);
  }

  async upsert(userId: string, dto: UpsertNutritionProfileDto) {
    const data = { ...dto, birthDate: new Date(dto.birthDate) };
    await this.prisma.nutritionProfile.upsert({
      where: { userId },
      update: data,
      create: { ...data, userId },
    });
    return this.get(userId);
  }
}
