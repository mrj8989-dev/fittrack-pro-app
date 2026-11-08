import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  AI_DAILY_LIMIT, FEATURE_INFO, PLAN_FEATURES, PLAN_INFO, PLANS, isPlan, minimumPlanFor,
} from '../lib/planAccess'
import type { Feature, Plan } from '../lib/planAccess'

// Orden en que se comparan las funcionalidades en las tarjetas de planes.
const COMPARED: Feature[] = ['exercises', 'dashboard', 'training', 'trainer', 'revisions', 'ai', 'nutrition']

// Funcionalidades del plan que aún no están construidas: se anuncian como "próximamente".
const COMING_SOON: Feature[] = ['ai']

function featureText(feature: Feature, plan: Plan) {
  const soon = COMING_SOON.includes(feature) ? ' (próximamente)' : ''
  if (feature === 'ai' && PLAN_FEATURES[plan].includes('ai')) return `${FEATURE_INFO.ai.label} · ${AI_DAILY_LIMIT[plan]} mensajes/día${soon}`
  return FEATURE_INFO[feature].label + soon
}

/**
 * Página de planes. Es el inicio de los clientes FREE y lo que se muestra cuando un cliente
 * entra en un módulo que su plan no incluye (\`lockedFeature\`).
 */
export default function PlansPage({ lockedFeature }: { lockedFeature?: Feature }) {
  const { user } = useAuth()
  const current: Plan = isPlan(user?.subscriptionPlan) ? user.subscriptionPlan : 'FREE'
  const needed = lockedFeature ? minimumPlanFor(lockedFeature) : null
  const info = lockedFeature ? FEATURE_INFO[lockedFeature] : null
  const [requested, setRequested] = useState<Plan | null>(null)

  return (
    <div className="page" style={{ maxWidth: '1100px' }}>
      <section className="hero" style={{ marginBottom: '18px' }}>
        <div className="hero-content">
          <div className="page-eyebrow" style={{ color: 'var(--accent-light)' }}>
            <i className={`ti ${info ? 'ti-lock' : 'ti-sparkles'}`} aria-hidden="true" />
            {info ? `Incluido en ${PLAN_INFO[needed!].name}` : `Tu plan: ${PLAN_INFO[current].name}`}
          </div>
          <h1 className="hero-title">
            {info ? info.label : `Hola${user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋`}
          </h1>
          <p className="hero-subtitle">
            {info
              ? `${info.description} Tu plan actual no lo incluye.`
              : 'Ya puedes explorar el catálogo de ejercicios. Cuando quieras ir a más, elige un plan.'}
          </p>
          <div className="hero-actions">
            <Link to="/ejercicios" className="btn btn-glass"><i className="ti ti-list-search" aria-hidden="true" /> Ver ejercicios</Link>
          </div>
        </div>
      </section>

      <div className="plans-grid">
        {PLANS.map(plan => {
          const isCurrent = plan === current
          const isTarget = plan === needed
          return (
            <article key={plan} className={`card plan-card${PLAN_INFO[plan].highlight ? ' featured' : ''}${isTarget ? ' target' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{PLAN_INFO[plan].name}</h2>
                {isCurrent
                  ? <span className="badge">Tu plan</span>
                  : PLAN_INFO[plan].highlight && <span className="badge badge-solid">Recomendado</span>}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 14px' }}>{PLAN_INFO[plan].tagline}</p>

              <ul className="plan-features">
                {COMPARED.map(f => {
                  const included = PLAN_FEATURES[plan].includes(f)
                  return (
                    <li key={f} className={included ? '' : 'off'} style={f === lockedFeature && included ? { color: 'var(--accent-primary)', fontWeight: 600 } : undefined}>
                      <i className={`ti ${included ? 'ti-circle-check-filled' : 'ti-circle-x'}`} aria-hidden="true" />
                      {featureText(f, plan)}
                    </li>
                  )
                })}
              </ul>

              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                {isCurrent ? (
                  <button className="btn btn-secondary btn-block" disabled>Plan actual</button>
                ) : PLANS.indexOf(plan) < PLANS.indexOf(current) ? (
                  <button className="btn btn-ghost btn-block" disabled>Incluido en tu plan</button>
                ) : (
                  <button className="btn btn-primary btn-block" onClick={() => setRequested(plan)}>
                    <i className="ti ti-arrow-up-right" aria-hidden="true" /> Quiero {PLAN_INFO[plan].name}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {requested && (
        <div className="alert" role="status" style={{ marginTop: '14px', background: 'var(--accent-soft)', color: 'var(--text-primary)', justifyContent: 'center' }}>
          <i className="ti ti-info-circle" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
          Para activar {PLAN_INFO[requested].name}, pídeselo a tu centro o a tu entrenador: lo activan desde su panel y lo verás al momento.
        </div>
      )}

      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '14px' }}>
        <i className="ti ti-info-circle" aria-hidden="true" /> El cambio de plan lo activa tu centro. Si bajas de plan, tus datos no se borran: vuelven a estar disponibles al subir.
      </p>
    </div>
  )
}
