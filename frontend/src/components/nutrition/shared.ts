import type { ActivityLevel, FoodGroup, Macros, NutritionGoal } from '../../hooks/useNutrition'

export { inputStyle, primaryButtonStyle, secondaryButtonStyle, iconButtonStyle, cardStyle } from '../../lib/styles'

export const FOOD_GROUP_LABEL: Record<FoodGroup, string> = {
  PROTEIN: 'Proteínas',
  CARBS: 'Hidratos',
  FATS: 'Grasas',
  VEGETABLES: 'Verduras',
  FRUITS: 'Frutas',
  OTHER: 'Otros',
}

export const FOOD_GROUPS = Object.keys(FOOD_GROUP_LABEL) as FoodGroup[]

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  SEDENTARY: 'Sedentario (poco o ningún ejercicio)',
  LIGHT: 'Ligero (1-3 días/semana)',
  MODERATE: 'Moderado (3-5 días/semana)',
  ACTIVE: 'Activo (6-7 días/semana)',
  VERY_ACTIVE: 'Muy activo (doble sesión o trabajo físico)',
}

export const GOAL_LABEL: Record<NutritionGoal, string> = {
  LOSE_FAT: 'Perder grasa',
  MAINTAIN: 'Mantener',
  RECOMP: 'Recomposición',
  GAIN_MUSCLE: 'Ganar músculo',
}

export const DAY_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export const MACRO_META: { key: keyof Macros; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calorías', unit: 'kcal' },
  { key: 'protein', label: 'Proteína', unit: 'g' },
  { key: 'carbs', label: 'Hidratos', unit: 'g' },
  { key: 'fat', label: 'Grasa', unit: 'g' },
]

export function formatMacros(m: Macros): string {
  return `${m.kcal} kcal · P ${m.protein} · H ${m.carbs} · G ${m.fat}`
}

/** "≈ 2 unidades" para alimentos que se cuentan por piezas. */
export function unitsHint(grams: number, gramsPerUnit: number | null, unitName: string | null): string | null {
  if (!gramsPerUnit) return null
  const units = Math.round((grams / gramsPerUnit) * 10) / 10
  const name = unitName ?? 'unidad'
  const plural = /[aeiou]$/.test(name) ? `${name}s` : `${name}es`
  return `≈ ${units.toLocaleString('es-ES')} ${units === 1 ? name : plural}`
}

