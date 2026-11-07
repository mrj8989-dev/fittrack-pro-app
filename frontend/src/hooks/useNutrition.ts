import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export type FoodGroup = 'PROTEIN' | 'CARBS' | 'FATS' | 'VEGETABLES' | 'FRUITS' | 'OTHER'
export type Sex = 'MALE' | 'FEMALE'
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE'
export type NutritionGoal = 'LOSE_FAT' | 'MAINTAIN' | 'RECOMP' | 'GAIN_MUSCLE'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** Valores por 100 g en crudo. */
export interface Food extends Macros {
  id: string
  name: string
  group: FoodGroup
  unitName: string | null
  gramsPerUnit: number | null
  createdById: string | null
}

export interface MealItem {
  id: string
  grams: number
  food: Food
  macros: Macros
}

export interface Meal {
  id: string
  name: string
  order: number
  items: MealItem[]
  totals: Macros
}

export interface MealPlanDay {
  dayOfWeek: number
  meals: Meal[]
  totals: Macros
}

export interface MealPlanSummary {
  id: string
  name: string
  description: string | null
  isTemplate: boolean
  /** Plantilla global del catálogo (la gestiona el admin). */
  isGlobal: boolean
  /** Si el usuario actual puede modificarlo libremente (entrenador o admin). */
  canEdit: boolean
  /** Si puede intercambiar alimentos por equivalentes (también el cliente en su menú). */
  canSwap: boolean
  owner: { id: string; name: string } | null
  assignedBy: { id: string; name: string } | null
  updatedAt: string
  dailyAverage: Macros
  mealsPerDay: number
}

export interface MealPlan extends Omit<MealPlanSummary, 'mealsPerDay'> {
  days: MealPlanDay[]
}

export interface NutritionProfileInput {
  sex: Sex
  birthDate: string
  heightCm: number
  weightKg?: number
  activityLevel: ActivityLevel
  goal: NutritionGoal
}

export interface NutritionProfileResponse {
  profile: (NutritionProfileInput & { id: string }) | null
  weightKg: number | null
  weightSource: 'revision' | 'profile' | null
  targets: (Macros & { bmr: number; tdee: number }) | null
}

export interface SwapOption {
  food: Food
  grams: number
  macros: Macros
}

// ── Alimentos ──────────────────────────────────────────────────

export function useFoods() {
  return useQuery<Food[]>({
    queryKey: ['foods'],
    queryFn: () => api.get('/foods').then(r => r.data),
  })
}

export type FoodInput = Omit<Food, 'id' | 'createdById' | 'unitName' | 'gramsPerUnit'> & {
  unitName?: string
  gramsPerUnit?: number
}

export function useCreateFood() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FoodInput) => api.post('/foods', data).then(r => r.data as Food),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['foods'] }),
  })
}

export function useUpdateFood() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: FoodInput & { id: string }) => api.put(`/foods/${id}`, data).then(r => r.data as Food),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      // Los menús muestran los valores del alimento: se recalculan con los nuevos.
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] })
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
      queryClient.invalidateQueries({ queryKey: ['meal-templates'] })
    },
  })
}

export function useDeleteFood() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/foods/${id}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['foods'] }),
  })
}

// ── Perfil y objetivos ─────────────────────────────────────────

/** Perfil propio, o el de un cliente (solo para su entrenador). */
export function useNutritionProfile(clientId?: string, enabled = true) {
  return useQuery<NutritionProfileResponse>({
    queryKey: ['nutrition-profile', clientId ?? 'me'],
    queryFn: () => api.get('/nutrition/profile', { params: { clientId } }).then(r => r.data),
    enabled,
  })
}

export function useSaveNutritionProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: NutritionProfileInput) =>
      api.put('/nutrition/profile', data).then(r => r.data as NutritionProfileResponse),
    onSuccess: data => queryClient.setQueryData(['nutrition-profile', 'me'], data),
  })
}

// ── Menús ──────────────────────────────────────────────────────

export function useMealTemplates() {
  return useQuery<MealPlanSummary[]>({
    queryKey: ['meal-templates'],
    queryFn: () => api.get('/meal-plans/templates').then(r => r.data),
  })
}

/** Menús del cliente actual, o de un cliente concreto (vista del entrenador). */
export function useClientMealPlans(clientId?: string, enabled = true) {
  return useQuery<MealPlanSummary[]>({
    queryKey: ['meal-plans', clientId ?? 'me'],
    queryFn: () => api.get('/meal-plans', { params: { clientId } }).then(r => r.data),
    enabled,
  })
}

export function useMealPlan(id: string | undefined) {
  return useQuery<MealPlan>({
    queryKey: ['meal-plan', id],
    queryFn: () => api.get(`/meal-plans/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

/**
 * Todas las mutaciones de un menú devuelven el menú actualizado: se guarda directamente
 * en la caché (sin refetch) y se refresca la lista para que cuadren las medias.
 */
function usePlanMutation<V>(fn: (vars: V) => Promise<MealPlan>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: plan => {
      queryClient.setQueryData(['meal-plan', plan.id], plan)
      queryClient.invalidateQueries({ queryKey: plan.isTemplate ? ['meal-templates'] : ['meal-plans'] })
    },
  })
}

/** Sin `sourceId` crea un menú vacío; con él, una copia (opcionalmente ajustada a `targetKcal`). */
export function useCreateMealPlan() {
  return usePlanMutation((data: { sourceId?: string; name?: string; targetKcal?: number }) =>
    api.post('/meal-plans', data).then(r => r.data))
}

export function useAssignMealPlan() {
  return usePlanMutation(({ planId, ...data }: { planId: string; clientId: string; targetKcal?: number; name?: string }) =>
    api.post(`/meal-plans/${planId}/assign`, data).then(r => r.data))
}

export function useRenameMealPlan() {
  return usePlanMutation(({ planId, name }: { planId: string; name: string }) =>
    api.patch(`/meal-plans/${planId}`, { name }).then(r => r.data))
}

export function useAddMeal() {
  return usePlanMutation(({ planId, dayOfWeek, name }: { planId: string; dayOfWeek: number; name: string }) =>
    api.post(`/meal-plans/${planId}/meals`, { dayOfWeek, name }).then(r => r.data))
}

export function useRenameMeal() {
  return usePlanMutation(({ planId, mealId, name }: { planId: string; mealId: string; name: string }) =>
    api.patch(`/meal-plans/${planId}/meals/${mealId}`, { name }).then(r => r.data))
}

export function useRemoveMeal() {
  return usePlanMutation(({ planId, mealId }: { planId: string; mealId: string }) =>
    api.delete(`/meal-plans/${planId}/meals/${mealId}`).then(r => r.data))
}

export function useScaleMealPlan() {
  return usePlanMutation(({ planId, targetKcal }: { planId: string; targetKcal: number }) =>
    api.post(`/meal-plans/${planId}/scale`, { targetKcal }).then(r => r.data))
}

export function useAddMealItem() {
  return usePlanMutation(({ planId, mealId, foodId, grams }: { planId: string; mealId: string; foodId: string; grams: number }) =>
    api.post(`/meal-plans/${planId}/meals/${mealId}/items`, { foodId, grams }).then(r => r.data))
}

export function useUpdateMealItem() {
  return usePlanMutation(({ planId, itemId, grams }: { planId: string; itemId: string; grams: number }) =>
    api.patch(`/meal-plans/${planId}/items/${itemId}`, { grams }).then(r => r.data))
}

export function useRemoveMealItem() {
  return usePlanMutation(({ planId, itemId }: { planId: string; itemId: string }) =>
    api.delete(`/meal-plans/${planId}/items/${itemId}`).then(r => r.data))
}

export function useSwapMealItem() {
  return usePlanMutation(({ planId, itemId, foodId }: { planId: string; itemId: string; foodId: string }) =>
    api.post(`/meal-plans/${planId}/items/${itemId}/swap`, { foodId }).then(r => r.data))
}

export function useSwapOptions(planId: string, itemId: string | null) {
  return useQuery<SwapOption[]>({
    queryKey: ['swap-options', planId, itemId],
    queryFn: () => api.get(`/meal-plans/${planId}/items/${itemId}/swap-options`).then(r => r.data),
    enabled: !!itemId,
  })
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/meal-plans/${id}`).then(r => r.data),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['meal-plan', id] })
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
      queryClient.invalidateQueries({ queryKey: ['meal-templates'] })
    },
  })
}
