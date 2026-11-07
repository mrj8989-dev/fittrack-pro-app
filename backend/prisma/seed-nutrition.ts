import { FoodGroup, PrismaClient } from '@prisma/client';

// Valores por 100 g en crudo. Las kcal parten de la tabla de alimentos del autor y los
// macros se han completado con valores de referencia (BEDCA / USDA) coherentes con esas kcal.
type FoodSeed = {
  id: string;
  name: string;
  group: FoodGroup;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  unitName?: string;
  gramsPerUnit?: number;
};

const foods: FoodSeed[] = [
  // Proteínas
  {
    id: 'food-pavo',
    name: 'Pavo en lonchas',
    group: 'PROTEIN',
    kcal: 90,
    protein: 18,
    carbs: 1.5,
    fat: 1.2,
  },
  {
    id: 'food-huevo',
    name: 'Huevo',
    group: 'PROTEIN',
    kcal: 143,
    protein: 12.6,
    carbs: 0.7,
    fat: 9.5,
    unitName: 'unidad',
    gramsPerUnit: 55,
  },
  {
    id: 'food-merluza',
    name: 'Merluza',
    group: 'PROTEIN',
    kcal: 82,
    protein: 17.8,
    carbs: 0,
    fat: 1.2,
  },
  {
    id: 'food-pollo',
    name: 'Pechuga de pollo',
    group: 'PROTEIN',
    kcal: 102,
    protein: 22.5,
    carbs: 0,
    fat: 1.5,
  },
  {
    id: 'food-carne-picada',
    name: 'Carne picada de vacuno',
    group: 'PROTEIN',
    kcal: 129,
    protein: 20,
    carbs: 0,
    fat: 5.5,
  },
  {
    id: 'food-proteina-polvo',
    name: 'Proteína en polvo',
    group: 'PROTEIN',
    kcal: 400,
    protein: 80,
    carbs: 8,
    fat: 5.3,
  },
  {
    id: 'food-yogur-proteico-mango',
    name: 'Yogur proteico de mango',
    group: 'PROTEIN',
    kcal: 56,
    protein: 9,
    carbs: 4.5,
    fat: 0.2,
  },
  {
    id: 'food-yogur-proteico-natural',
    name: 'Yogur proteico natural',
    group: 'PROTEIN',
    kcal: 52,
    protein: 9,
    carbs: 3.5,
    fat: 0.2,
  },
  {
    id: 'food-lomo-cerdo',
    name: 'Lomo de cerdo',
    group: 'PROTEIN',
    kcal: 131,
    protein: 21.5,
    carbs: 0,
    fat: 5,
  },
  {
    id: 'food-atun',
    name: 'Atún claro al natural',
    group: 'PROTEIN',
    kcal: 87,
    protein: 19.5,
    carbs: 0,
    fat: 1,
  },
  {
    id: 'food-queso-cottage',
    name: 'Queso cottage',
    group: 'PROTEIN',
    kcal: 80,
    protein: 11,
    carbs: 3.4,
    fat: 2.5,
  },

  // Hidratos
  {
    id: 'food-pan-integral',
    name: 'Pan integral',
    group: 'CARBS',
    kcal: 207,
    protein: 9,
    carbs: 37,
    fat: 2.5,
  },
  {
    id: 'food-arroz-integral',
    name: 'Arroz integral',
    group: 'CARBS',
    kcal: 358,
    protein: 7.5,
    carbs: 76,
    fat: 2.7,
  },
  {
    id: 'food-arroz-blanco',
    name: 'Arroz blanco',
    group: 'CARBS',
    kcal: 349,
    protein: 7,
    carbs: 79,
    fat: 0.6,
  },
  {
    id: 'food-patata',
    name: 'Patata',
    group: 'CARBS',
    kcal: 72,
    protein: 2,
    carbs: 15.5,
    fat: 0.1,
  },
  {
    id: 'food-batata',
    name: 'Batata',
    group: 'CARBS',
    kcal: 88,
    protein: 1.6,
    carbs: 20,
    fat: 0.1,
  },
  {
    id: 'food-gnocchi',
    name: 'Gnocchi',
    group: 'CARBS',
    kcal: 171,
    protein: 4.5,
    carbs: 36.5,
    fat: 0.8,
  },
  {
    id: 'food-avena',
    name: 'Copos de avena',
    group: 'CARBS',
    kcal: 353,
    protein: 13.5,
    carbs: 59,
    fat: 7,
  },
  {
    id: 'food-noodles',
    name: 'Noodles de huevo',
    group: 'CARBS',
    kcal: 372,
    protein: 13,
    carbs: 72,
    fat: 3.5,
  },
  {
    id: 'food-pasta',
    name: 'Pasta',
    group: 'CARBS',
    kcal: 370,
    protein: 12.5,
    carbs: 75.5,
    fat: 2,
  },
  {
    id: 'food-alubias',
    name: 'Alubias pintas (bote, escurridas)',
    group: 'CARBS',
    kcal: 77,
    protein: 5,
    carbs: 13,
    fat: 0.5,
  },

  // Grasas
  {
    id: 'food-aceite-oliva',
    name: 'Aceite de oliva',
    group: 'FATS',
    kcal: 900,
    protein: 0,
    carbs: 0,
    fat: 100,
  },
  {
    id: 'food-aceitunas',
    name: 'Aceitunas',
    group: 'FATS',
    kcal: 154,
    protein: 1,
    carbs: 1.5,
    fat: 16,
  },
  {
    id: 'food-aguacate',
    name: 'Aguacate',
    group: 'FATS',
    kcal: 174,
    protein: 2,
    carbs: 2,
    fat: 17.5,
  },
  {
    id: 'food-mozzarella',
    name: 'Mozzarella fresca',
    group: 'FATS',
    kcal: 292,
    protein: 18,
    carbs: 1,
    fat: 24,
  },
  {
    id: 'food-chocolate-72',
    name: 'Chocolate negro 72%',
    group: 'FATS',
    kcal: 626,
    protein: 9,
    carbs: 26,
    fat: 54,
  },
  {
    id: 'food-crema-almendra',
    name: 'Crema de almendra',
    group: 'FATS',
    kcal: 630,
    protein: 21,
    carbs: 6,
    fat: 58,
  },
  {
    id: 'food-mantequilla',
    name: 'Mantequilla',
    group: 'FATS',
    kcal: 734,
    protein: 0.7,
    carbs: 0.6,
    fat: 81,
  },
  {
    id: 'food-almendras',
    name: 'Almendras',
    group: 'FATS',
    kcal: 617,
    protein: 21,
    carbs: 6,
    fat: 56.5,
  },
  {
    id: 'food-anacardos',
    name: 'Anacardos',
    group: 'FATS',
    kcal: 576,
    protein: 18,
    carbs: 27,
    fat: 44,
  },

  // Verduras
  {
    id: 'food-verduras-salteadas',
    name: 'Verduras para saltear',
    group: 'VEGETABLES',
    kcal: 20,
    protein: 1.5,
    carbs: 3,
    fat: 0.2,
  },
  {
    id: 'food-berenjena',
    name: 'Berenjena',
    group: 'VEGETABLES',
    kcal: 28,
    protein: 1,
    carbs: 5.5,
    fat: 0.2,
  },
  {
    id: 'food-tomate',
    name: 'Tomate',
    group: 'VEGETABLES',
    kcal: 19,
    protein: 0.9,
    carbs: 3.5,
    fat: 0.2,
  },

  // Frutas
  {
    id: 'food-fresas',
    name: 'Fresas',
    group: 'FRUITS',
    kcal: 36,
    protein: 0.7,
    carbs: 7.7,
    fat: 0.3,
  },
  {
    id: 'food-higos',
    name: 'Higos',
    group: 'FRUITS',
    kcal: 76,
    protein: 0.8,
    carbs: 17.5,
    fat: 0.3,
  },
  {
    id: 'food-pina',
    name: 'Piña',
    group: 'FRUITS',
    kcal: 51,
    protein: 0.5,
    carbs: 12,
    fat: 0.1,
  },
  {
    id: 'food-melocoton',
    name: 'Melocotón',
    group: 'FRUITS',
    kcal: 40,
    protein: 0.9,
    carbs: 8.5,
    fat: 0.3,
    unitName: 'unidad',
    gramsPerUnit: 150,
  },
  {
    id: 'food-arandanos',
    name: 'Arándanos',
    group: 'FRUITS',
    kcal: 64,
    protein: 0.7,
    carbs: 14.5,
    fat: 0.3,
  },
  {
    id: 'food-naranja',
    name: 'Naranja',
    group: 'FRUITS',
    kcal: 47,
    protein: 0.9,
    carbs: 10.5,
    fat: 0.1,
    unitName: 'unidad',
    gramsPerUnit: 200,
  },
  {
    id: 'food-platano',
    name: 'Plátano',
    group: 'FRUITS',
    kcal: 89,
    protein: 1.1,
    carbs: 20.5,
    fat: 0.3,
    unitName: 'unidad',
    gramsPerUnit: 120,
  },
  {
    id: 'food-kiwi',
    name: 'Kiwi',
    group: 'FRUITS',
    kcal: 61,
    protein: 1.1,
    carbs: 13,
    fat: 0.5,
    unitName: 'unidad',
    gramsPerUnit: 75,
  },
  {
    id: 'food-mandarina',
    name: 'Mandarina',
    group: 'FRUITS',
    kcal: 54,
    protein: 0.8,
    carbs: 12,
    fat: 0.3,
    unitName: 'unidad',
    gramsPerUnit: 80,
  },
  {
    id: 'food-manzana',
    name: 'Manzana',
    group: 'FRUITS',
    kcal: 53,
    protein: 0.3,
    carbs: 12.5,
    fat: 0.2,
    unitName: 'unidad',
    gramsPerUnit: 180,
  },
  {
    id: 'food-moras',
    name: 'Moras',
    group: 'FRUITS',
    kcal: 53,
    protein: 1.4,
    carbs: 10,
    fat: 0.5,
  },

  // Otros
  {
    id: 'food-salsa-soja',
    name: 'Salsa de soja',
    group: 'OTHER',
    kcal: 53,
    protein: 8,
    carbs: 5,
    fat: 0,
  },
];

// ── Plantillas de menú semanal ─────────────────────────────────────
// Cada día: [desayuno, comida, almuerzo, cena]; cada comida: [alimento, gramos][].

type Line = [foodKey: string, grams: number];
type Day = [Line[], Line[], Line[], Line[]];

const MEAL_NAMES = ['Desayuno', 'Comida', 'Almuerzo', 'Cena'];

// Aceite para cocinar: 5 g en las comidas que se cocinan (comida y cena).
const COOKED_MEALS = new Set([1, 3]);
const ACEITE: Line = ['aceite-oliva', 5];
const withOil = (lines: Line[], mealIndex: number): Line[] =>
  COOKED_MEALS.has(mealIndex) ? [...lines, ACEITE] : lines;

const HUEVO = 55;
const FRUTA = 180; // una pieza mediana (manzana)

const menuAlto: Day[] = [
  [
    [
      ['pavo', 60],
      ['pan-integral', 131],
      ['aguacate', 78],
    ],
    [
      ['pollo', 60],
      ['arroz-integral', 56],
      ['alubias', 277],
    ],
    [
      ['proteina-polvo', 30],
      ['manzana', FRUTA],
    ],
    [
      ['carne-picada', 214],
      ['batata', 205],
      ['gnocchi', 108],
    ],
  ],
  [
    [
      ['avena', 44],
      ['chocolate-72', 44],
      ['yogur-proteico-natural', 100],
    ],
    [
      ['lomo-cerdo', 80],
      ['carne-picada', 80],
      ['pasta', 36],
      ['patata', 191],
    ],
    [
      ['proteina-polvo', 30],
      ['manzana', FRUTA],
    ],
    [
      ['carne-picada', 219],
      ['arroz-integral', 91],
      ['verduras-salteadas', 150],
    ],
  ],
  [
    [
      ['proteina-polvo', 15],
      ['avena', 40],
      ['chocolate-72', 35],
    ],
    [
      ['merluza', 177],
      ['arroz-blanco', 85],
      ['verduras-salteadas', 150],
    ],
    [['manzana', FRUTA]],
    [
      ['carne-picada', 248],
      ['arroz-integral', 53],
      ['batata', 200],
    ],
  ],
  [
    [
      ['pavo', 42],
      ['yogur-proteico-mango', 96],
      ['avena', 56],
    ],
    [
      ['lomo-cerdo', 114],
      ['gnocchi', 166],
      ['verduras-salteadas', 150],
    ],
    [
      ['manzana', FRUTA],
      ['platano', 120],
      ['proteina-polvo', 30],
    ],
    [
      ['merluza', 133],
      ['arroz-blanco', 89],
      ['verduras-salteadas', 150],
    ],
  ],
  [
    [
      ['proteina-polvo', 11],
      ['pan-integral', 97],
      ['arandanos', 80],
      ['aguacate', 110],
    ],
    [
      ['pollo', 109],
      ['pasta', 54],
      ['patata', 204],
      ['verduras-salteadas', 150],
    ],
    [
      ['proteina-polvo', 30],
      ['manzana', FRUTA],
      ['platano', 120],
    ],
    [
      ['carne-picada', 119],
      ['gnocchi', 173],
      ['verduras-salteadas', 150],
    ],
  ],
  [
    [
      ['yogur-proteico-natural', 210],
      ['avena', 42],
      ['chocolate-72', 34],
      ['arandanos', 80],
    ],
    [
      ['lomo-cerdo', 167],
      ['pan-integral', 91],
      ['gnocchi', 64],
      ['verduras-salteadas', 150],
    ],
    [
      ['proteina-polvo', 30],
      ['manzana', FRUTA],
    ],
    [
      ['lomo-cerdo', 184],
      ['gnocchi', 187],
      ['verduras-salteadas', 150],
    ],
  ],
  [
    [
      ['pavo', 60],
      ['huevo', 2 * HUEVO],
      ['pan-integral', 126],
    ],
    [
      ['merluza', 211],
      ['arroz-integral', 54],
      ['patata', 197],
      ['verduras-salteadas', 150],
    ],
    [
      ['manzana', FRUTA],
      ['proteina-polvo', 30],
    ],
    [
      ['carne-picada', 186],
      ['gnocchi', 192],
      ['verduras-salteadas', 150],
    ],
  ],
];

const menuBajo: Day[] = [
  [
    [
      ['pavo', 40],
      ['pan-integral', 70],
      ['aguacate', 40],
    ],
    [
      ['pollo', 40],
      ['arroz-integral', 35],
      ['alubias', 160],
    ],
    [
      ['proteina-polvo', 25],
      ['manzana', FRUTA],
    ],
    [
      ['carne-picada', 140],
      ['batata', 130],
      ['gnocchi', 60],
    ],
  ],
  [
    [
      ['avena', 30],
      ['chocolate-72', 20],
      ['yogur-proteico-natural', 100],
    ],
    [
      ['lomo-cerdo', 50],
      ['carne-picada', 50],
      ['pasta', 25],
      ['patata', 120],
    ],
    [
      ['proteina-polvo', 25],
      ['manzana', FRUTA],
    ],
    [
      ['carne-picada', 150],
      ['arroz-integral', 55],
      ['verduras-salteadas', 120],
    ],
  ],
  [
    [
      ['proteina-polvo', 15],
      ['avena', 30],
      ['chocolate-72', 20],
    ],
    [
      ['merluza', 120],
      ['arroz-blanco', 60],
      ['verduras-salteadas', 120],
    ],
    [['manzana', FRUTA]],
    [
      ['carne-picada', 160],
      ['arroz-integral', 35],
      ['batata', 140],
    ],
  ],
  [
    [
      ['pavo', 35],
      ['yogur-proteico-mango', 80],
      ['avena', 35],
    ],
    [
      ['lomo-cerdo', 70],
      ['gnocchi', 110],
      ['verduras-salteadas', 120],
    ],
    [
      ['manzana', FRUTA],
      ['proteina-polvo', 25],
    ],
    [
      ['merluza', 100],
      ['arroz-blanco', 60],
      ['verduras-salteadas', 120],
    ],
  ],
  [
    [
      ['proteina-polvo', 10],
      ['pan-integral', 60],
      ['arandanos', 50],
      ['aguacate', 60],
    ],
    [
      ['pollo', 70],
      ['pasta', 30],
      ['patata', 120],
      ['verduras-salteadas', 120],
    ],
    [
      ['proteina-polvo', 25],
      ['manzana', FRUTA],
    ],
    [
      ['carne-picada', 90],
      ['gnocchi', 120],
      ['verduras-salteadas', 120],
    ],
  ],
  [
    [
      ['yogur-proteico-natural', 150],
      ['avena', 30],
      ['chocolate-72', 20],
      ['arandanos', 50],
    ],
    [
      ['lomo-cerdo', 110],
      ['pan-integral', 60],
      ['gnocchi', 40],
      ['verduras-salteadas', 120],
    ],
    [
      ['proteina-polvo', 25],
      ['manzana', FRUTA],
    ],
    [
      ['lomo-cerdo', 130],
      ['gnocchi', 130],
      ['verduras-salteadas', 120],
    ],
  ],
  [
    [
      ['pavo', 40],
      ['huevo', HUEVO],
      ['pan-integral', 70],
    ],
    [
      ['merluza', 150],
      ['arroz-integral', 40],
      ['patata', 120],
      ['verduras-salteadas', 120],
    ],
    [
      ['manzana', FRUTA],
      ['proteina-polvo', 25],
    ],
    [
      ['carne-picada', 130],
      ['gnocchi', 130],
      ['verduras-salteadas', 120],
    ],
  ],
];

const foodById = new Map(foods.map((f) => [f.id, f]));
const foodId = (key: string) => {
  const id = `food-${key}`;
  if (!foodById.has(id))
    throw new Error(`Alimento desconocido en plantilla: ${key}`);
  return id;
};

// Totales diarios de los menús originales del autor (lunes → domingo). Con los valores de
// referencia de los alimentos, las cantidades apuntadas suman menos (sobre todo grasa),
// así que cada día se reajusta para acercarse a estas cifras.
type DayTarget = { kcal: number; carbs: number };
const targets = (kcal: number[], carbs: number[]): DayTarget[] =>
  kcal.map((k, i) => ({ kcal: k, carbs: carbs[i] }));

const TARGETS_ALTO = targets(
  [2470, 2215, 2183, 2361, 2145, 2143, 2148],
  [275, 230, 224, 245, 231, 226, 232],
);
const TARGETS_BAJO = targets(
  [1800, 1780, 1800, 1820, 1785, 1800, 1805],
  [210, 205, 210, 220, 215, 210, 215],
);

const MAX_OIL_PER_MEAL = 10;
const MAX_FAT_FACTOR = 1.5;

const foodOf = ([key]: Line) => foodById.get(foodId(key))!;
const sumOf = (lines: Line[], macro: 'kcal' | 'carbs') =>
  lines.reduce(
    (s, [key, grams]) => s + (foodOf([key, grams])[macro] * grams) / 100,
    0,
  );

const roundGrams = (g: number) =>
  g < 30 ? Math.max(1, Math.round(g)) : Math.round(g / 5) * 5;

/**
 * Reajusta un día (con el aceite ya añadido) hacia los totales del original:
 * 1. los hidratos se escalan para cuadrar los hidratos del día;
 * 2. las grasas cubren las kcal que falten, hasta +50 % de su cantidad;
 * 3. después, el aceite de cocinar, hasta MAX_OIL_PER_MEAL por comida;
 * 4. lo que aún falte se completa con más hidratos, para que las kcal cuadren siempre.
 * Los topes mantienen raciones realistas aunque la grasa quede algo por debajo del original.
 * La proteína, la verdura y la fruta mantienen las cantidades del autor.
 */
function fitDay(day: Day, target: DayTarget): Line[][] {
  const meals = day.map((lines, i) => withOil(lines, i));
  const lines = meals.flat();
  const isCarb = (l: Line) => foodOf(l).group === 'CARBS';
  const isFat = (l: Line) => foodOf(l).group === 'FATS' && l[0] !== ACEITE[0];
  const isOil = (l: Line) => l[0] === ACEITE[0];

  const carbLines = lines.filter(isCarb);
  const fatLines = lines.filter(isFat);
  const otherLines = lines.filter((l) => !isCarb(l) && !isFat(l) && !isOil(l));
  const oilLines = lines.filter(isOil);

  const carbFactor = Math.max(
    0.5,
    (target.carbs - sumOf([...otherLines, ...fatLines], 'carbs')) /
      sumOf(carbLines, 'carbs'),
  );
  const scale = (l: Line, f: number): Line => [l[0], l[1] * f];
  const scaledCarbs = carbLines.map((l) => scale(l, carbFactor));

  const kcalLeft =
    target.kcal - sumOf([...otherLines, ...scaledCarbs, ...oilLines], 'kcal');
  const fatKcal = sumOf(fatLines, 'kcal');
  const fatFactor =
    fatKcal > 0
      ? Math.min(MAX_FAT_FACTOR, Math.max(0.5, kcalLeft / fatKcal))
      : 1;
  const extraOilKcal = Math.max(0, kcalLeft - fatKcal * fatFactor);
  const oilPerMeal = Math.min(
    MAX_OIL_PER_MEAL,
    ACEITE[1] + extraOilKcal / 9 / Math.max(1, oilLines.length),
  );
  const addedOilKcal = (oilPerMeal - ACEITE[1]) * 9 * oilLines.length;
  const stillMissing = Math.max(0, extraOilKcal - addedOilKcal);
  const finalCarbFactor =
    carbFactor * (1 + stillMissing / sumOf(scaledCarbs, 'kcal'));

  return meals.map((meal) =>
    meal.map((line): Line => {
      if (isCarb(line)) return [line[0], roundGrams(line[1] * finalCarbFactor)];
      if (isFat(line)) return [line[0], roundGrams(line[1] * fatFactor)];
      if (isOil(line)) return [line[0], roundGrams(oilPerMeal)];
      return line;
    }),
  );
}

async function createTemplate(
  prisma: PrismaClient,
  id: string,
  menu: Day[],
  dayTargets: DayTarget[],
  description: string,
) {
  const lineKcal = (l: Line) => sumOf([l], 'kcal');
  const days = menu.map((day, i) => fitDay(day, dayTargets[i]));
  const avgKcal =
    days.flat(2).reduce((s, l) => s + lineKcal(l), 0) / days.length;
  const kcal = Math.round(avgKcal / 50) * 50;
  await prisma.mealPlan.create({
    data: {
      id,
      name: `Menú ${kcal.toLocaleString('es-ES')} kcal`,
      description,
      isTemplate: true,
      meals: {
        create: days.flatMap((day, dayIndex) =>
          day.map((lines, mealIndex) => ({
            dayOfWeek: dayIndex + 1,
            name: MEAL_NAMES[mealIndex],
            order: mealIndex + 1,
            items: {
              create: lines.map(([key, grams]) => ({
                foodId: foodId(key),
                grams,
              })),
            },
          })),
        ),
      },
    },
  });
  return kcal;
}

export async function seedNutrition(prisma: PrismaClient) {
  for (const food of foods) {
    await prisma.food.upsert({
      where: { id: food.id },
      update: food,
      create: food,
    });
  }
  console.log(`✅ ${foods.length} alimentos creados`);

  // Las plantillas del seed se regeneran siempre. Las que creen entrenadores y admin,
  // y los menús de los clientes (que son copias), no se tocan.
  await prisma.mealPlan.deleteMany({
    where: { id: { in: ['meal-template-alto', 'meal-template-bajo'] } },
  });
  const altas = await createTemplate(
    prisma,
    'meal-template-alto',
    menuAlto,
    TARGETS_ALTO,
    'Semana completa de 4 comidas alta en proteína, con alimentos sencillos. Ideal para ganar músculo o mantener con mucha actividad.',
  );
  const bajas = await createTemplate(
    prisma,
    'meal-template-bajo',
    menuBajo,
    TARGETS_BAJO,
    'La misma semana con raciones reducidas. Pensada para perder grasa manteniendo la proteína alta.',
  );
  console.log(`✅ Plantillas de menú creadas: ${altas} kcal y ${bajas} kcal`);
}

/**
 * Asigna al cliente demo una copia del menú alto, como si se la hubiera asignado su
 * entrenador, para que la sección de nutrición no aparezca vacía. Si ya tiene menús, no hace nada.
 */
export async function assignDemoMenu(
  prisma: PrismaClient,
  clientId: string,
  trainerId: string,
) {
  const hasPlans = await prisma.mealPlan.count({
    where: { userId: clientId, isTemplate: false },
  });
  if (hasPlans) return;

  const template = await prisma.mealPlan.findUniqueOrThrow({
    where: { id: 'meal-template-alto' },
    include: { meals: { include: { items: true } } },
  });
  await prisma.mealPlan.create({
    data: {
      name: template.name,
      description: template.description,
      userId: clientId,
      assignedById: trainerId,
      meals: {
        create: template.meals.map((meal) => ({
          dayOfWeek: meal.dayOfWeek,
          name: meal.name,
          order: meal.order,
          items: {
            create: meal.items.map(({ foodId, grams }) => ({ foodId, grams })),
          },
        })),
      },
    },
  });
  console.log('✅ Menú asignado al cliente demo por su entrenador');
}
