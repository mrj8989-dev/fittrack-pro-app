import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useClients, useRemoveClient } from '../hooks/useTrainerClients'
import AddClientModal from '../components/AddClientModal'
import {
  useClientPlans, useCreatePlan, useCreateWorkout,
  useAddExercise, useRemoveExercise, useReorderExercises,
} from '../hooks/useTrainerPlans'
import { useExercises } from '../hooks/useExercises'
import { useClientSessions, useClientRecords } from '../hooks/useTrainerSessions'
import ChatThread from '../components/ChatThread'
import Avatar from '../components/Avatar'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { inputStyle, primaryButtonStyle, secondaryButtonStyle } from '../lib/styles'
import { EmptyState, Loader, PageHeader } from '../components/ui'

const DAY_SHORT = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D']

function groupByMuscle<T extends { muscleGroup: string }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) (groups[item.muscleGroup] ??= []).push(item)
  return groups
}

function SortableExerciseRow({ exercise, onRemove }: { exercise: any; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 10px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    marginBottom: '6px',
    boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-tertiary)', display: 'flex' }}>
        <i className="ti ti-grip-vertical" style={{ fontSize: '16px' }} aria-hidden="true" />
      </span>
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{exercise.exercise.name}</span>
      <span className="badge">
        {exercise.sets}x{exercise.reps ?? '-'}{exercise.restTime ? ` · ${exercise.restTime}s desc.` : ''}
      </span>
      <button onClick={onRemove} className="btn-icon" style={{ width: '28px', height: '28px' }} title="Quitar ejercicio" aria-label="Quitar ejercicio">
        <i className="ti ti-trash" style={{ fontSize: '14px' }} aria-hidden="true" />
      </button>
    </div>
  )
}

function WorkoutDayCard({ workout }: { workout: any }) {
  const [items, setItems] = useState(workout.exercises)
  const [showAddForm, setShowAddForm] = useState(false)
  const [exerciseId, setExerciseId] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [restTime, setRestTime] = useState('90')

  useEffect(() => setItems(workout.exercises), [workout.exercises])

  const { data: exercises = [] } = useExercises()
  const reorderExercises = useReorderExercises()
  const removeExercise = useRemoveExercise()
  const addExercise = useAddExercise()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i: any) => i.id === active.id)
    const newIndex = items.findIndex((i: any) => i.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)
    reorderExercises.mutate({ workoutId: workout.id, orderedIds: newItems.map((i: any) => i.id) })
  }

  function handleAddExercise(e: React.FormEvent) {
    e.preventDefault()
    if (!exerciseId) return
    addExercise.mutate({
      workoutId: workout.id,
      exerciseId,
      sets: Number(sets),
      reps: reps ? Number(reps) : undefined,
      restTime: restTime ? Number(restTime) : undefined,
      order: items.length + 1,
    }, {
      onSuccess: () => {
        setExerciseId('')
        setShowAddForm(false)
      },
    })
  }

  return (
    <div className="inset" style={{ padding: '1rem', marginTop: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
        {workout.dayOfWeek ? <span className="badge badge-accent">Día {workout.dayOfWeek}</span> : null}
        {workout.name}
      </div>

      {items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((ex: any) => (
              <SortableExerciseRow
                key={ex.id}
                exercise={ex}
                onRemove={() => removeExercise.mutate({ workoutId: workout.id, exerciseId: ex.id })}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          Sin ejercicios todavía
        </div>
      )}

      {showAddForm ? (
        <form onSubmit={handleAddExercise} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          <select
            value={exerciseId}
            onChange={e => setExerciseId(e.target.value)}
            required
            style={{ ...inputStyle, flex: '1 1 160px' }}
          >
            <option value="">Selecciona ejercicio...</option>
            {Object.entries(groupByMuscle(exercises)).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </optgroup>
            ))}
          </select>
          <input type="number" min={1} value={sets} onChange={e => setSets(e.target.value)} placeholder="Sets" style={{ ...inputStyle, width: '70px' }} />
          <input type="number" min={1} value={reps} onChange={e => setReps(e.target.value)} placeholder="Reps" style={{ ...inputStyle, width: '70px' }} />
          <input type="number" min={1} value={restTime} onChange={e => setRestTime(e.target.value)} placeholder="Descanso (s)" style={{ ...inputStyle, width: '110px' }} />
          <button type="submit" style={primaryButtonStyle}>Añadir</button>
          <button type="button" onClick={() => setShowAddForm(false)} style={secondaryButtonStyle}>
            Cancelar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '4px', color: 'var(--accent-primary)' }}
        >
          <i className="ti ti-plus" aria-hidden="true" /> Añadir ejercicio
        </button>
      )}
    </div>
  )
}

function PlanCard({ plan }: { plan: any }) {
  const [showDayForm, setShowDayForm] = useState(false)
  const [dayName, setDayName] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const createWorkout = useCreateWorkout()

  function handleCreateWorkout(e: React.FormEvent) {
    e.preventDefault()
    createWorkout.mutate({
      name: dayName,
      dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined,
      workoutPlanId: plan.id,
    }, {
      onSuccess: () => {
        setDayName('')
        setDayOfWeek('')
        setShowDayForm(false)
      },
    })
  }

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const activeDay = plan.workouts.find((w: any) => w.id === selectedDayId) ?? plan.workouts[0]

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="icon-tile"><i className="ti ti-list-details" aria-hidden="true" /></span>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{plan.name}</div>
      </div>
      {plan.description && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{plan.description}</div>
      )}

      {plan.workouts.length > 0 && (
        <div className="tabs" role="tablist" style={{ marginTop: '14px', display: 'flex', width: '100%' }}>
          {plan.workouts.map((workout: any) => (
            <button
              key={workout.id}
              role="tab"
              aria-selected={activeDay?.id === workout.id}
              className={`tab${activeDay?.id === workout.id ? ' active' : ''}`}
              onClick={() => setSelectedDayId(workout.id)}
              title={workout.name}
            >
              {workout.dayOfWeek ? DAY_SHORT[workout.dayOfWeek] : '·'} {workout.name}
              <span style={{ fontSize: '11px', opacity: 0.7 }}>{workout.exercises.length}</span>
            </button>
          ))}
          <button className="tab" onClick={() => setShowDayForm(true)} title="Nuevo día" aria-label="Nuevo día de entrenamiento">
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>
      )}

      {activeDay && <WorkoutDayCard key={activeDay.id} workout={activeDay} />}

      {showDayForm ? (
        <form onSubmit={handleCreateWorkout} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
          <input
            value={dayName}
            onChange={e => setDayName(e.target.value)}
            placeholder="Nombre del día (ej. Pecho y tríceps)"
            required
            style={{ ...inputStyle, flex: '1 1 200px' }}
          />
          <input
            type="number" min={1} max={7}
            value={dayOfWeek}
            onChange={e => setDayOfWeek(e.target.value)}
            placeholder="Día semana (1-7)"
            style={{ ...inputStyle, width: '140px' }}
          />
          <button type="submit" style={primaryButtonStyle}>Crear día</button>
          <button type="button" onClick={() => setShowDayForm(false)} style={secondaryButtonStyle}>
            Cancelar
          </button>
        </form>
      ) : plan.workouts.length === 0 && (
        <button
          onClick={() => setShowDayForm(true)}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '10px', color: 'var(--accent-primary)' }}
        >
          <i className="ti ti-calendar-plus" aria-hidden="true" /> Nuevo día de entrenamiento
        </button>
      )}
    </div>
  )
}

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
        {loadingSessions ? (
          <Loader inline />
        ) : sessions.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Este cliente todavía no ha entrenado ninguna sesión</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((session: any) => {
              const setsByExercise: Record<string, any[]> = {}
              session.sets.forEach((set: any) => {
                if (!setsByExercise[set.exerciseId]) setsByExercise[set.exerciseId] = []
                setsByExercise[set.exerciseId].push(set)
              })

              return (
                <div key={session.id} className="inset" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{session.workout?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {new Date(session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {session.duration ? ` · ${session.duration} min` : ''}
                      <span className={`badge ${session.completed ? 'badge-accent' : 'badge-warning'}`} style={{ marginLeft: '6px' }}>
                        {session.completed ? 'Completada' : 'En curso'}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(setsByExercise).map(([exerciseId, sets]) => (
                      <div key={exerciseId} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{exerciseName(exerciseId)}: </span>
                        {sets.map((s, i) => (
                          <span key={s.id}>
                            {i > 0 ? ', ' : ''}{s.weight ?? '-'}kg x {s.reps ?? '-'}{s.completed ? '' : ' (sin completar)'}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TrainerPage() {
  const { user } = useAuth()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'plan' | 'historial' | 'chat'>('plan')
  const [showAddClient, setShowAddClient] = useState(false)
  const [planName, setPlanName] = useState('')
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [clientFilter, setClientFilter] = useState('')

  const { data: clients = [], isLoading: loadingClients } = useClients()
  const removeClient = useRemoveClient()

  const { data: plans = [], isLoading: loadingPlans } = useClientPlans(selectedClientId ?? undefined)
  const createPlan = useCreatePlan()

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
  const tabs = isAdmin ? (['plan', 'historial'] as const) : (['plan', 'historial', 'chat'] as const)

  function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClientId) return
    createPlan.mutate({ name: planName, targetUserId: selectedClientId }, {
      onSuccess: () => {
        setPlanName('')
        setShowPlanForm(false)
      },
    })
  }

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

      <div className="split-layout">
        {/* CLIENTES */}
        <div className="card">
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
                    onClick={e => { e.stopPropagation(); removeClient.mutate(client.id); if (selectedClientId === client.id) setSelectedClientId(null) }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      role="tab"
                      aria-selected={activeTab === tab}
                      className={`tab${activeTab === tab ? ' active' : ''}`}
                    >
                      <i className={`ti ${tab === 'plan' ? 'ti-barbell' : tab === 'historial' ? 'ti-history' : 'ti-message-circle'}`} aria-hidden="true" />
                      {tab === 'plan' ? 'Plan de entrenamiento' : tab === 'historial' ? 'Historial y récords' : 'Chat'}
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
                    <form onSubmit={handleCreatePlan} className="card card-accent" style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <input
                        value={planName}
                        onChange={e => setPlanName(e.target.value)}
                        placeholder="Nombre del plan (ej. Fuerza 12 semanas)"
                        required
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button type="submit" style={primaryButtonStyle}>Crear</button>
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
                      {plans.map((plan: any) => (
                        <PlanCard key={plan.id} plan={plan} />
                      ))}
                    </div>
                  )}
                </>
              ) : activeTab === 'historial' ? (
                <ClientHistoryPanel clientId={selectedClientId} />
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
