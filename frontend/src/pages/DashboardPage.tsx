import { useAuth } from '../context/AuthContext'
import { useWorkoutSessions, usePersonalRecords } from '../hooks/useWorkoutSessions'
import { useWorkoutPlans } from '../hooks/useWorkoutPlans'
import { useNextRevision, useWeightProgress } from '../hooks/useBodyRevisions'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Link } from 'react-router-dom'
import { EmptyState, Loader, ProgressBar, StatCard } from '../components/ui'
import { chartTooltipStyle } from '../lib/chart'

const DAY_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: sessions = [], isLoading: loadingSessions } = useWorkoutSessions()
  const { data: records = [], isLoading: loadingRecords } = usePersonalRecords()
  const { data: plans = [], isLoading: loadingPlans } = useWorkoutPlans()
  const { data: nextRevision } = useNextRevision()
  const { data: weightProgress = [] } = useWeightProgress()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
  }

  // Calcular volumen semanal de las últimas 8 semanas
  const weeklyVolume = () => {
    // Clave = lunes de la semana (timestamp), para poder ordenar: las sesiones llegan de la más reciente a la más antigua.
    const weeks = new Map<number, number>()
    sessions.forEach((session: any) => {
      const weekStart = new Date(session.date)
      weekStart.setHours(0, 0, 0, 0)
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
      const volume = session.sets?.reduce((acc: number, set: any) =>
        acc + (set.weight || 0) * (set.reps || 0), 0) || 0
      weeks.set(weekStart.getTime(), (weeks.get(weekStart.getTime()) || 0) + volume)
    })
    return [...weeks.entries()]
      .sort(([a], [b]) => a - b)
      .slice(-8)
      .map(([start, volume]) => ({
        week: new Date(start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        volume: Math.round(volume),
      }))
  }

  // Sesiones este mes
  const sessionsThisMonth = sessions.filter((s: any) => {
    const d = new Date(s.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  // Volumen total este mes
  const volumeThisMonth = sessions
    .filter((s: any) => {
      const d = new Date(s.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((acc: number, session: any) =>
      acc + (session.sets?.reduce((a: number, set: any) =>
        a + (set.weight || 0) * (set.reps || 0), 0) || 0), 0)

  const lastWeight = weightProgress.length > 0
    ? weightProgress[weightProgress.length - 1].weight
    : null

  const isLoading = loadingSessions || loadingRecords || loadingPlans

  if (isLoading) return <Loader label="Cargando dashboard..." />

  const volumeData = weeklyVolume()

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <section className="hero" style={{ '--hero-img': 'url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80)' } as React.CSSProperties}>
        <div className="hero-content">
          <div className="page-eyebrow" style={{ color: 'var(--accent-light)' }}>
            <i className="ti ti-sparkles" aria-hidden="true" /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="hero-title">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="hero-subtitle">
            {plans.length > 0 ? <>Plan activo: <strong style={{ color: '#fff' }}>{plans[0].name}</strong></> : 'Sin plan activo todavía'}
          </p>
          <div className="hero-actions">
            <Link to="/workout" className="btn btn-primary"><i className="ti ti-player-play-filled" aria-hidden="true" /> Empezar a entrenar</Link>
            {sessions.length > 0 && (
              <span className="badge" style={{ height: '38px', padding: '0 14px', fontSize: '12px' }}>
                <i className="ti ti-flame" aria-hidden="true" /> {sessionsThisMonth} sesiones este mes
              </span>
            )}
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <div className="grid-auto stats-grid" style={{ '--min': '190px', marginBottom: '14px' } as React.CSSProperties}>
        <StatCard
          icon="ti-scale"
          label="Peso actual"
          value={lastWeight ? `${lastWeight} kg` : '—'}
          sub={lastWeight ? 'última revisión' : 'Sin revisiones'}
        />
        <StatCard icon="ti-calendar-check" label="Sesiones" value={sessionsThisMonth} sub="este mes" />
        <StatCard
          icon="ti-barbell"
          label="Volumen total"
          value={volumeThisMonth > 0 ? `${(volumeThisMonth / 1000).toFixed(1)} t` : '0 kg'}
          sub="este mes"
        />
        <StatCard
          icon="ti-camera"
          label="Próx. revisión"
          value={!nextRevision ? '—' : nextRevision.daysUntilRevision <= 0 ? 'Hoy' : `${nextRevision.daysUntilRevision} días`}
          sub={nextRevision ? new Date(nextRevision.nextRevisionDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : ''}
          tone={nextRevision && nextRevision.daysUntilRevision <= 0 ? 'negative' : undefined}
        />
      </div>

      {/* GRÁFICAS */}
      <div className="grid-auto" style={{ '--min': '270px' } as React.CSSProperties}>
        <div className="card">
          <h2 className="section-title"><i className="ti ti-chart-bar" aria-hidden="true" /> Volumen semanal</h2>
          {volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={volumeData} barSize={22}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-light)" />
                    <stop offset="100%" stopColor="var(--accent-primary)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={chartTooltipStyle} formatter={(v: any) => [`${v} kg`, 'Volumen']} />
                <Bar dataKey="volume" fill="url(#volGrad)" radius={[6, 6, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="ti-chart-bar" title="Sin datos todavía">Registra sesiones para ver tu volumen semanal</EmptyState>
          )}
        </div>

        <div className="card">
          <h2 className="section-title"><i className="ti ti-trending-down" aria-hidden="true" /> Evolución del peso</h2>
          {weightProgress.length > 1 ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={weightProgress.map((r: any) => ({
                fecha: new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                peso: r.weight,
              }))}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [`${v} kg`, 'Peso']} />
                <Area type="monotone" dataKey="peso" stroke="var(--accent-primary)" strokeWidth={2.5} fill="url(#weightGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="ti-scale" title="Sin evolución todavía">Añade revisiones para ver tu progreso de peso</EmptyState>
          )}
        </div>

        <div className="card">
          <h2 className="section-title"><i className="ti ti-trophy" aria-hidden="true" /> Récords personales</h2>
          {records.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {records.slice(0, 5).map((record: any) => {
                const maxWeight = Math.max(...records.map((r: any) => r.maxWeight || 0))
                const pct = maxWeight > 0 ? ((record.maxWeight || 0) / maxWeight) * 100 : 0
                return (
                  <div key={record.exerciseId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{record.exerciseName || 'Ejercicio'}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {record.maxWeight} kg × {record.reps}
                      </span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="ti-trophy" title="Aún no hay récords">Registra sesiones para ver tus récords</EmptyState>
          )}
        </div>

        <div className="card">
          <h2 className="section-title"><i className="ti ti-calendar-week" aria-hidden="true" /> Plan activo</h2>
          {plans.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {plans[0].name}
              </div>
              {plans[0].workouts?.map((workout: any) => (
                <div key={workout.id} className="inset" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px' }}>
                  <span className="badge badge-accent" style={{ minWidth: '44px', justifyContent: 'center' }}>
                    {DAY_SHORT[workout.dayOfWeek || 0] || '—'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                    {workout.name}
                  </span>
                  <i className="ti ti-chevron-right" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="ti-calendar-off" title="Sin plan activo">Tu entrenador te asignará uno pronto</EmptyState>
          )}
        </div>
      </div>
    </div>
  )
}
