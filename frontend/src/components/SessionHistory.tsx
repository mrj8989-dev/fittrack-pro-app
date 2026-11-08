import { useState } from 'react'
import { useExercises } from '../hooks/useExercises'
import { EmptyState } from './ui'

export interface HistorySet {
  id: string
  exerciseId: string
  setNumber: number
  reps: number | null
  weight: number | null
  completed: boolean
}

export interface HistorySession {
  id: string
  date: string
  duration: number | null
  completed: boolean
  notes: string | null
  /** Nombre guardado al entrenar: se conserva aunque luego se borre el día del plan. */
  workoutName: string | null
  workout: { name: string } | null
  sets: HistorySet[]
}

const PAGE = 8

/** Lista de sesiones entrenadas con sus series. La usan el cliente (Progreso) y su entrenador. */
export default function SessionHistory({ sessions, emptyText, onDelete }: {
  sessions: HistorySession[]
  emptyText: string
  /** Si se pasa, cada sesión tiene botón de borrar (solo el propio cliente). */
  onDelete?: (id: string) => void
}) {
  const { data: exercises = [] } = useExercises()
  const [shown, setShown] = useState(PAGE)
  const exerciseName = (id: string) => exercises.find(e => e.id === id)?.name ?? 'Ejercicio'

  if (sessions.length === 0) return <EmptyState icon="ti-history" title="Sin sesiones">{emptyText}</EmptyState>

  return (
    <div className="session-history">
      {sessions.slice(0, shown).map(session => {
        const byExercise = new Map<string, HistorySet[]>()
        for (const set of session.sets) byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set])
        const volume = Math.round(session.sets.reduce((v, s) => v + (s.completed ? (s.weight ?? 0) * (s.reps ?? 0) : 0), 0))

        return (
          <div key={session.id} className="inset session-card">
            <div className="session-card-head">
              <span className="session-card-title">{session.workout?.name ?? session.workoutName ?? 'Sesión'}</span>
              <span className={`badge ${session.completed ? 'badge-accent' : 'badge-warning'}`}>{session.completed ? 'Completada' : 'Sin terminar'}</span>
              <span className="session-card-meta">
                {new Date(session.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {session.duration ? ` · ${session.duration} min` : ''}
                {` · ${session.sets.length} series`}
                {volume ? ` · ${volume.toLocaleString('es-ES')} kg` : ''}
              </span>
              {onDelete && (
                <button
                  type="button"
                  className="btn-icon"
                  style={{ width: '28px', height: '28px' }}
                  title="Eliminar sesión"
                  aria-label="Eliminar sesión"
                  onClick={() => { if (confirm('¿Eliminar esta sesión y sus series? Tus récords se recalcularán.')) onDelete(session.id) }}
                >
                  <i className="ti ti-trash" style={{ fontSize: '14px' }} aria-hidden="true" />
                </button>
              )}
            </div>
            {byExercise.size > 0 && (
              <div className="session-card-sets">
                {[...byExercise].map(([exerciseId, sets]) => (
                  <div key={exerciseId}>
                    <span style={{ color: 'var(--text-primary)' }}>{exerciseName(exerciseId)}: </span>
                    {sets.map((s, i) => (
                      <span key={s.id} style={s.completed ? undefined : { opacity: 0.55 }}>
                        {i > 0 ? ', ' : ''}{s.weight ?? '-'} kg × {s.reps ?? '-'}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {session.notes && <div className="session-card-notes">“{session.notes}”</div>}
          </div>
        )
      })}
      {sessions.length > shown && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown(n => n + PAGE)} style={{ alignSelf: 'center' }}>
          Ver más ({sessions.length - shown})
        </button>
      )}
    </div>
  )
}
