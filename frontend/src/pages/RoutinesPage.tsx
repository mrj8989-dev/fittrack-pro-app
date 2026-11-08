import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCreatePlan, useWorkoutTemplates } from '../hooks/useTrainerPlans'
import { useClients } from '../hooks/useTrainerClients'
import { PlanCard } from '../components/PlanEditor'
import { apiErrorMessage } from '../lib/apiError'
import type { ClientOption } from '../components/PlanEditor'
import { EmptyState, Loader, PageHeader } from '../components/ui'

/**
 * Rutinas plantilla: el entrenador las crea una vez y las asigna (copia) a sus clientes.
 * Las del admin son las "plantillas del centro": las ven todos los entrenadores.
 */
export default function RoutinesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const { data: templates = [], isLoading } = useWorkoutTemplates()
  const { data: clients = [] } = useClients()
  const createPlan = useCreatePlan()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  // Solo se ofrece asignar a clientes cuyo plan incluye entrenamiento.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignable: ClientOption[] = clients.filter((c: any) => c.trainingEnabled !== false)
  const q = filter.trim().toLowerCase()
  const visible = q ? templates.filter(t => t.name.toLowerCase().includes(q)) : templates
  const mine = visible.filter(t => !t.isGlobal || isAdmin)
  const global = isAdmin ? [] : visible.filter(t => t.isGlobal)
  const selected = templates.find(t => t.id === selectedId) ?? templates[0]

  function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    createPlan.mutate({ name, asTemplate: true }, {
      onSuccess: plan => { setSelectedId(plan.id); setName(''); setCreating(false) },
      onError: err => setError(apiErrorMessage(err)),
    })
  }

  const item = (t: (typeof templates)[number]) => (
    <button
      key={t.id}
      type="button"
      onClick={() => setSelectedId(t.id)}
      className={`list-item${selected?.id === t.id ? ' active' : ''}`}
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <span className="icon-tile" style={{ width: '32px', height: '32px' }}>
          <i className={`ti ${t.isGlobal ? 'ti-world' : 'ti-template'}`} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {t.workouts.length} {t.workouts.length === 1 ? 'día' : 'días'} · {t.workouts.reduce((n, w) => n + w.exercises.length, 0)} ejercicios
            {isAdmin && t.ownerName && !t.isGlobal ? ` · ${t.ownerName}` : ''}
          </div>
        </div>
      </div>
    </button>
  )

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-template" aria-hidden="true" /> {isAdmin ? 'Administración' : 'Entrenador'}</>}
        title="Rutinas"
        subtitle={isAdmin
          ? 'Plantillas del centro (las ven todos los entrenadores) y las de cada entrenador'
          : 'Crea tus rutinas una vez y asígnalas a tus clientes en un clic'}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(c => !c)}>
            <i className="ti ti-plus" aria-hidden="true" /> Nueva rutina
          </button>
        }
      />

      {creating && (
        <form onSubmit={create} className="card card-accent plan-inline-form" style={{ marginBottom: '1rem' }}>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required minLength={2} autoFocus
            placeholder="Nombre de la rutina (ej. Full body 3 días)" style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary" disabled={createPlan.isPending}>Crear</button>
          <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
          {error && <div className="field-error" style={{ width: '100%' }}>{error}</div>}
        </form>
      )}

      {isLoading ? (
        <Loader label="Cargando rutinas..." />
      ) : templates.length === 0 ? (
        <div className="card">
          <EmptyState icon="ti-template" title="Aún no tienes rutinas"
            action={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>Crear la primera</button>}>
            Una rutina es un plan con sus días y ejercicios que puedes asignar a cualquiera de tus clientes.
            También puedes guardar como rutina el plan de un cliente desde su ficha.
          </EmptyState>
        </div>
      ) : (
        <div className="split-layout">
          <div className="card">
            <h2 className="section-title">
              <i className="ti ti-list" aria-hidden="true" /> {isAdmin ? 'Todas las rutinas' : 'Mis rutinas'}
              <span className="badge" style={{ marginLeft: 'auto' }}>{templates.length}</span>
            </h2>
            {templates.length > 6 && (
              <input className="input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar rutina"
                aria-label="Buscar rutina" style={{ width: '100%', marginBottom: '10px' }} />
            )}
            <div className="template-list">
              {mine.map(item)}
              {mine.length === 0 && !isAdmin && (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '6px 4px' }}>Todavía no has creado rutinas propias.</div>
              )}
              {global.length > 0 && (
                <>
                  <div className="page-eyebrow" style={{ margin: '12px 4px 4px' }}><i className="ti ti-world" aria-hidden="true" /> Del centro</div>
                  {global.map(item)}
                </>
              )}
            </div>
          </div>

          <div>
            {selected && (
              <PlanCard
                key={selected.id}
                plan={selected}
                clients={assignable}
                onDeleted={() => setSelectedId(null)}
                onCopied={copy => { if (copy.isTemplate) setSelectedId(copy.id) }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
