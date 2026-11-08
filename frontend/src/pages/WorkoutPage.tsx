import { useState, useEffect, useRef } from 'react'
import { useWorkoutPlans } from '../hooks/useWorkoutPlans'
import { useStartSession, useAddSet, useCompleteSession } from '../hooks/useWorkoutSession'
import { useNavigate } from 'react-router-dom'
import { EmptyState, Loader, PageHeader, ProgressBar } from '../components/ui'
import BodyMap from '../components/BodyMap'
import { MUSCLE_LABEL, musclesFor } from '../lib/muscles'

interface SetLog {
  exerciseId: string
  setNumber: number
  weight: number | ''
  reps: number | ''
  completed: boolean
}

const DAY_LABEL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const setInputStyle = (done: boolean): React.CSSProperties => ({
  height: '38px',
  padding: '0 12px',
  background: done ? 'transparent' : 'var(--bg-primary)',
  border: `1px solid ${done ? 'transparent' : 'var(--border-strong)'}`,
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '15px',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  width: '100%',
  minWidth: 0,
  opacity: done ? 0.6 : 1,
})

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const pct = (remaining / seconds) * 100
  const urgent = remaining <= 10
  const color = urgent ? 'var(--danger)' : 'var(--accent-primary)'
  const R = 34
  const C = 2 * Math.PI * R

  return (
    <div className="card" style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      zIndex: 100,
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '1rem 1.25rem',
      background: 'var(--glass)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: 'var(--shadow-lg)',
      animation: 'fade-up 0.3s var(--ease) both',
    }}>
      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
        <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={R} fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.2s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums',
        }}>
          {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
        </div>
      </div>
      <div>
        <div className="stat-label" style={{ marginBottom: '8px' }}>Descanso</div>
        <button onClick={onDone} className="btn btn-secondary btn-sm">
          <i className="ti ti-player-skip-forward" aria-hidden="true" /> Saltar
        </button>
      </div>
    </div>
  )
}

export default function WorkoutPage() {
  const navigate = useNavigate()
  const { data: plans = [], isLoading } = useWorkoutPlans()
  const startSession = useStartSession()
  const addSet = useAddSet()
  const completeSession = useCompleteSession()

  const [phase, setPhase] = useState<'select' | 'active' | 'done'>('select')
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sets, setSets] = useState<Record<string, SetLog[]>>({})
  const [restTimer, setRestTimer] = useState<{ seconds: number; active: boolean }>({ seconds: 0, active: false })
  const [notes, setNotes] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const timerRef = useRef<any>(null)

  // Cronómetro de sesión
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  const formatElapsed = () => {
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const initSets = (workout: any) => {
    const initial: Record<string, SetLog[]> = {}
    workout.exercises?.forEach((we: any) => {
      initial[we.exerciseId] = Array.from({ length: we.sets }, (_, i) => ({
        exerciseId: we.exerciseId,
        setNumber: i + 1,
        weight: '',
        reps: we.reps || '',
        completed: false,
      }))
    })
    return initial
  }

  const handleSelectWorkout = async (workout: any) => {
    const session = await startSession.mutateAsync({ workoutId: workout.id })
    setSessionId(session.id)
    setSelectedWorkout(workout)
    setSets(initSets(workout))
    setCurrentExIdx(0)
    setPhase('active')
  }

  const handleSetChange = (exerciseId: string, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIdx ? { ...s, [field]: value === '' ? '' : Number(value) } : s
      )
    }))
  }

  const handleCompleteSet = async (exerciseId: string, setIdx: number, restTime: number) => {
    if (!sessionId) return
    const set = sets[exerciseId][setIdx]
    await addSet.mutateAsync({
      sessionId,
      data: {
        exerciseId,
        setNumber: set.setNumber,
        reps: set.reps === '' ? undefined : Number(set.reps),
        weight: set.weight === '' ? undefined : Number(set.weight),
        completed: true,
      }
    })
    setSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIdx ? { ...s, completed: true } : s
      )
    }))
    // Al cerrar la última serie de un ejercicio, pasa al siguiente.
    const pending = sets[exerciseId].filter((s, i) => i !== setIdx && !s.completed).length
    if (pending === 0) {
      const total = selectedWorkout?.exercises?.length ?? 0
      setCurrentExIdx(i => Math.min(i + 1, total - 1))
    }
    if (restTime > 0) setRestTimer({ seconds: restTime, active: true })
  }

  const handleFinish = async () => {
    if (!sessionId) return
    await completeSession.mutateAsync(sessionId)
    setPhase('done')
    clearInterval(timerRef.current)
  }

  const completedSets = Object.values(sets).flat().filter(s => s.completed).length
  const totalSets = Object.values(sets).flat().length

  if (isLoading) return <Loader />

  // FASE: SELECCIONAR WORKOUT
  if (phase === 'select') return (
    <div className="page" style={{ maxWidth: '860px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-barbell" aria-hidden="true" /> Entrenar</>}
        title="¿Qué entrenamos hoy?"
        subtitle="Elige un entrenamiento de tu plan para empezar la sesión"
      />

      {plans.length === 0 ? (
        <div className="card">
          <EmptyState icon="ti-calendar-off" title="Sin planes de entrenamiento">
            Tu entrenador todavía no te ha asignado ningún plan.
          </EmptyState>
        </div>
      ) : (
        plans.map((plan: any) => (
          <section key={plan.id} style={{ marginBottom: '1.75rem' }}>
            <h2 className="section-title"><i className="ti ti-list-details" aria-hidden="true" /> {plan.name}</h2>
            <div className="grid-auto" style={{ '--min': '260px' } as React.CSSProperties}>
              {plan.workouts?.map((workout: any) => (
                <button
                  key={workout.id}
                  onClick={() => handleSelectWorkout(workout)}
                  disabled={startSession.isPending}
                  className="card card-interactive"
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', color: 'inherit' }}
                >
                  <span className="icon-tile lg"><i className="ti ti-barbell" aria-hidden="true" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{workout.name}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span className="badge">{workout.exercises?.length || 0} ejercicios</span>
                      {workout.dayOfWeek ? <span className="badge badge-accent">{DAY_LABEL[workout.dayOfWeek]}</span> : null}
                    </div>
                  </div>
                  <i className="ti ti-player-play-filled" style={{ fontSize: '18px', color: 'var(--accent-primary)' }} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )

  // FASE: SESIÓN ACTIVA
  if (phase === 'active') {
    const pct = Math.round((completedSets / Math.max(totalSets, 1)) * 100)
    return (
      <div className="page" style={{ maxWidth: '1120px' }}>

        {/* Header sesión */}
        <div className="card card-accent" style={{ marginBottom: '1.25rem', position: 'sticky', top: 'calc(var(--topbar-h, 0px) + 0.75rem)', zIndex: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ minWidth: 0 }}>
              <div className="page-eyebrow" style={{ marginBottom: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-soft)' }} />
                Sesión en curso
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedWorkout?.name}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-value" style={{ fontSize: '22px' }}>{formatElapsed()}</div>
                <div className="stat-sub">{completedSets}/{totalSets} series</div>
              </div>
              <button onClick={handleFinish} disabled={completeSession.isPending} className="btn btn-primary">
                <i className="ti ti-flag-check" aria-hidden="true" /> Finalizar
              </button>
            </div>
          </div>
          <ProgressBar value={pct} />
        </div>

        <div className="session-layout">
        {/* Navegador de ejercicios */}
        <aside className="card session-nav">
          <div className="stat-label" style={{ padding: '0 4px 8px' }}>Ejercicios</div>
          <div className="session-nav-list">
            {selectedWorkout?.exercises?.map((we: any, i: number) => {
              const exSets = sets[we.exerciseId] || []
              const done = exSets.filter(s => s.completed).length
              const complete = exSets.length > 0 && done === exSets.length
              return (
                <button
                  key={we.exerciseId}
                  className={`list-item${i === currentExIdx ? ' active' : ''}`}
                  onClick={() => setCurrentExIdx(i)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span className="session-nav-num" data-done={complete || undefined}>
                      {complete ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{we.exercise?.name}</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{done}/{exSets.length}</span>
                </button>
              )
            })}
          </div>
          <div className="session-notes">
            <label className="label" htmlFor="session-notes">Notas</label>
            <textarea
              id="session-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="¿Cómo te has sentido? (opcional)"
              rows={2}
              className="input"
            />
          </div>
        </aside>

        {/* Ejercicio actual */}
        <div>
          {selectedWorkout?.exercises?.map((we: any, exIdx: number) => {
            if (exIdx !== currentExIdx) return null
            const exerciseSets = sets[we.exerciseId] || []
            const allDone = exerciseSets.length > 0 && exerciseSets.every(s => s.completed)
            const total = selectedWorkout.exercises.length

            return (
              <div key={we.exerciseId} className="card" style={{
                borderColor: allDone ? 'color-mix(in srgb, var(--accent-primary) 45%, transparent)' : undefined,
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                  <span className="icon-tile" style={allDone ? { background: 'var(--accent-gradient)', color: '#fff' } : undefined}>
                    {allDone
                      ? <i className="ti ti-check" aria-hidden="true" />
                      : <span style={{ fontSize: '14px', fontWeight: 700 }}>{exIdx + 1}</span>}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{we.exercise?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {we.sets} series · {we.reps} reps · {we.restTime}s descanso
                    </div>
                  </div>
                  {we.exercise?.videoUrl && (
                    <a href={we.exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Ver técnica">
                      <i className="ti ti-brand-youtube" style={{ fontSize: '20px' }} aria-hidden="true" />
                    </a>
                  )}
                </div>

                {/* Cabecera tabla */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 1fr 88px',
                  gap: '8px', marginBottom: '6px', padding: '0 2px',
                  fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <span>Serie</span>
                  <span>Peso (kg)</span>
                  <span>Reps</span>
                  <span></span>
                </div>

                {/* Series */}
                {exerciseSets.map((set, idx) => (
                  <div key={idx} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 1fr 88px',
                    gap: '8px', marginBottom: '6px', alignItems: 'center',
                    padding: '4px 2px', borderRadius: '10px',
                    background: set.completed ? 'var(--accent-softer)' : 'transparent',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: set.completed ? 'var(--accent-primary)' : 'var(--bg-hover)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 600,
                      color: set.completed ? '#fff' : 'var(--text-secondary)',
                    }}>
                      {set.completed ? <i className="ti ti-check" style={{ fontSize: '13px' }} aria-hidden="true" /> : idx + 1}
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={set.weight}
                      onChange={e => handleSetChange(we.exerciseId, idx, 'weight', e.target.value)}
                      disabled={set.completed}
                      // Al tocar el campo se selecciona el valor propuesto: escribir lo sustituye en vez de añadirse detrás.
                      onFocus={e => e.target.select()}
                      placeholder="0"
                      style={setInputStyle(set.completed)}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps}
                      onChange={e => handleSetChange(we.exerciseId, idx, 'reps', e.target.value)}
                      disabled={set.completed}
                      // Al tocar el campo se selecciona el valor propuesto: escribir lo sustituye en vez de añadirse detrás.
                      onFocus={e => e.target.select()}
                      placeholder="0"
                      style={setInputStyle(set.completed)}
                    />
                    <button
                      onClick={() => handleCompleteSet(we.exerciseId, idx, we.restTime || 90)}
                      disabled={set.completed || addSet.isPending}
                      className={`btn btn-sm ${set.completed ? 'btn-ghost' : 'btn-secondary'}`}
                      style={set.completed ? { opacity: 1, color: 'var(--accent-primary)' } : undefined}
                    >
                      {set.completed ? <><i className="ti ti-circle-check-filled" aria-hidden="true" /> Hecho</> : 'Hecho'}
                    </button>
                  </div>
                ))}

                {we.exercise && (() => {
                  const m = musclesFor(we.exercise)
                  return (
                    <div className="session-muscles">
                      <div style={{ width: '170px', flexShrink: 0 }}>
                        <BodyMap primary={m.primary} secondary={m.secondary} height={170} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="stat-label" style={{ marginBottom: '6px' }}>Músculos</div>
                        <div className="chips" style={{ marginBottom: '10px' }}>
                          {m.primary.map(id => <span key={id} className="badge badge-accent">{MUSCLE_LABEL[id]}</span>)}
                          {m.secondary.filter(id => !m.primary.includes(id)).map(id => <span key={id} className="badge">{MUSCLE_LABEL[id]}</span>)}
                        </div>
                        {we.exercise.description && (
                          <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary)' }}>{we.exercise.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary btn-sm" disabled={exIdx === 0} onClick={() => setCurrentExIdx(exIdx - 1)}>
                    <i className="ti ti-chevron-left" aria-hidden="true" /> Anterior
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', alignSelf: 'center' }}>{exIdx + 1} de {total}</span>
                  {exIdx < total - 1 ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => setCurrentExIdx(exIdx + 1)}>
                      Siguiente <i className="ti ti-chevron-right" aria-hidden="true" />
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={handleFinish} disabled={completeSession.isPending}>
                      <i className="ti ti-flag-check" aria-hidden="true" /> Finalizar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>


        {/* Cronómetro de descanso */}
        {restTimer.active && (
          <RestTimer
            seconds={restTimer.seconds}
            onDone={() => setRestTimer({ seconds: 0, active: false })}
          />
        )}
      </div>
    )
  }

  // FASE: SESIÓN COMPLETADA
  return (
    <div className="page" style={{
      maxWidth: '520px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '65vh', textAlign: 'center',
    }}>
      <div style={{
        width: '96px', height: '96px', borderRadius: '28px',
        background: 'var(--accent-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem',
        boxShadow: '0 20px 50px -15px var(--accent-primary)',
      }}>
        <i className="ti ti-trophy" style={{ fontSize: '44px', color: '#fff' }} aria-hidden="true" />
      </div>
      <h1 className="page-title" style={{ fontSize: '30px' }}>¡Sesión completada!</h1>
      <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>{selectedWorkout?.name}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginBottom: '2rem' }}>
        <div className="card stat">
          <span className="stat-label">Duración</span>
          <span className="stat-value">{formatElapsed()}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Series</span>
          <span className="stat-value">{completedSets}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => { setPhase('select'); setElapsed(0); setNotes('') }} className="btn btn-primary btn-lg">
          <i className="ti ti-refresh" aria-hidden="true" /> Otro entrenamiento
        </button>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-lg">
          Ir al dashboard
        </button>
      </div>
    </div>
  )
}
