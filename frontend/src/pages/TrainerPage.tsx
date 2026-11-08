import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useClients, useRemoveClient } from '../hooks/useTrainerClients'
import AddClientModal from '../components/AddClientModal'
import { useClientPlans, useCopyPlan, useCreatePlan, useWorkoutTemplates } from '../hooks/useTrainerPlans'
import { PlanCard } from '../components/PlanEditor'
import { apiErrorMessage } from '../lib/apiError'
import type { ClientOption } from '../components/PlanEditor'
import { useExercises } from '../hooks/useExercises'
import { useClientSessions, useClientRecords } from '../hooks/useTrainerSessions'
import ChatThread from '../components/ChatThread'
import ClientRevisionsPanel from '../components/ClientRevisionsPanel'
import SessionHistory from '../components/SessionHistory'
import Avatar from '../components/Avatar'
import { inputStyle } from '../lib/styles'
import { EmptyState, Loader, PageHeader } from '../components/ui'

type ClientTab = 'plan' | 'historial' | 'revisiones' | 'chat'
const TAB_INFO: Record<ClientTab, { label: string; icon: string }> = {
  plan: { label: 'Plan de entrenamiento', icon: 'ti-barbell' },
  historial: { label: 'Historial y récords', icon: 'ti-history' },
  revisiones: { label: 'Revisiones', icon: 'ti-camera' },
  chat: { label: 'Chat', icon: 'ti-message-circle' },
}
const isClientTab = (t: string | null): t is ClientTab => !!t && t in TAB_INFO

function ClientHistoryPanel({ clientId }: { clientId: string }) {
  const { data: sessions = [], isLoading: loadingSessions } = useClientSessions(clientId)
  const { data: records = [], isLoading: loadingRecords } = useClientRecords(clientId)
  const { data: exercises = [] } = useExercises()

  const exerciseName = (id: string) => exercises.find((e: any) => e.id === id)?.name || 'Ejercicio'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card">
        <h3 className="section-title"><i className="ti ti-trophy" aria-hidden="true" /> Récords personales</h3>
        {loadingRecords ? (
          <Loader inline />
        ) : records.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Sin récords todavía</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {records.map((r: any) => (
              <div key={r.exerciseId} className="inset" style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>{exerciseName(r.exerciseId)}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--accent-primary)' }}>{r.maxWeight} kg × {r.reps}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="section-title"><i className="ti ti-history" aria-hidden="true" /> Historial de sesiones</h3>
        {loadingSessions ? <Loader inline /> : <SessionHistory sessions={sessions} emptyText="Este cliente todavía no ha entrenado ninguna sesión" />}
      </div>
    </div>
  )
}

export default function TrainerPage() {
  const { user } = useAuth()
  // Se puede llegar con un cliente y una pestaña ya elegidos (?cliente=…&tab=…), p. ej. desde el inicio.
  const [searchParams] = useSearchParams()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(searchParams.get('cliente'))
  const [activeTab, setActiveTab] = useState<ClientTab>(() => {
    const t = searchParams.get('tab')
    return isClientTab(t) ? t : 'plan'
  })
  const [showAddClient, setShowAddClient] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planTemplateId, setPlanTemplateId] = useState('')
  const [planError, setPlanError] = useState('')
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [clientFilter, setClientFilter] = useState('')

  const { data: clients = [], isLoading: loadingClients } = useClients()
  const removeClient = useRemoveClient()

  const { data: plans = [], isLoading: loadingPlans } = useClientPlans(selectedClientId ?? undefined)
  const createPlan = useCreatePlan()
  const copyPlan = useCopyPlan()
  const { data: templates = [] } = useWorkoutTemplates()

  // El admin ve a todos los clientes de la plataforma; las altas y asignaciones las hace desde /admin.
  const isAdmin = user?.role === 'ADMIN'

  if (user?.role !== 'TRAINER' && !isAdmin) {
    return (
      <div className="page card" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <EmptyState icon="ti-lock" title="Acceso restringido">Esta sección es solo para entrenadores</EmptyState>
      </div>
    )
  }

  const filter = clientFilter.trim().toLowerCase()
  const visibleClients = filter
    ? clients.filter((c: any) => c.name.toLowerCase().includes(filter) || c.email.toLowerCase().includes(filter))
    : clients
  const tabs: ClientTab[] = isAdmin ? ['plan', 'historial', 'revisiones'] : ['plan', 'historial', 'revisiones', 'chat']

  // Nuevo plan: vacío, o copia de una rutina plantilla (con el nombre escrito, si lo hay).
  function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClientId) return
    setPlanError('')
    const done = {
      onSuccess: () => { setPlanName(''); setPlanTemplateId(''); setShowPlanForm(false) },
      onError: (err: unknown) => setPlanError(apiErrorMessage(err)),
    }
    if (planTemplateId) copyPlan.mutate({ id: planTemplateId, targetUserId: selectedClientId, name: planName.trim() || undefined }, done)
    else createPlan.mutate({ name: planName, targetUserId: selectedClientId }, done)
  }

  // A quién se puede copiar un plan desde aquí: clientes con entrenamiento en su plan.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copyTargets: ClientOption[] = clients.filter((c: any) => c.trainingEnabled !== false)

  const selectedClient = clients.find((c: any) => c.id === selectedClientId)

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-users" aria-hidden="true" /> {isAdmin ? 'Administración' : 'Entrenador'}</>}
        title={isAdmin ? 'Todos los clientes' : 'Panel de entrenador'}
        subtitle={isAdmin
          ? 'Consulta y edita el plan y el historial de cualquier cliente de la plataforma'
          : 'Gestiona tus clientes y construye sus planes de entrenamiento'}
        actions={isAdmin && (
          <Link to="/admin" className="btn btn-secondary"><i className="ti ti-shield-star" aria-hidden="true" /> Gestionar usuarios</Link>
        )}
      />

      {/* En móvil, con un cliente abierto se oculta la lista (se vuelve con "← Clientes"). */}
      <div className={`split-layout${selectedClientId ? ' has-selection' : ''}`}>
        {/* CLIENTES */}
        <div className="card client-list-card">
          <h2 className="section-title">
            <i className="ti ti-users" aria-hidden="true" /> {isAdmin ? 'Clientes' : 'Mis clientes'}
            <span className="badge" style={{ marginLeft: 'auto' }}>{clients.length}</span>
          </h2>

          {clients.length > 6 && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} aria-hidden="true" />
              <input
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                placeholder="Buscar cliente"
                aria-label="Buscar cliente"
                style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }}
              />
            </div>
          )}

          {!isAdmin && (
            <button onClick={() => setShowAddClient(true)} className="btn btn-primary btn-block" style={{ marginBottom: '12px' }}>
              <i className="ti ti-user-plus" aria-hidden="true" /> Añadir cliente
            </button>
          )}
          {showAddClient && <AddClientModal onClose={() => setShowAddClient(false)} onAdded={id => setSelectedClientId(id)} />}

          {loadingClients ? (
            <Loader inline />
          ) : clients.length === 0 ? (
            <EmptyState icon="ti-user-plus" title="Sin clientes">{isAdmin ? 'Da de alta clientes desde el panel' : 'Añade tu primer cliente con el botón de arriba'}</EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '60vh', overflowY: 'auto' }}>
              {visibleClients.map((client: any) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`list-item${selectedClientId === client.id ? ' active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Avatar name={client.name} photoUrl={client.profilePhoto} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</div>
                    </div>
                  </div>
                  {!isAdmin && <button
                    onClick={e => {
                      e.stopPropagation()
                      if (!confirm(`¿Quitar a ${client.name} de tu cartera? Conservará sus planes e historial, pero dejarás de verlo.`)) return
                      removeClient.mutate(client.id)
                      if (selectedClientId === client.id) setSelectedClientId(null)
                    }}
                    className="btn-icon"
                    style={{ width: '28px', height: '28px', flexShrink: 0 }}
                    title="Quitar cliente"
                    aria-label="Quitar cliente"
                  >
                    <i className="ti ti-x" style={{ fontSize: '13px' }} aria-hidden="true" />
                  </button>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PLANES DEL CLIENTE SELECCIONADO */}
        <div>
          {!selectedClientId ? (
            <div className="card">
              <EmptyState icon="ti-hand-click" title="Selecciona un cliente">Elige un cliente de la lista para ver y editar sus planes, su historial o hablar con él</EmptyState>
            </div>
          ) : (
            <>
              <button type="button" className="btn btn-ghost btn-sm mobile-only" onClick={() => setSelectedClientId(null)} style={{ marginBottom: '8px' }}>
                <i className="ti ti-arrow-left" aria-hidden="true" /> Clientes
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <Avatar name={selectedClient?.name} photoUrl={selectedClient?.profilePhoto} size={40} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedClient?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{selectedClient?.email}</div>
                  </div>
                </div>

                <div className="tabs" role="tablist">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      title={TAB_INFO[tab].label}
                      role="tab"
                      aria-selected={activeTab === tab}
                      className={`tab${activeTab === tab ? ' active' : ''}`}
                    >
                      <i className={`ti ${TAB_INFO[tab].icon}`} aria-hidden="true" />
                      <span className="tab-label">{TAB_INFO[tab].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'plan' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button onClick={() => setShowPlanForm(s => !s)} className="btn btn-primary">
                      <i className="ti ti-plus" aria-hidden="true" /> Nuevo plan
                    </button>
                  </div>

                  {showPlanForm && (
                    <form onSubmit={handleCreatePlan} className="card card-accent plan-inline-form" style={{ marginBottom: '1rem' }}>
                      <select className="input" value={planTemplateId} onChange={e => setPlanTemplateId(e.target.value)} aria-label="Partir de" style={{ flex: '1 1 200px' }}>
                        <option value="">Plan vacío</option>
                        {templates.length > 0 && (
                          <optgroup label="A partir de una rutina">
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.workouts.length} días)</option>)}
                          </optgroup>
                        )}
                      </select>
                      <input
                        className="input"
                        value={planName}
                        onChange={e => setPlanName(e.target.value)}
                        placeholder={planTemplateId ? 'Nombre (por defecto, el de la rutina)' : 'Nombre del plan (ej. Fuerza 12 semanas)'}
                        required={!planTemplateId}
                        minLength={2}
                        style={{ flex: '2 1 220px' }}
                      />
                      <button type="submit" className="btn btn-primary" disabled={createPlan.isPending || copyPlan.isPending}>
                        {planTemplateId ? 'Asignar' : 'Crear'}
                      </button>
                      {planError && <div className="field-error" style={{ width: '100%' }}>{planError}</div>}
                    </form>
                  )}

                  {loadingPlans ? (
                    <Loader inline label="Cargando planes..." />
                  ) : plans.length === 0 ? (
                    <div className="card">
                      <EmptyState icon="ti-calendar-off" title="Sin planes">Este cliente todavía no tiene ningún plan</EmptyState>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {plans.map(plan => (
                        <PlanCard key={plan.id} plan={plan} clients={copyTargets} currentClientId={selectedClientId} />
                      ))}
                    </div>
                  )}
                </>
              ) : activeTab === 'historial' ? (
                <ClientHistoryPanel clientId={selectedClientId} />
              ) : activeTab === 'revisiones' ? (
                <ClientRevisionsPanel key={selectedClientId} clientId={selectedClientId} />
              ) : (
                <ChatThread otherUserId={selectedClientId} otherUserName={selectedClient?.name} otherUserPhoto={selectedClient?.profilePhoto} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
