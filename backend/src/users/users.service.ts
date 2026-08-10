import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
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
      select: { id: true, name: true, email: true, subscriptionPlan: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async assignClient(email: string, trainerId: string) {
    const client = await this.prisma.user.findUnique({ where: { email } });
    if (!client || client.role !== Role.CLIENT) {
      throw new NotFoundException('No existe ningún cliente con ese email');
    }
    if (client.trainerId === trainerId) {
      throw new ConflictException('Ese cliente ya está asignado a tu cartera');
    }

    return this.prisma.user.update({
      where: { id: client.id },
      data: { trainerId },
      select: { id: true, name: true, email: true, subscriptionPlan: true, createdAt: true },
    });
  }

  async findMyTrainer(trainerId: string | null) {
    if (!trainerId) return null;
    return this.prisma.user.findUnique({
      where: { id: trainerId },
      select: { id: true, name: true, email: true },
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