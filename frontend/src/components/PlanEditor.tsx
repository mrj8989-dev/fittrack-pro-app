import { useEffect, useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useExercises } from '../hooks/useExercises'
import type { Exercise } from '../hooks/useExercises'
import {
  useAddExercise, useCopyPlan, useCreateWorkout, useDeletePlan, useDeleteWorkout,
  useRemoveExercise, useReorderExercises, useUpdateExercise, useUpdatePlan, useUpdateWorkout,
} from '../hooks/useTrainerPlans'
import type { PlanExercise, PlanWorkout, WorkoutPlan } from '../hooks/useTrainerPlans'
import { apiErrorMessage } from '../lib/apiError'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Cliente al que se puede copiar o asignar un plan. */
export interface ClientOption { id: string; name: string }

function groupByMuscle(items: Exercise[]): Record<string, Exercise[]> {
  const groups: Record<string, Exercise[]> = {}
  for (const item of items) (groups[item.muscleGroup] ??= []).push(item)
  return groups
}

const numOrUndef = (v: string) => (v.trim() ? Number(v) : undefined)

function DaySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="input" value={value} onChange={e => onChange(e.target.value)} aria-label="Día de la semana" style={{ width: '150px' }}>
      <option value="">Sin día fijo</option>
      {DAY_NAMES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
    </select>
  )
}

// ── Menú de acciones ⋯ ─────────────────────────────────────

interface MenuAction { icon: string; label: string; onClick: () => void; danger?: boolean }

function ActionsMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  if (actions.length === 0) return null
  return (
    <div className="actions-menu" ref={ref}>
      <button type="button" className="btn-icon" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} title="Acciones" aria-label="Acciones del plan">
        <i className="ti ti-dots" aria-hidden="true" />
      </button>
      {open && (
        <div className="actions-menu-list" role="menu">
          {actions.map(a => (
            <button key={a.label} type="button" role="menuitem" className={a.danger ? 'danger' : undefined} onClick={() => { setOpen(false); a.onClick() }}>
              <i className={`ti ${a.icon}`} aria-hidden="true" /> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ejercicio dentro de un día ─────────────────────────────

function ExerciseRow({ item, index, workoutId, editable }: { item: PlanExercise; index: number; workoutId: string; editable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !editable })
  const [editing, setEditing] = useState(false)
  const [sets, setSets] = useState(String(item.sets))
  const [reps, setReps] = useState(item.reps ? String(item.reps) : '')
  const [rest, setRest] = useState(item.restTime ? String(item.restTime) : '')
  const update = useUpdateExercise()
  const remove = useRemoveExercise()

  function startEditing() {
    setSets(String(item.sets)); setReps(item.reps ? String(item.reps) : ''); setRest(item.restTime ? String(item.restTime) : '')
    setEditing(true)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    update.mutate(
      { workoutId, exerciseId: item.id, sets: Number(sets), reps: numOrUndef(reps), restTime: numOrUndef(rest) },
      { onSuccess: () => setEditing(false) },
    )
  }

  const summary = `${item.sets} × ${item.reps ?? '—'}${item.restTime ? ` · ${item.restTime}s` : ''}`

  return (
    <div
      ref={setNodeRef}
      className={`plan-ex-row${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {editable && (
        <span {...attributes} {...listeners} className="plan-ex-grip" title="Arrastra para reordenar">
          <i className="ti ti-grip-vertical" aria-hidden="true" />
        </span>
      )}
      <span className="plan-ex-index">{index + 1}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="plan-ex-name">{item.exercise.name}</div>
        <div className="plan-ex-muscle">{item.exercise.muscleGroup}</div>
      </div>

      {editing ? (
        <form onSubmit={save} className="plan-ex-edit">
          <label>Series<input className="input" type="number" min={1} required value={sets} onChange={e => setSets(e.target.value)} /></label>
          <label>Reps<input className="input" type="number" min={1} value={reps} onChange={e => setReps(e.target.value)} /></label>
          <label>Desc. (s)<input className="input" type="number" min={1} value={rest} onChange={e => setRest(e.target.value)} /></label>
          <button type="submit" className="btn-icon" title="Guardar" aria-label="Guardar" disabled={update.isPending} style={{ color: 'var(--accent-primary)' }}>
            <i className="ti ti-check" aria-hidden="true" />
          </button>
          <button type="button" className="btn-icon" title="Cancelar" aria-label="Cancelar" onClick={() => setEditing(false)}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </form>
      ) : editable ? (
        <button type="button" className="badge plan-ex-summary" onClick={startEditing} title="Cambiar series, repeticiones y descanso">
          {summary} <i className="ti ti-pencil" aria-hidden="true" />
        </button>
      ) : (
        <span className="badge">{summary}</span>
      )}

      {editable && !editing && (
        <button
          type="button"
          onClick={() => remove.mutate({ workoutId, exerciseId: item.id })}
          className="btn-icon"
          style={{ width: '28px', height: '28px' }}
          title="Quitar ejercicio"
          aria-label={`Quitar ${item.exercise.name}`}
        >
          <i className="ti ti-trash" style={{ fontSize: '14px' }} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// ── Un día del plan ────────────────────────────────────────

function WorkoutDay({ workout, editable }: { workout: PlanWorkout; editable: boolean }) {
  // Orden local mientras se guarda un arrastre; al refrescar el plan manda el servidor.
  const [order, setOrder] = useState<string[] | null>(null)
  const items = order
    ? order.map(id => workout.exercises.find(e => e.id === id)).filter((e): e is PlanExercise => !!e)
    : workout.exercises

  const [editingDay, setEditingDay] = useState(false)
  const [dayName, setDayName] = useState(workout.name)
  const [dayOfWeek, setDayOfWeek] = useState(workout.dayOfWeek ? String(workout.dayOfWeek) : '')
  const [adding, setAdding] = useState(false)
  const [exerciseId, setExerciseId] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [rest, setRest] = useState('90')

  const { data: exercises = [] } = useExercises()
  const reorder = useReorderExercises()
  const addExercise = useAddExercise()
  const updateWorkout = useUpdateWorkout()
  const deleteWorkout = useDeleteWorkout()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = items.map(i => i.id)
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setOrder(next)
    reorder.mutate({ workoutId: workout.id, orderedIds: next }, { onSettled: () => setOrder(null) })
  }

  function saveDay(e: React.FormEvent) {
    e.preventDefault()
    updateWorkout.mutate(
      { id: workout.id, name: dayName, dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined },
      { onSuccess: () => setEditingDay(false) },
    )
  }

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!exerciseId) return
    addExercise.mutate(
      { workoutId: workout.id, exerciseId, sets: Number(sets), reps: numOrUndef(reps), restTime: numOrUndef(rest) },
      { onSuccess: () => { setExerciseId(''); setAdding(false) } },
    )
  }

  return (
    <div className="inset" style={{ padding: '14px', marginTop: '12px' }}>
      {editingDay ? (
        <form onSubmit={saveDay} className="plan-inline-form" style={{ marginBottom: '10px' }}>
          <input className="input" value={dayName} onChange={e => setDayName(e.target.value)} required placeholder="Nombre del día" style={{ flex: '1 1 180px' }} />
          <DaySelect value={dayOfWeek} onChange={setDayOfWeek} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={updateWorkout.isPending}>Guardar</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingDay(false)}>Cancelar</button>
        </form>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          {workout.dayOfWeek ? <span className="badge badge-accent">{DAY_NAMES[workout.dayOfWeek - 1]}</span> : <span className="badge">Sin día fijo</span>}
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>{workout.name}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{items.length} {items.length === 1 ? 'ejercicio' : 'ejercicios'}</span>
          {editable && (
            <>
              <button type="button" className="btn-icon" style={{ width: '30px', height: '30px' }} title="Editar día" aria-label="Editar día"
                onClick={() => { setDayName(workout.name); setDayOfWeek(workout.dayOfWeek ? String(workout.dayOfWeek) : ''); setEditingDay(true) }}>
                <i className="ti ti-pencil" aria-hidden="true" />
              </button>
              <button type="button" className="btn-icon" style={{ width: '30px', height: '30px' }} title="Eliminar día" aria-label="Eliminar día"
                onClick={() => {
                  if (confirm(`¿Eliminar el día "${workout.name}" y sus ${items.length} ejercicios? Las sesiones ya entrenadas se conservan en el historial.`))
                    deleteWorkout.mutate(workout.id)
                }}>
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="plan-ex-list">
              {items.map((ex, i) => <ExerciseRow key={ex.id} item={ex} index={i} workoutId={workout.id} editable={editable} />)}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Sin ejercicios todavía</div>
      )}

      {editable && (adding ? (
        <form onSubmit={add} className="plan-inline-form" style={{ marginTop: '10px' }}>
          <select className="input" value={exerciseId} onChange={e => setExerciseId(e.target.value)} required style={{ flex: '1 1 200px' }} aria-label="Ejercicio">
            <option value="">Selecciona ejercicio...</option>
            {Object.entries(groupByMuscle(exercises)).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </optgroup>
            ))}
          </select>
          <input className="input" type="number" min={1} value={sets} onChange={e => setSets(e.target.value)} placeholder="Series" aria-label="Series" style={{ width: '76px' }} />
          <input className="input" type="number" min={1} value={reps} onChange={e => setReps(e.target.value)} placeholder="Reps" aria-label="Repeticiones" style={{ width: '76px' }} />
          <input className="input" type="number" min={1} value={rest} onChange={e => setRest(e.target.value)} placeholder="Desc. (s)" aria-label="Descanso en segundos" style={{ width: '96px' }} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={addExercise.isPending}>Añadir</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancelar</button>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn btn-ghost btn-sm" style={{ marginTop: '6px', color: 'var(--accent-primary)' }}>
          <i className="ti ti-plus" aria-hidden="true" /> Añadir ejercicio
        </button>
      ))}
    </div>
  )
}

// ── El plan completo ───────────────────────────────────────

type Panel = 'rename' | 'copy' | 'new-day' | null

/**
 * Plan o plantilla de entrenamiento con todo su editor.
 * `clients`: a quién se puede copiar/asignar (sin el dueño actual, `currentClientId`).
 */
export function PlanCard({ plan, clients = [], currentClientId, onDeleted, onCopied }: {
  plan: WorkoutPlan
  clients?: ClientOption[]
  currentClientId?: string
  onDeleted?: () => void
  onCopied?: (copy: WorkoutPlan) => void
}) {
  // Se recuerda el día por id: al cambiarle el día de la semana se reordenan las pestañas y no debe saltar a otro.
  const [selectedDayId, setSelectedDayId] = useState<string | null>(plan.workouts[0]?.id ?? null)
  const activeDay = plan.workouts.find(w => w.id === selectedDayId) ?? plan.workouts[0]
  const [panel, setPanel] = useState<Panel>(null)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)

  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [target, setTarget] = useState('')
  const [dayName, setDayName] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')

  const updatePlan = useUpdatePlan()
  const deletePlan = useDeletePlan()
  const copyPlan = useCopyPlan()
  const createWorkout = useCreateWorkout()

  const targets = clients.filter(c => c.id !== currentClientId)
  const ok = (text: string) => setNotice({ text })
  const fail = (e: unknown) => setNotice({ text: apiErrorMessage(e, 'No se ha podido completar la acción'), error: true })

  function copy(vars: { targetUserId?: string; asTemplate?: boolean; name?: string }, done: string) {
    copyPlan.mutate({ id: plan.id, ...vars }, {
      onSuccess: copyResult => { ok(done); setPanel(null); onCopied?.(copyResult) },
      onError: fail,
    })
  }

  const actions: MenuAction[] = []
  if (plan.editable) actions.push({ icon: 'ti-pencil', label: 'Renombrar', onClick: () => { setName(plan.name); setDescription(plan.description ?? ''); setPanel('rename') } })
  if (plan.editable) actions.push({ icon: 'ti-calendar-plus', label: 'Añadir día', onClick: () => setPanel('new-day') })
  if (plan.isTemplate) {
    actions.push({ icon: 'ti-copy', label: plan.editable ? 'Duplicar plantilla' : 'Copiar a mis plantillas', onClick: () => copy({ asTemplate: true, name: plan.editable ? `${plan.name} (copia)` : plan.name }, 'Copiada en tus plantillas') })
  } else {
    actions.push({ icon: 'ti-copy', label: 'Duplicar', onClick: () => copy({}, 'Plan duplicado') })
    actions.push({ icon: 'ti-template', label: 'Guardar como plantilla', onClick: () => copy({ asTemplate: true }, 'Guardado en tus plantillas (menú Rutinas)') })
  }
  if (targets.length > 0) actions.push({ icon: 'ti-user-share', label: plan.isTemplate ? 'Asignar a un cliente' : 'Copiar a otro cliente', onClick: () => { setTarget(''); setPanel('copy') } })
  if (plan.editable) actions.push({
    icon: 'ti-trash', label: plan.isTemplate ? 'Eliminar plantilla' : 'Eliminar plan', danger: true,
    onClick: () => {
      const q = plan.isTemplate
        ? `¿Eliminar la plantilla "${plan.name}"? Los planes ya asignados a clientes no se tocan.`
        : `¿Eliminar el plan "${plan.name}"? Las sesiones ya entrenadas se conservan en el historial.`
      if (confirm(q)) deletePlan.mutate(plan.id, { onSuccess: onDeleted, onError: fail })
    },
  })

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span className="icon-tile"><i className={`ti ${plan.isTemplate ? 'ti-template' : 'ti-list-details'}`} aria-hidden="true" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{plan.name}</div>
          {plan.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{plan.description}</div>}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span className="badge">{plan.workouts.length} {plan.workouts.length === 1 ? 'día' : 'días'}</span>
            {plan.isGlobal && <span className="badge badge-info"><i className="ti ti-world" aria-hidden="true" /> Plantilla del centro</span>}
            {plan.isTemplate && !plan.isGlobal && <span className="badge badge-accent"><i className="ti ti-template" aria-hidden="true" /> Plantilla</span>}
            {!plan.editable && <span className="badge"><i className="ti ti-lock" aria-hidden="true" /> Solo lectura: cópiala para modificarla</span>}
          </div>
        </div>
        <ActionsMenu actions={actions} />
      </div>

      {notice && (
        <div className={`alert ${notice.error ? 'alert-danger' : 'alert-success'}`} style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }} role="status">
          <i className={`ti ${notice.error ? 'ti-alert-circle' : 'ti-circle-check'}`} aria-hidden="true" />
          <span style={{ flex: 1 }}>{notice.text}</span>
          <button type="button" className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={() => setNotice(null)} aria-label="Cerrar aviso"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      )}

      {panel === 'rename' && (
        <form className="plan-inline-form" style={{ marginTop: '12px' }}
          onSubmit={e => { e.preventDefault(); updatePlan.mutate({ id: plan.id, name, description }, { onSuccess: () => setPanel(null), onError: fail }) }}>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required minLength={2} placeholder="Nombre" style={{ flex: '1 1 180px' }} />
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" style={{ flex: '2 1 220px' }} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={updatePlan.isPending}>Guardar</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel(null)}>Cancelar</button>
        </form>
      )}

      {panel === 'copy' && (
        <form className="plan-inline-form" style={{ marginTop: '12px' }}
          onSubmit={e => {
            e.preventDefault()
            const who = targets.find(c => c.id === target)?.name ?? 'el cliente'
            copy({ targetUserId: target }, plan.isTemplate ? `Asignada a ${who}` : `Copiado a ${who}`)
          }}>
          <select className="input" value={target} onChange={e => setTarget(e.target.value)} required style={{ flex: '1 1 220px' }} aria-label="Cliente">
            <option value="">{plan.isTemplate ? 'Asignar a…' : 'Copiar a…'}</option>
            {targets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={copyPlan.isPending}>{plan.isTemplate ? 'Asignar' : 'Copiar'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel(null)}>Cancelar</button>
        </form>
      )}

      {plan.workouts.length > 0 && (
        <div className="tabs" role="tablist" style={{ marginTop: '14px', display: 'flex', width: '100%', overflowX: 'auto' }}>
          {plan.workouts.map(w => (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={activeDay?.id === w.id}
              className={`tab${activeDay?.id === w.id ? ' active' : ''}`}
              onClick={() => setSelectedDayId(w.id)}
              title={w.dayOfWeek ? `${DAY_NAMES[w.dayOfWeek - 1]} · ${w.name}` : w.name}
            >
              {w.dayOfWeek ? <strong>{DAY_SHORT[w.dayOfWeek - 1]}</strong> : null} {w.name}
              <span style={{ fontSize: '11px', opacity: 0.7 }}>{w.exercises.length}</span>
            </button>
          ))}
          {plan.editable && (
            <button type="button" className="tab" onClick={() => setPanel('new-day')} title="Nuevo día" aria-label="Nuevo día de entrenamiento">
              <i className="ti ti-plus" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {panel === 'new-day' && (
        <form className="plan-inline-form" style={{ marginTop: '12px' }}
          onSubmit={e => {
            e.preventDefault()
            createWorkout.mutate(
              { name: dayName, dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined, workoutPlanId: plan.id },
              { onSuccess: (w) => { setDayName(''); setDayOfWeek(''); setPanel(null); setSelectedDayId((w as PlanWorkout).id) }, onError: fail },
            )
          }}>
          <input className="input" value={dayName} onChange={e => setDayName(e.target.value)} placeholder="Nombre del día (ej. Pecho y tríceps)" required style={{ flex: '1 1 200px' }} autoFocus />
          <DaySelect value={dayOfWeek} onChange={setDayOfWeek} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={createWorkout.isPending}>Crear día</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel(null)}>Cancelar</button>
        </form>
      )}

      {activeDay && <WorkoutDay key={activeDay.id} workout={activeDay} editable={plan.editable} />}

      {plan.workouts.length === 0 && plan.editable && panel !== 'new-day' && (
        <button type="button" onClick={() => setPanel('new-day')} className="btn btn-ghost btn-sm" style={{ marginTop: '10px', color: 'var(--accent-primary)' }}>
          <i className="ti ti-calendar-plus" aria-hidden="true" /> Nuevo día de entrenamiento
        </button>
      )}
    </div>
  )
}
