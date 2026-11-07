import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Food, FoodGroup, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FoodsService } from './foods.service';
import {
  AddMealDto,
  AddMealItemDto,
  AssignMealPlanDto,
  CreateMealPlanDto,
  ScaleMealPlanDto,
} from './dto/meal-plan.dto';
import {
  Macros,
  dayScaleFactor,
  equivalentGrams,
  macrosFor,
  roundMacros,
  scaledGrams,
  sumMacros,
} from './nutrition.calc';

export type AuthUser = { id: string; role: Role; trainerId?: string | null };

const DAYS = [1, 2, 3, 4, 5, 6, 7];
// Mismas comidas que las plantillas; se pueden renombrar, añadir o quitar.
const DEFAULT_MEALS = ['Desayuno', 'Comida', 'Almuerzo', 'Cena'];

// Dentro de cada comida, los alimentos se muestran por grupo: proteína, hidratos, grasas…
const GROUP_ORDER: FoodGroup[] = [
  'PROTEIN',
  'CARBS',
  'FATS',
  'VEGETABLES',
  'FRUITS',
  'OTHER',
];
const byFoodGroup = (a: { food: Food }, b: { food: Food }) =>
  GROUP_ORDER.indexOf(a.food.group) - GROUP_ORDER.indexOf(b.food.group) ||
  a.food.name.localeCompare(b.food.name, 'es');

const planInclude = {
  meals: {
    orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
    include: { items: { orderBy: { id: 'asc' }, include: { food: true } } },
  },
  user: { select: { id: true, name: true, trainerId: true } },
  assignedBy: { select: { id: true, name: true } },
} satisfies Prisma.MealPlanInclude;

type PlanWithMeals = Prisma.MealPlanGetPayload<{ include: typeof planInclude }>;

/**
 * Los menús los diseñan entrenador y admin; el cliente sigue los que le asignan.
 * - CLIENT: ve sus menús asignados y solo puede intercambiar alimentos por equivalentes.
 * - TRAINER: gestiona sus plantillas, lee las globales, y asigna/edita menús de sus clientes.
 * - ADMIN: gestiona las plantillas globales, lee todas, y asigna/edita menús de cualquier cliente.
 */
@Injectable()
export class MealPlansService {
  constructor(
    private prisma: PrismaService,
    private foods: FoodsService,
  ) {}

  // ── Lectura ──────────────────────────────────────────────────

  async findTemplates(user: AuthUser) {
    const templates = await this.prisma.mealPlan.findMany({
      where: { isTemplate: true, ...this.visibleTemplatesFilter(user) },
      include: planInclude,
      orderBy: { name: 'asc' },
    });
    return templates.map((t) => this.summary(t, user));
  }

  /** Menús de un cliente: los propios, o los de un cliente (entrenador suyo o admin). */
  async findForClient(user: AuthUser, clientId?: string) {
    const ownerId = await this.resolveClientId(user, clientId);
    const plans = await this.prisma.mealPlan.findMany({
      where: { userId: ownerId, isTemplate: false },
      include: planInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return plans.map((p) => this.summary(p, user));
  }

  async findOne(id: string, user: AuthUser) {
    return this.detail(await this.loadReadable(id, user), user);
  }

  // ── Crear y asignar ──────────────────────────────────────────

  /**
   * Crea una plantilla de cero o copiando otro menú (plantilla o menú de un cliente).
   * Solo TRAINER y ADMIN; a los clientes les llegan los menús por asignación.
   */
  async create(dto: CreateMealPlanDto, user: AuthUser) {
    const owner = {
      isTemplate: true,
      // Las plantillas del ADMIN son globales (sin dueño).
      userId: user.role === Role.ADMIN ? null : user.id,
    };

    if (!dto.sourceId) {
      if (!dto.name)
        throw new BadRequestException('Indica un nombre para el menú');
      const plan = await this.prisma.mealPlan.create({
        data: {
          ...owner,
          name: dto.name,
          meals: {
            create: DAYS.flatMap((dayOfWeek) =>
              DEFAULT_MEALS.map((name, i) => ({
                dayOfWeek,
                name,
                order: i + 1,
              })),
            ),
          },
        },
        include: planInclude,
      });
      return this.detail(plan, user);
    }

    const source = await this.loadReadable(dto.sourceId, user);
    const copy = await this.copyPlan(source, {
      ...owner,
      name:
        dto.name ??
        (source.isTemplate ? source.name : `${source.name} (copia)`),
      targetKcal: dto.targetKcal,
    });
    return this.detail(copy, user);
  }

  /** Asigna a un cliente una copia del menú, opcionalmente ajustada a unas kcal. */
  async assign(id: string, dto: AssignMealPlanDto, user: AuthUser) {
    const source = await this.loadReadable(id, user);
    const clientId = await this.resolveClientId(user, dto.clientId);

    const copy = await this.copyPlan(source, {
      isTemplate: false,
      userId: clientId,
      assignedById: user.id,
      name: dto.name ?? source.name,
      targetKcal: dto.targetKcal,
    });
    return this.detail(copy, user);
  }

  // ── Editar el menú ───────────────────────────────────────────

  async rename(id: string, name: string, user: AuthUser) {
    await this.loadEditable(id, user);
    await this.prisma.mealPlan.update({ where: { id }, data: { name } });
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthUser) {
    await this.loadEditable(id, user);
    await this.prisma.mealPlan.delete({ where: { id } });
    return { deleted: true };
  }

  /** Reescala todos los días del menú para que cada uno sume `targetKcal`. */
  async scale(id: string, dto: ScaleMealPlanDto, user: AuthUser) {
    const plan = await this.loadEditable(id, user);
    const factors = this.dayFactors(plan, dto.targetKcal);

    const updates = plan.meals.flatMap((meal) =>
      meal.items.map((item) =>
        this.prisma.mealItem.update({
          where: { id: item.id },
          data: { grams: scaledGrams(item, factors.get(meal.dayOfWeek) ?? 1) },
        }),
      ),
    );
    await this.prisma.$transaction([...updates, this.touch(id)]);
    return this.findOne(id, user);
  }

  // ── Editar comidas ───────────────────────────────────────────

  async addMeal(id: string, dto: AddMealDto, user: AuthUser) {
    const plan = await this.loadEditable(id, user);
    const lastOrder = Math.max(
      0,
      ...plan.meals
        .filter((m) => m.dayOfWeek === dto.dayOfWeek)
        .map((m) => m.order),
    );
    await this.prisma.$transaction([
      this.prisma.meal.create({
        data: {
          mealPlanId: id,
          dayOfWeek: dto.dayOfWeek,
          name: dto.name,
          order: lastOrder + 1,
        },
      }),
      this.touch(id),
    ]);
    return this.findOne(id, user);
  }

  async renameMeal(id: string, mealId: string, name: string, user: AuthUser) {
    await this.findEditableMeal(id, mealId, user);
    await this.prisma.$transaction([
      this.prisma.meal.update({ where: { id: mealId }, data: { name } }),
      this.touch(id),
    ]);
    return this.findOne(id, user);
  }

  async removeMeal(id: string, mealId: string, user: AuthUser) {
    await this.findEditableMeal(id, mealId, user);
    await this.prisma.$transaction([
      this.prisma.meal.delete({ where: { id: mealId } }),
      this.touch(id),
    ]);
    return this.findOne(id, user);
  }

  // ── Editar alimentos ─────────────────────────────────────────

  async addItem(
    id: string,
    mealId: string,
    dto: AddMealItemDto,
    user: AuthUser,
  ) {
    await this.findEditableMeal(id, mealId, user);
    await this.foods.findOne(dto.foodId);
    await this.prisma.$transaction([
      this.prisma.mealItem.create({
        data: { mealId, foodId: dto.foodId, grams: dto.grams },
      }),
      this.touch(id),
    ]);
    return this.findOne(id, user);
  }

  async updateItem(id: string, itemId: string, grams: number, user: AuthUser) {
    await this.findEditableItem(id, itemId, user);
    await this.prisma.$transaction([
      this.prisma.mealItem.update({ where: { id: itemId }, data: { grams } }),
      this.touch(id),
    ]);
    return this.findOne(id, user);
  }

  async removeItem(id: string, itemId: string, user: AuthUser) {
    await this.findEditableItem(id, itemId, user);
    await this.prisma.$transaction([
      this.prisma.mealItem.delete({ where: { id: itemId } }),
      this.touch(id),
    ]);
    return this.findOne(id, user);
  }

  /** Alimentos del mismo grupo con la cantidad equivalente ya calculada. */
  async swapOptions(id: string, itemId: string, user: AuthUser) {
    const item = await this.findSwappableItem(id, itemId, user);
    const candidates = await this.foods.findAll(item.food.group);
    return candidates
      .filter((food) => food.id !== item.foodId)
      .map((food) => {
        const grams = equivalentGrams(item.food, food, item.grams);
        return { food, grams, macros: roundMacros(macrosFor(food, grams)) };
      });
  }

  /** Cambia el alimento de una línea recalculando los gramos para que aporte lo mismo. */
  async swap(id: string, itemId: string, foodId: string, user: AuthUser) {
    const item = await this.findSwappableItem(id, itemId, user);
    const newFood = await this.foods.findOne(foodId);
    const grams = equivalentGrams(item.food, newFood, item.grams);
    await this.prisma.$transaction([
      this.prisma.mealItem.update({
        where: { id: itemId },
        data: { foodId, grams },
      }),
      this.touch(id),
    ]);
    return this.findOne(id, user);
  }

  // ── Permisos ─────────────────────────────────────────────────

  private visibleTemplatesFilter(user: AuthUser): Prisma.MealPlanWhereInput {
    if (user.role === Role.ADMIN) return {};
    return { OR: [{ userId: null }, { userId: user.id }] };
  }

  private canRead(plan: PlanWithMeals, user: AuthUser): boolean {
    if (plan.isTemplate) {
      return (
        user.role === Role.ADMIN ||
        (user.role === Role.TRAINER &&
          (plan.userId === null || plan.userId === user.id))
      );
    }
    return this.canSwap(plan, user);
  }

  /** Editar libremente: plantillas propias (o globales para el admin) y menús de clientes. */
  private canEdit(plan: PlanWithMeals, user: AuthUser): boolean {
    if (plan.isTemplate) {
      return plan.userId === null
        ? user.role === Role.ADMIN
        : plan.userId === user.id;
    }
    if (user.role === Role.ADMIN) return true;
    return user.role === Role.TRAINER && plan.user?.trainerId === user.id;
  }

  /** Intercambiar alimentos: quien puede editar, y el cliente en sus propios menús. */
  private canSwap(plan: PlanWithMeals, user: AuthUser): boolean {
    if (this.canEdit(plan, user)) return true;
    return !plan.isTemplate && plan.userId === user.id;
  }

  /** El propio cliente, o un cliente gestionado por el usuario (su entrenador o el admin). */
  private async resolveClientId(
    user: AuthUser,
    clientId?: string,
  ): Promise<string> {
    if (!clientId || clientId === user.id) {
      if (user.role !== Role.CLIENT)
        throw new BadRequestException(
          'Indica de qué cliente quieres los menús',
        );
      return user.id;
    }
    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('No puedes gestionar menús de otro usuario');
    }
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });
    const managed =
      client?.role === Role.CLIENT &&
      (user.role === Role.ADMIN || client.trainerId === user.id);
    if (!managed) {
      throw new ForbiddenException(
        'Ese usuario no está en tu cartera de clientes',
      );
    }
    return clientId;
  }

  private async loadReadable(
    id: string,
    user: AuthUser,
  ): Promise<PlanWithMeals> {
    const plan = await this.prisma.mealPlan.findUnique({
      where: { id },
      include: planInclude,
    });
    if (!plan || !this.canRead(plan, user))
      throw new NotFoundException(`Menú con id ${id} no encontrado`);
    return plan;
  }

  private async loadEditable(
    id: string,
    user: AuthUser,
  ): Promise<PlanWithMeals> {
    const plan = await this.loadReadable(id, user);
    if (!this.canEdit(plan, user)) {
      throw new ForbiddenException(
        plan.isTemplate
          ? 'No puedes modificar esta plantilla; crea una copia a partir de ella'
          : 'Solo puedes cambiar alimentos por otros equivalentes; el resto lo ajusta tu entrenador',
      );
    }
    return plan;
  }

  private async findSwappableItem(id: string, itemId: string, user: AuthUser) {
    const plan = await this.loadReadable(id, user);
    if (!this.canSwap(plan, user)) {
      throw new ForbiddenException('No puedes modificar este menú');
    }
    const item = plan.meals
      .flatMap((m) => m.items)
      .find((i) => i.id === itemId);
    if (!item)
      throw new NotFoundException(
        `Alimento con id ${itemId} no encontrado en este menú`,
      );
    return item;
  }

  private async findEditableMeal(id: string, mealId: string, user: AuthUser) {
    const plan = await this.loadEditable(id, user);
    const meal = plan.meals.find((m) => m.id === mealId);
    if (!meal)
      throw new NotFoundException(
        `Comida con id ${mealId} no encontrada en este menú`,
      );
    return meal;
  }

  private async findEditableItem(id: string, itemId: string, user: AuthUser) {
    const plan = await this.loadEditable(id, user);
    const item = plan.meals
      .flatMap((m) => m.items)
      .find((i) => i.id === itemId);
    if (!item)
      throw new NotFoundException(
        `Alimento con id ${itemId} no encontrado en este menú`,
      );
    return item;
  }

  // ── Helpers ──────────────────────────────────────────────────

  private copyPlan(
    source: PlanWithMeals,
    target: {
      isTemplate: boolean;
      userId: string | null;
      assignedById?: string;
      name: string;
      targetKcal?: number;
    },
  ) {
    const factors = target.targetKcal
      ? this.dayFactors(source, target.targetKcal)
      : null;
    return this.prisma.mealPlan.create({
      data: {
        name: target.name,
        description: source.description,
        isTemplate: target.isTemplate,
        userId: target.userId,
        assignedById: target.assignedById,
        meals: {
          create: source.meals.map((meal) => ({
            dayOfWeek: meal.dayOfWeek,
            name: meal.name,
            order: meal.order,
            items: {
              create: meal.items.map((item) => ({
                foodId: item.foodId,
                grams: factors
                  ? scaledGrams(item, factors.get(meal.dayOfWeek) ?? 1)
                  : item.grams,
              })),
            },
          })),
        },
      },
      include: planInclude,
    });
  }

  private touch(id: string) {
    return this.prisma.mealPlan.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  private dayFactors(
    plan: PlanWithMeals,
    targetKcal: number,
  ): Map<number, number> {
    const factors = new Map<number, number>();
    for (const day of DAYS) {
      const items = plan.meals
        .filter((m) => m.dayOfWeek === day)
        .flatMap((m) => m.items);
      if (items.length) factors.set(day, dayScaleFactor(items, targetKcal));
    }
    return factors;
  }

  private itemView(item: { id: string; grams: number; food: Food }) {
    return {
      id: item.id,
      grams: item.grams,
      food: item.food,
      macros: roundMacros(macrosFor(item.food, item.grams)),
    };
  }

  private detail(plan: PlanWithMeals, user: AuthUser) {
    const days = DAYS.map((dayOfWeek) => {
      const meals = plan.meals
        .filter((m) => m.dayOfWeek === dayOfWeek)
        .map((meal) => {
          const items = [...meal.items]
            .sort(byFoodGroup)
            .map((i) => this.itemView(i));
          return {
            id: meal.id,
            name: meal.name,
            order: meal.order,
            items,
            totals: roundMacros(
              sumMacros(items.map((i) => macrosFor(i.food, i.grams))),
            ),
          };
        });
      const totals = roundMacros(
        sumMacros(
          meals.flatMap((m) => m.items.map((i) => macrosFor(i.food, i.grams))),
        ),
      );
      return { dayOfWeek, meals, totals };
    });

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      isTemplate: plan.isTemplate,
      isGlobal: plan.isTemplate && plan.userId === null,
      canEdit: this.canEdit(plan, user),
      canSwap: this.canSwap(plan, user),
      owner: plan.user ? { id: plan.user.id, name: plan.user.name } : null,
      assignedBy: plan.assignedBy,
      updatedAt: plan.updatedAt,
      days,
      dailyAverage: this.average(
        days.map((d) => d.totals),
        days.filter((d) => d.meals.some((m) => m.items.length)).length,
      ),
    };
  }

  private summary(plan: PlanWithMeals, user: AuthUser) {
    const { days, ...rest } = this.detail(plan, user);
    return {
      ...rest,
      mealsPerDay: Math.max(0, ...days.map((d) => d.meals.length)),
    };
  }

  private average(totals: Macros[], activeDays: number): Macros {
    if (!activeDays) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const sum = sumMacros(totals);
    return roundMacros({
      kcal: sum.kcal / activeDays,
      protein: sum.protein / activeDays,
      carbs: sum.carbs / activeDays,
      fat: sum.fat / activeDays,
    });
  }
}
