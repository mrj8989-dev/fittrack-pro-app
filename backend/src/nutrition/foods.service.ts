import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FoodGroup, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';

type AuthUser = { id: string; role: Role };

/**
 * Catálogo común de alimentos: lo ven todos los usuarios. Lo amplían entrenadores y
 * admin; cada entrenador edita los alimentos que ha creado y el admin, cualquiera.
 */
@Injectable()
export class FoodsService {
  constructor(private prisma: PrismaService) {}

  findAll(group?: FoodGroup) {
    return this.prisma.food.findMany({
      where: group && { group },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const food = await this.prisma.food.findUnique({ where: { id } });
    if (!food)
      throw new NotFoundException(`Alimento con id ${id} no encontrado`);
    return food;
  }

  create(dto: CreateFoodDto, user: AuthUser) {
    return this.prisma.food.create({ data: { ...dto, createdById: user.id } });
  }

  async update(id: string, dto: UpdateFoodDto, user: AuthUser) {
    await this.findEditable(id, user);
    return this.prisma.food.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.findEditable(id, user);
    try {
      return await this.prisma.food.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          'Este alimento se usa en algún menú; quítalo de ahí antes de borrarlo',
        );
      }
      throw e;
    }
  }

  private async findEditable(id: string, user: AuthUser) {
    const food = await this.findOne(id);
    if (user.role !== Role.ADMIN && food.createdById !== user.id) {
      throw new ForbiddenException(
        'Solo puedes modificar los alimentos que hayas creado tú',
      );
    }
    return food;
  }
}
