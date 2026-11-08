import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, SubscriptionPlan } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { deleteUpload } from '../common/uploads';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  /** Sin distinguir mayúsculas: el admin guarda los emails en minúsculas y la gente no siempre los escribe así. */
  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
  }

  async touchLastLogin(id: string) {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  async setPassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword, mustChangePassword: false },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role?: Role;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async findClientsByTrainer(trainerId: string) {
    return this.prisma.user.findMany({
      where: { trainerId },
      select: { id: true, name: true, email: true, subscriptionPlan: true, createdAt: true, profilePhoto: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllClients() {
    return this.prisma.user.findMany({
      where: { role: Role.CLIENT },
      select: { id: true, name: true, email: true, subscriptionPlan: true, createdAt: true, profilePhoto: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Añade un cliente a la cartera del entrenador. Si el email ya es de un cliente, lo asigna;
   * si no existe ninguna cuenta, la crea con el nombre y la contraseña indicados.
   */
  async assignClient(dto: { email: string; name?: string; password?: string }, trainerId: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    const select = { id: true, name: true, email: true, subscriptionPlan: true, createdAt: true, profilePhoto: true };

    if (!existing) {
      if (!dto.name || !dto.password) {
        throw new NotFoundException('No existe ninguna cuenta con ese email. Indica nombre y contraseña para darla de alta.');
      }
      return this.prisma.user.create({
        data: {
          email,
          name: dto.name.trim(),
          password: await bcrypt.hash(dto.password, 10),
          role: Role.CLIENT,
          // Llega de la mano de su entrenador: entra con el plan que lo incluye.
          subscriptionPlan: SubscriptionPlan.PRO,
          trainerId,
          mustChangePassword: true,
        },
        select,
      });
    }

    if (existing.role !== Role.CLIENT) {
      throw new ConflictException('Ese email pertenece a un entrenador o administrador, no a un cliente');
    }
    if (!(await this.access.entitled(existing, 'trainer'))) {
      throw new ForbiddenException(
        'Ese cliente tiene el plan FREE. Solo los clientes PRO o PREMIUM pueden tener entrenador: pide a un administrador que le cambie el plan.',
      );
    }
    if (existing.trainerId === trainerId) {
      throw new ConflictException('Ese cliente ya está en tu cartera');
    }
    if (existing.trainerId) {
      throw new ConflictException('Ese cliente ya tiene otro entrenador asignado. Pide a un administrador que lo reasigne.');
    }

    return this.prisma.user.update({ where: { id: existing.id }, data: { trainerId }, select });
  }

  async findMyTrainer(trainerId: string | null) {
    if (!trainerId) return null;
    return this.prisma.user.findUnique({
      where: { id: trainerId },
      select: { id: true, name: true, email: true, profilePhoto: true },
    });
  }

  async updateProfilePhoto(userId: string, filename?: string) {
    if (!filename) throw new BadRequestException('No se ha recibido ningún archivo');

    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { profilePhoto: true } });
    deleteUpload(current?.profilePhoto);

    return this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: `/uploads/${filename}` },
      select: { id: true, name: true, email: true, role: true, profilePhoto: true },
    });
  }

  async unassignClient(clientId: string, trainerId: string) {
    const client = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!client || client.trainerId !== trainerId) {
      throw new NotFoundException('Cliente no encontrado en tu cartera');
    }

    return this.prisma.user.update({
      where: { id: clientId },
      data: { trainerId: null },
      select: { id: true, name: true, email: true },
    });
  }
}