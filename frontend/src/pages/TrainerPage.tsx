import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useClients, useAddClient, useRemoveClient } from '../hooks/useTrainerClients'
import {
  useClientPlans, useCreatePlan, useCreateWorkout,
  useAddExercise, useRemoveExercise, useReorderExercises,
} from '../hooks/useTrainerPlans'
import { useExercises } from '../hooks/useExercises'
import { useClientSessions, useClientRecords } from '../hooks/useTrainerSessions'
import ChatThread from '../components/ChatThread'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '0.5px solid var(--border)',
  borderRadius: '12px',
  padding: '1.25rem',
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  background: 'var(--bg-primary)',
  border: '0.5px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '9px 16px',
  background: 'var(--accent-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
}

function SortableExerciseRow({ exercise, onRemove }: { exercise: any; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 10px',
    background: 'var(--bg-primary)',
    border: '0.5px solid var(--border)',
    borderRadius: '8px',
    marginBottom: '6px',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-tertiary)', display: 'flex' }}>
        <i className="ti ti-grip-vertical" style={{ fontSize: '16px' }} aria-hidden="true" />
      </span>
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{exercise.exercise.name}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
        {exercise.sets}x{exercise.reps ?? '-'}{exercise.restTime ? ` · ${exercise.restTime}s desc.` : ''}
      </span>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}
      >
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
    <div style={{ ...cardStyle, background: 'var(--bg-primary)', marginTop: '10px' }}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px' }}>
        {workout.name}{workout.dayOfWeek ? ` · Día ${workout.dayOfWeek}` : ''}
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
            {exercises.map((ex: any) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
          <input type="number" min={1} value={sets} onChange={e => setSets(e.target.value)} placeholder="Sets" style={{ ...inputStyle, width: '70px' }} />
          <input type="number" min={1} value={reps} onChange={e => setReps(e.target.value)} placeholder="Reps" style={{ ...inputStyle, width: '70px' }} />
          <input type="number" min={1} value={restTime} onChange={e => setRestTime(e.target.value)} placeholder="Descanso (s)" style={{ ...inputStyle, width: '110px' }} />
          <button type="submit" style={primaryButtonStyle}>Añadir</button>
          <button type="button" onClick={() => setShowAddForm(false)} style={{ ...primaryButtonStyle, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>
            Cancelar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '12px', padding: 0 }}
        >
          + Añadir ejercicio
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

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{plan.name}</div>
      {plan.description && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{plan.description}</div>
      )}

      {plan.workouts.map((workout: any) => (
        <WorkoutDayCard key={workout.id} workout={workout} />
      ))}

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
          <button type="button" onClick={() => setShowDayForm(false)} style={{ ...primaryButtonStyle, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>
            Cancelar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowDayForm(true)}
          style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '12px', padding: 0 }}
        >
          + Nuevo día de entrenamiento
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
      <div style={cardStyle}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Récords personales
        </div>
        {loadingRecords ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cargando...</div>
        ) : records.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Sin récords todavía</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {records.map((r: any) => (
              <div key={r.exerciseId} style={{ background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>{exerciseName(r.exerciseId)}</div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--accent-primary)' }}>{r.maxWeight} kg x {r.reps}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Historial de sesiones
        </div>
        {loadingSessions ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cargando...</div>
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
                <div key={session.id} style={{ background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{session.workout?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {new Date(session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {session.duration ? ` · ${session.duration} min` : ''}
                      {' · '}
                      <span style={{ color: session.completed ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
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
  const [clientEmail, setClientEmail] = useState('')
  const [planName, setPlanName] = useState('')
  const [showPlanForm, setShowPlanForm] = useState(false)

  const { data: clients = [], isLoading: loadingClients } = useClients()
  const addClient = useAddClient()
  const removeClient = useRemoveClient()

  const { data: plans = [], isLoading: loadingPlans } = useClientPlans(selectedClientId ?? undefined)
  const createPlan = useCreatePlan()

  if (user?.role !== 'TRAINER') {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <i className="ti ti-lock" style={{ fontSize: '32px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Acceso restringido — esta sección es solo para entrenadores
        </div>
      </div>
    )
  }

  function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    addClient.mutate(clientEmail, { onSuccess: () => setClientEmail('') })
  }

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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Panel de entrenador
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Gestiona tus clientes y construye sus planes de entrenamiento
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* CLIENTES */}
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Mis clientes
          </div>

          <form onSubmit={handleAddClient} style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              placeholder="email@cliente.com"
              required
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="submit" style={{ ...primaryButtonStyle, padding: '9px 12px' }}>
              <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
            </button>
          </form>
          {addClient.isError && (
            <div style={{ fontSize: '11px', color: '#E24B4A', marginBottom: '10px', marginTop: '-8px' }}>
              No se ha podido añadir. Comprueba el email.
            </div>
          )}

          {loadingClients ? (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cargando...</div>
          ) : clients.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Aún no tienes clientes asignados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {clients.map((client: any) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedClientId === client.id ? 'var(--accent-primary)' : 'transparent',
                    color: selectedClientId === client.id ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeClient.mutate(client.id); if (selectedClientId === client.id) setSelectedClientId(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7, padding: '2px', flexShrink: 0 }}
                    title="Quitar cliente"
                  >
                    <i className="ti ti-x" style={{ fontSize: '13px' }} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PLANES DEL CLIENTE SELECCIONADO */}
        <div>
          {!selectedClientId ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: '24px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Selecciona un cliente para ver y editar sus planes
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {selectedClient?.name}
                </div>

                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '3px' }}>
                  {(['plan', 'historial', 'chat'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                        color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {tab === 'plan' ? 'Plan de entrenamiento' : tab === 'historial' ? 'Historial y récords' : 'Chat'}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'plan' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button onClick={() => setShowPlanForm(s => !s)} style={primaryButtonStyle}>
                      + Nuevo plan
                    </button>
                  </div>

                  {showPlanForm && (
                    <form onSubmit={handleCreatePlan} style={{ ...cardStyle, display: 'flex', gap: '8px', marginBottom: '1rem' }}>
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
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando planes...</div>
                  ) : plans.length === 0 ? (
                    <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      Este cliente todavía no tiene ningún plan
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
                <ChatThread otherUserId={selectedClientId} otherUserName={selectedClient?.name} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
