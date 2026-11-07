import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useClientMealPlans, useMealPlan, useNutritionProfile } from '../hooks/useNutrition'
import ProfileCard from '../components/nutrition/ProfileCard'
import MealPlanEditor from '../components/nutrition/MealPlanEditor'
import CoachNutrition from '../components/nutrition/CoachNutrition'
import { inputStyle } from '../components/nutrition/shared'
import { EmptyState, Loader, PageHeader } from '../components/ui'

/** El cliente ve los menús que le asignan su entrenador o el admin. */
function ClientNutrition() {
  const { data: profileData } = useNutritionProfile()
  const { data: plans = [], isLoading: plansLoading } = useClientMealPlans()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Por defecto, el menú actualizado más recientemente.
  const planId = selectedId && plans.some(p => p.id === selectedId) ? selectedId : plans[0]?.id
  const { data: plan } = useMealPlan(planId)
  const targets = profileData?.targets ?? undefined

  return (
    <>
      <ProfileCard />

      {plans.length > 1 && (
        <select value={planId} onChange={e => setSelectedId(e.target.value)} aria-label="Menú" style={{ ...inputStyle, alignSelf: 'flex-start' }}>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.dailyAverage.kcal} kcal/día{p.assignedBy ? ` · de ${p.assignedBy.name}` : ''}
            </option>
          ))}
        </select>
      )}

      {plansLoading ? (
        <Loader inline />
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState icon="ti-salad" title="Aún no tienes un menú asignado">
            Tu entrenador te asignará uno ajustado a tus objetivos. Mientras tanto, rellena tus datos arriba para que pueda calcularlos.
          </EmptyState>
        </div>
      ) : plan ? (
        <MealPlanEditor key={plan.id} plan={plan} targets={targets} />
      ) : null}
    </>
  )
}

export default function NutritionPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'CLIENT'

  return (
    <div className="page" style={{ maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-salad" aria-hidden="true" /> Nutrición</>}
        title={isClient ? 'Tu alimentación' : 'Nutrición'}
        subtitle={isClient
          ? 'Tus calorías y macros según tu objetivo, y el menú semanal que te ha preparado tu entrenador'
          : user?.role === 'TRAINER'
            ? 'Crea plantillas de menú, asígnalas a tus clientes y ajusta los menús que ya tienen'
            : 'Gestiona las plantillas del catálogo, los menús de los clientes y los alimentos'}
      />

      {isClient ? <ClientNutrition /> : <CoachNutrition isTrainer={user?.role === 'TRAINER'} />}
    </div>
  )
}
