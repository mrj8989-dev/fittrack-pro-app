import {
  computeTargets,
  dayScaleFactor,
  equivalentGrams,
  macrosFor,
  roundGrams,
  scaledGrams,
  basalMetabolicRate,
  ageFrom,
  FoodValues,
} from './nutrition.calc';

const arroz: FoodValues = {
  group: 'CARBS',
  kcal: 359,
  protein: 7.5,
  carbs: 76,
  fat: 2.7,
};
const patata: FoodValues = {
  group: 'CARBS',
  kcal: 72,
  protein: 2,
  carbs: 15.5,
  fat: 0.1,
};
const pollo: FoodValues = {
  group: 'PROTEIN',
  kcal: 102,
  protein: 22.5,
  carbs: 0,
  fat: 1.5,
};
const merluza: FoodValues = {
  group: 'PROTEIN',
  kcal: 82,
  protein: 17.8,
  carbs: 0,
  fat: 1.2,
};
const aguacate: FoodValues = {
  group: 'FATS',
  kcal: 174,
  protein: 2,
  carbs: 2,
  fat: 17.5,
};
const verdura: FoodValues = {
  group: 'VEGETABLES',
  kcal: 20,
  protein: 1.5,
  carbs: 3,
  fat: 0.2,
};

describe('nutrition.calc', () => {
  it('calcula los macros de una ración a partir de los valores por 100 g', () => {
    expect(macrosFor(arroz, 50)).toEqual({
      kcal: 179.5,
      protein: 3.75,
      carbs: 38,
      fat: 1.35,
    });
  });

  it('redondea al gramo las raciones pequeñas y a 5 g el resto', () => {
    expect(roundGrams(7.4)).toBe(7);
    expect(roundGrams(0.3)).toBe(1);
    expect(roundGrams(0)).toBe(0);
    expect(roundGrams(247)).toBe(245);
  });

  describe('equivalentGrams', () => {
    it('al cambiar arroz por patata conserva los hidratos', () => {
      // 56 g de arroz = 42,6 g de hidratos → 275 g de patata
      expect(equivalentGrams(arroz, patata, 56)).toBe(275);
    });

    it('al cambiar pollo por merluza conserva la proteína', () => {
      expect(equivalentGrams(pollo, merluza, 100)).toBe(125);
    });

    it('si el alimento nuevo no aporta el macro clave, iguala calorías', () => {
      // El aguacate casi no tiene proteína: igualar proteína daría >1 kg.
      expect(equivalentGrams(pollo, aguacate, 100)).toBe(60);
    });
  });

  describe('escalado de un día', () => {
    const day = [
      { food: arroz, grams: 100 }, // 359 kcal
      { food: pollo, grams: 100 }, // 102 kcal
      { food: verdura, grams: 150 }, // 30 kcal, no se escala
    ];

    it('calcula el factor dejando fija la verdura', () => {
      const factor = dayScaleFactor(day, 30 + 461 * 0.5);
      expect(factor).toBeCloseTo(0.5);
      expect(scaledGrams(day[0], factor)).toBe(50);
      expect(scaledGrams(day[2], factor)).toBe(150);
    });

    it('nunca devuelve un factor negativo', () => {
      expect(dayScaleFactor(day, 10)).toBe(0);
    });
  });

  describe('objetivos diarios', () => {
    it('aplica Mifflin-St Jeor', () => {
      expect(basalMetabolicRate('MALE', 30, 180, 80)).toBe(1780);
      expect(basalMetabolicRate('FEMALE', 30, 165, 60)).toBe(1320.25);
    });

    it('reparte proteína, grasa e hidratos según el objetivo', () => {
      const t = computeTargets({
        sex: 'MALE',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'MODERATE',
        goal: 'LOSE_FAT',
      });
      expect(t.tdee).toBe(2759); // 1780 × 1,55
      expect(t.kcal).toBe(2207); // −20 %
      expect(t.protein).toBe(176); // 2,2 g/kg
      expect(t.fat).toBe(72); // 0,9 g/kg
      // Los macros cuadran con las calorías (±redondeo).
      expect(
        Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal),
      ).toBeLessThan(10);
    });

    it('la grasa nunca baja del 20 % de las calorías', () => {
      const t = computeTargets({
        sex: 'MALE',
        age: 25,
        heightCm: 190,
        weightKg: 60,
        activityLevel: 'VERY_ACTIVE',
        goal: 'GAIN_MUSCLE',
      });
      expect(t.fat * 9).toBeGreaterThanOrEqual(t.kcal * 0.2 - 9);
    });
  });

  it('calcula la edad teniendo en cuenta si ya pasó el cumpleaños', () => {
    const today = new Date(2026, 10, 7);
    expect(ageFrom(new Date(1990, 10, 7), today)).toBe(36);
    expect(ageFrom(new Date(1990, 10, 8), today)).toBe(35);
  });
});
