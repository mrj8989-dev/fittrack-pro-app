import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useClientMealPlans, useMealPlan, useNutritionProfile } from '../hooks/useNutrition'
import ProfileCard from '../components/nutrition/ProfileCard'
import MealPlanEditor from '../components/nutrition/MealPlanEditor'
import CoachNutrition from '../components/nutrition/CoachNutrition'
import { cardStyle, inputStyle } from '../components/nutrition/shared'

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
        <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando...</div>
      ) : plans.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem' }}>
          <i className="ti ti-salad" style={{ fontSize: '28px', color: 'var(--accent-primary)' }} aria-hidden="true" />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginTop: '8px' }}>
            Aún no tienes un menú asignado
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tu entrenador te asignará uno ajustado a tus objetivos. Mientras tanto, rellena tus datos arriba para que pueda calcularlos.
          </div>
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Nutrición
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {isClient
            ? 'Tus calorías y macros según tu objetivo, y el menú semanal que te ha preparado tu entrenador'
            : user?.role === 'TRAINER'
              ? 'Crea plantillas de menú, asígnalas a tus clientes y ajusta los menús que ya tienen'
              : 'Gestiona las plantillas del catálogo, los menús de los clientes y los alimentos'}
        </p>
      </div>

      {isClient ? <ClientNutrition /> : <CoachNutrition isTrainer={user?.role === 'TRAINER'} />}
    </div>
  )
}
