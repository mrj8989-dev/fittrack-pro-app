import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useExerciseProgress } from '../hooks/useWorkoutSessions'
import { usePersonalRecords } from '../hooks/useWorkoutSessions'
import api from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts'
import { EmptyState, Loader, PageHeader, StatCard } from '../components/ui'
import { chartTooltipStyle } from '../lib/chart'

export default function ProgressPage() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const { data: records = [], isLoading: loadingRecords } = usePersonalRecords()
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.get('/exercises').then(r => r.data),
  })
  const { data: progress = [], isLoading: loadingProgress } = useExerciseProgress(selectedExerciseId)

  const selectedExercise = exercises.find((e: any) => e.id === selectedExerciseId)

  // Calcular stats del ejercicio seleccionado
  const maxWeight = progress.length > 0 ? Math.max(...progress.map((p: any) => p.weight || 0)) : 0
  const firstWeight = progress.length > 0 ? progress[0].weight || 0 : 0
  const improvement = maxWeight > 0 && firstWeight > 0
    ? (((maxWeight - firstWeight) / firstWeight) * 100).toFixed(1)
    : null
  const totalSessions = progress.length > 0
    ? [...new Set(progress.map((p: any) => p.date.split('T')[0]))].length
    : 0

  const chartData = progress.map((p: any) => ({
    fecha: new Date(p.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    peso: p.weight,
    volumen: p.volume,
    reps: p.reps,
  }))

  // Agrupar récords por grupo muscular
  const recordsByMuscle: Record<string, any[]> = {}
  records.forEach((r: any) => {
    const exercise = exercises.find((e: any) => e.id === r.exerciseId)
    const group = exercise?.muscleGroup || 'Otros'
    if (!recordsByMuscle[group]) recordsByMuscle[group] = []
    recordsByMuscle[group].push({ ...r, exerciseName: exercise?.name })
  })

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>

      <PageHeader
        eyebrow={<><i className="ti ti-chart-line" aria-hidden="true" /> Progreso</>}
        title="Tu evolución"
        subtitle="Fuerza y volumen por ejercicio, y tus récords agrupados por grupo muscular"
        actions={
          <select
            value={selectedExerciseId}
            onChange={e => setSelectedExerciseId(e.target.value)}
            className="input"
            aria-label="Ejercicio"
            style={{ minWidth: '300px' }}
          >
            <option value="">— Elige un ejercicio —</option>
            {Object.entries(
              exercises.reduce((acc: any, ex: any) => {
                if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = []
                acc[ex.muscleGroup].push(ex)
                return acc
              }, {})
            ).map(([group, exs]: any) => (
              <optgroup key={group} label={group}>
                {exs.map((ex: any) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        }
      />

      {/* GRÁFICAS DEL EJERCICIO SELECCIONADO */}
      {selectedExerciseId && (
        <>
          {loadingProgress ? (
            <Loader inline label="Cargando progreso..." />
          ) : progress.length === 0 ? (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <EmptyState icon="ti-chart-line" title={`Aún no hay datos para ${selectedExercise?.name ?? 'este ejercicio'}`}>
                Registra sesiones con este ejercicio para ver tu progreso
              </EmptyState>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '1.5rem',
              }}>
                <StatCard icon="ti-trophy" label="Récord máximo" value={`${maxWeight} kg`} sub="peso levantado" />
                <StatCard icon="ti-trending-up" label="Mejora total" value={improvement ? `+${improvement}%` : '—'} sub="desde el inicio" />
                <StatCard icon="ti-calendar-check" label="Sesiones" value={String(totalSessions)} sub="con este ejercicio" />
                <StatCard
                  icon="ti-clock"
                  label="Último registro"
                  value={progress.length > 0 ? `${progress[progress.length - 1].weight} kg` : '—'}
                  sub={progress.length > 0 ? new Date(progress[progress.length - 1].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}
                />
              </div>

              <div className="grid-auto" style={{ '--min': '420px', marginBottom: '1.5rem' } as React.CSSProperties}>
              {/* Gráfica de peso */}
              <div className="card">
                <div className="section-title"><i className="ti ti-trending-up" aria-hidden="true" />
                  Evolución del peso — {selectedExercise?.name}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: any) => [`${v} kg`, 'Peso']}
                    />
                    <ReferenceLine y={maxWeight} stroke="var(--accent-primary)" strokeDasharray="4 4" label={{ value: 'Récord', fill: 'var(--accent-primary)', fontSize: 11 }} />
                    <Line type="monotone" dataKey="peso" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: 'var(--accent-primary)', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de volumen */}
              <div className="card">
                <div className="section-title"><i className="ti ti-chart-bar" aria-hidden="true" />
                  Volumen por sesión (kg × reps) — {selectedExercise?.name}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: any) => [`${v} kg`, 'Volumen']}
                    />
                    <Line type="monotone" dataKey="volumen" stroke="var(--info)" strokeWidth={2} dot={{ fill: 'var(--info)', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              </div>
            </>
          )}
        </>
      )}

      {/* RÉCORDS POR GRUPO MUSCULAR */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title"><i className="ti ti-trophy" aria-hidden="true" />
          Récords personales por grupo muscular
        </h2>

        {loadingRecords ? (
          <Loader inline label="Cargando récords..." />
        ) : records.length === 0 ? (
          <div className="card">
            <EmptyState icon="ti-trophy" title="Aún no tienes récords">¡Empieza a entrenar para conseguir los primeros!</EmptyState>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            {Object.entries(recordsByMuscle).map(([group, recs]) => (
              <div key={group} className="card">
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {group}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recs.map((rec: any) => {
                    const maxInGroup = Math.max(...recs.map((r: any) => r.maxWeight || 0))
                    const pct = maxInGroup > 0 ? ((rec.maxWeight || 0) / maxInGroup) * 100 : 0
                    return (
                      <div key={rec.exerciseId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                          <span
                            style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
                            onClick={() => setSelectedExerciseId(rec.exerciseId)}
                          >
                            {rec.exerciseName || rec.exerciseId}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {rec.maxWeight} kg
                          </span>
                        </div>
                        <div className="progress">
                          <div style={{
                            height: '4px',
                            width: `${pct}%`,
                            background: 'var(--accent-primary)',
                            borderRadius: '2px',
                            transition: 'width 0.5s',
                          }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                          {rec.reps} reps · {new Date(rec.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}