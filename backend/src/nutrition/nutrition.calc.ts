// Cálculos nutricionales puros (sin base de datos), para poder testearlos de forma aislada.

export type FoodGroupName =
  | 'PROTEIN'
  | 'CARBS'
  | 'FATS'
  | 'VEGETABLES'
  | 'FRUITS'
  | 'OTHER';
export type SexName = 'MALE' | 'FEMALE';
export type ActivityLevelName =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'ACTIVE'
  | 'VERY_ACTIVE';
export type GoalName = 'LOSE_FAT' | 'MAINTAIN' | 'RECOMP' | 'GAIN_MUSCLE';

/** Valores por 100 g. */
export interface FoodValues {
  group: FoodGroupName;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function macrosFor(food: FoodValues, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: food.kcal * f,
    protein: food.protein * f,
    carbs: food.carbs * f,
    fat: food.fat * f,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    ZERO_MACROS,
  );
}

export function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
  };
}

/** Raciones pequeñas (aceite, proteína en polvo) se redondean al gramo; el resto a 5 g. */
export function roundGrams(grams: number): number {
  if (grams <= 0) return 0;
  if (grams < 30) return Math.max(1, Math.round(grams));
  return Math.round(grams / 5) * 5;
}

// Al intercambiar un alimento se conserva el macro que define su grupo:
// cambiar arroz por patata mantiene los hidratos; pollo por merluza, la proteína.
const KEY_MACRO: Record<FoodGroupName, keyof Macros> = {
  PROTEIN: 'protein',
  CARBS: 'carbs',
  FATS: 'fat',
  FRUITS: 'carbs',
  VEGETABLES: 'kcal',
  OTHER: 'kcal',
};

const KCAL_PER_GRAM: Record<'protein' | 'carbs' | 'fat', number> = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

// Un alimento solo es "fuente" de un macro si este aporta al menos el 25 % de sus calorías.
// Si no, igualar ese macro daría cantidades absurdas (p. ej. 1 kg de aguacate para
// igualar la proteína del pollo) y se igualan calorías en su lugar.
const MIN_KEY_MACRO_KCAL_SHARE = 0.25;

function isSourceOf(food: FoodValues, key: keyof Macros): boolean {
  if (key === 'kcal') return true;
  return (
    food.kcal > 0 &&
    (food[key] * KCAL_PER_GRAM[key]) / food.kcal >= MIN_KEY_MACRO_KCAL_SHARE
  );
}

export function keyMacroFor(group: FoodGroupName): keyof Macros {
  return KEY_MACRO[group];
}

/** Gramos de `to` equivalentes a `grams` de `from`, según el macro clave del grupo de `from`. */
export function equivalentGrams(
  from: FoodValues,
  to: FoodValues,
  grams: number,
): number {
  let key = KEY_MACRO[from.group];
  if (!isSourceOf(from, key) || !isSourceOf(to, key)) key = 'kcal';
  if (to[key] <= 0) return roundGrams(grams);
  return roundGrams((from[key] * grams) / to[key]);
}

export interface ScalableItem {
  food: FoodValues;
  grams: number;
}

/**
 * Factor por el que multiplicar los gramos de un día para llegar a `targetKcal`.
 * La verdura no se escala: su aporte calórico es mínimo y reducirla no tiene sentido.
 */
export function dayScaleFactor(
  items: ScalableItem[],
  targetKcal: number,
): number {
  let fixedKcal = 0;
  let scalableKcal = 0;
  for (const { food, grams } of items) {
    const kcal = macrosFor(food, grams).kcal;
    if (food.group === 'VEGETABLES') fixedKcal += kcal;
    else scalableKcal += kcal;
  }
  if (scalableKcal <= 0) return 1;
  return Math.max(0, (targetKcal - fixedKcal) / scalableKcal);
}

export function scaledGrams(item: ScalableItem, factor: number): number {
  return item.food.group === 'VEGETABLES'
    ? item.grams
    : roundGrams(item.grams * factor);
}

// ── Objetivos diarios ────────────────────────────────────────────

const ACTIVITY_FACTOR: Record<ActivityLevelName, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

// Déficit/superávit moderados: −20 % para perder grasa sin sacrificar músculo,
// +10 % para ganar músculo minimizando la ganancia de grasa.
const GOAL_KCAL_FACTOR: Record<GoalName, number> = {
  LOSE_FAT: 0.8,
  MAINTAIN: 1,
  RECOMP: 1,
  GAIN_MUSCLE: 1.1,
};

// g de proteína por kg de peso corporal (rango con evidencia: 1,6–2,2 g/kg;
// más alto en déficit y recomposición para proteger la masa muscular).
const PROTEIN_PER_KG: Record<GoalName, number> = {
  LOSE_FAT: 2.2,
  MAINTAIN: 1.8,
  RECOMP: 2.2,
  GAIN_MUSCLE: 2.0,
};

const FAT_PER_KG = 0.9;
const MIN_FAT_KCAL_SHARE = 0.2;

export interface TargetsInput {
  sex: SexName;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevelName;
  goal: GoalName;
}

export interface Targets extends Macros {
  bmr: number;
  tdee: number;
}

/** Mifflin-St Jeor: la fórmula de metabolismo basal más precisa en población general. */
export function basalMetabolicRate(
  sex: SexName,
  age: number,
  heightCm: number,
  weightKg: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'MALE' ? base + 5 : base - 161;
}

export function computeTargets(input: TargetsInput): Targets {
  const bmr = basalMetabolicRate(
    input.sex,
    input.age,
    input.heightCm,
    input.weightKg,
  );
  const tdee = bmr * ACTIVITY_FACTOR[input.activityLevel];
  const kcal = tdee * GOAL_KCAL_FACTOR[input.goal];

  const protein = input.weightKg * PROTEIN_PER_KG[input.goal];
  const fat = Math.max(
    input.weightKg * FAT_PER_KG,
    (kcal * MIN_FAT_KCAL_SHARE) / 9,
  );
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export function ageFrom(birthDate: Date, today = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}
