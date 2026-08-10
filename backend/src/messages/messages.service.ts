import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Role } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async send(dto: CreateMessageDto, senderId: string) {
    await this.assertCanMessage(senderId, dto.receiverId);
    return this.prisma.message.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        content: dto.content,
      },
    });
  }

  async getThread(userId: string, otherUserId: string) {
    await this.assertCanMessage(userId, otherUserId);

    await this.prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: userId, read: false },
      data: { read: true },
    });

    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: { receiverId: userId, read: false },
    });
    return { count };
  }

  /** Solo pueden hablar un entrenador y uno de sus clientes asignados. */
  private async assertCanMessage(userAId: string, userBId: string) {
    const [userA, userB] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userAId } }),
      this.prisma.user.findUnique({ where: { id: userBId } }),
    ]);
    if (!userA || !userB) throw new NotFoundException('Usuario no encontrado');

    const isValidPair =
      (userA.role === Role.TRAINER && userB.trainerId === userA.id) ||
      (userB.role === Role.TRAINER && userA.trainerId === userB.id);

    if (!isValidPair) {
      throw new ForbiddenException('Solo puedes chatear con tu entrenador o tus clientes asignados');
    }
  }
}
