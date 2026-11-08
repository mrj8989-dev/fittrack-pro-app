import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTrainerDashboard } from '../hooks/useTrainerDashboard'
import type { ClientAlert, DashboardClient } from '../hooks/useTrainerDashboard'
import Avatar from '../components/Avatar'
import { EmptyState, Loader, StatCard } from '../components/ui'

const ALERT_INFO: Record<ClientAlert, { label: string; icon: string; tone: string; tab: string }> = {
  messages: { label: 'Mensajes sin leer', icon: 'ti-message-circle', tone: 'badge-info', tab: 'chat' },
  revision: { label: 'Revisión pendiente', icon: 'ti-camera', tone: 'badge-warning', tab: 'revisiones' },
  inactive: { label: 'Sin entrenar', icon: 'ti-zzz', tone: 'badge-danger', tab: 'historial' },
  'no-plan': { label: 'Sin plan', icon: 'ti-barbell-off', tone: 'badge-danger', tab: 'plan' },
  'no-menu': { label: 'Sin menú', icon: 'ti-salad', tone: 'badge-warning', tab: 'plan' },
}
// Orden en que se ordenan y muestran los avisos (lo más urgente primero).
const ALERT_ORDER: ClientAlert[] = ['messages', 'revision', 'inactive', 'no-plan', 'no-menu']

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function relativeDays(iso: string | null, days: number | null) {
  if (!iso || days === null) return 'Nunca'
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function alertText(c: DashboardClient, a: ClientAlert) {
  switch (a) {
    case 'messages': return `${c.unreadMessages} ${c.unreadMessages === 1 ? 'mensaje' : 'mensajes'} sin leer`
    case 'revision': {
      const late = Math.floor((Date.now() - new Date(c.nextRevisionAt).getTime()) / 86_400_000)
      return c.lastRevisionAt ? (late > 0 ? `Revisión atrasada ${late} días` : 'Le toca revisión hoy') : 'Aún no ha hecho ninguna revisión'
    }
    case 'inactive': return c.daysSinceSession === null ? 'Todavía no ha entrenado' : `${c.daysSinceSession} días sin entrenar`
    case 'no-plan': return 'No tiene plan de entrenamiento'
    case 'no-menu': return 'Tiene nutrición pero no tiene menú'
  }
}

const clientLink = (id: string, tab?: string) => `/entrenador?cliente=${id}${tab ? `&tab=${tab}` : ''}`

export default function TrainerHomePage() {
  const { user } = useAuth()
  const { data, isLoading } = useTrainerDashboard()

  if (isLoading || !data) return <Loader label="Cargando tu cartera..." />

  const { totals, clients, recentSessions } = data
  const attention = clients
    .filter(c => c.alerts.length > 0)
    .sort((a, b) => ALERT_ORDER.indexOf(a.alerts[0]) - ALERT_ORDER.indexOf(b.alerts[0]) || b.alerts.length - a.alerts.length)

  return (
    <div className="page" style={{ maxWidth: '1280px' }}>
      <section className="hero">
        <div className="hero-content">
          <div className="page-eyebrow" style={{ color: 'var(--accent-light)' }}>
            <i className="ti ti-user-star" aria-hidden="true" /> Entrenador
          </div>
          <h1 className="hero-title">{greeting()}, {user?.name?.split(' ')[0]}</h1>
          <p className="hero-subtitle">
            {totals.clients === 0
              ? 'Aún no tienes clientes en tu cartera.'
              : totals.needAttention === 0
                ? 'Todo al día: ningún cliente necesita atención ahora mismo.'
                : `${totals.needAttention} de tus ${totals.clients} clientes necesitan atención.`}
          </p>
          <div className="hero-actions">
            <Link to="/entrenador" className="btn btn-primary"><i className="ti ti-users" aria-hidden="true" /> Mis clientes</Link>
            <Link to="/nutricion" className="btn btn-glass"><i className="ti ti-salad" aria-hidden="true" /> Menús</Link>
          </div>
        </div>
      </section>

      <div className="grid-auto stats-grid" style={{ '--min': '190px', marginBottom: '14px' } as React.CSSProperties}>
        <StatCard icon="ti-users" label="Clientes" value={totals.clients} sub={`${totals.activeLast7d} han entrenado esta semana`} />
        <StatCard icon="ti-barbell" label="Sesiones (7 días)" value={totals.sessionsLast7d} sub="entre todos tus clientes" />
        <StatCard
          icon="ti-camera"
          label="Revisiones pendientes"
          value={totals.revisionsDue}
          sub={totals.revisionsDue ? 'toca revisar' : 'al día'}
          tone={totals.revisionsDue ? 'negative' : 'positive'}
        />
        <StatCard
          icon="ti-message-circle"
          label="Mensajes sin leer"
          value={totals.unreadMessages}
          sub={totals.unreadMessages ? 'por contestar' : 'nada pendiente'}
          tone={totals.unreadMessages ? 'negative' : 'positive'}
        />
      </div>

      {totals.clients === 0 ? (
        <div className="card">
          <EmptyState icon="ti-user-plus" title="Tu cartera está vacía" action={<Link to="/entrenador" className="btn btn-primary">Añadir cliente</Link>}>
            Añade tu primer cliente para ver aquí su actividad, sus revisiones y sus mensajes.
          </EmptyState>
        </div>
      ) : (
        <div className="trainer-home-grid">
          {/* NECESITAN ATENCIÓN */}
          <section className="card trainer-panel">
            <h2 className="section-title"><i className="ti ti-bell-ringing" aria-hidden="true" /> Necesitan atención</h2>
            {attention.length === 0 ? (
              <EmptyState icon="ti-circle-check" title="Todo al día">Ningún cliente tiene avisos pendientes.</EmptyState>
            ) : (
              <div className="trainer-panel-list">
                {attention.map(c => {
                  const sorted = [...c.alerts].sort((a, b) => ALERT_ORDER.indexOf(a) - ALERT_ORDER.indexOf(b))
                  return (
                    <Link key={c.id} to={clientLink(c.id, ALERT_INFO[sorted[0]].tab)} className="attention-row">
                      <Avatar name={c.name} photoUrl={c.profilePhoto} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sorted.map(a => alertText(c, a)).join(' · ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {sorted.map(a => (
                          <span key={a} className={`badge ${ALERT_INFO[a].tone}`} title={ALERT_INFO[a].label}>
                            <i className={`ti ${ALERT_INFO[a].icon}`} aria-hidden="true" />
                          </span>
                        ))}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* ÚLTIMAS SESIONES */}
          <section className="card trainer-panel">
            <h2 className="section-title"><i className="ti ti-activity" aria-hidden="true" /> Últimas sesiones</h2>
            {recentSessions.length === 0 ? (
              <EmptyState icon="ti-barbell" title="Sin sesiones todavía">Cuando tus clientes entrenen, lo verás aquí.</EmptyState>
            ) : (
              <div className="trainer-panel-list">
                {recentSessions.map(s => (
                  <Link key={s.id} to={clientLink(s.clientId, 'historial')} className="attention-row">
                    <span className="icon-tile" style={s.completed ? undefined : { background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                      <i className={`ti ${s.completed ? 'ti-check' : 'ti-player-pause'}`} aria-hidden="true" />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.clientName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {s.workoutName} · {s.sets} series{s.volume ? ` · ${s.volume.toLocaleString('es-ES')} kg` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* TODA LA CARTERA */}
          <section className="card trainer-panel" style={{ gridColumn: '1 / -1' }}>
            <h2 className="section-title"><i className="ti ti-users" aria-hidden="true" /> Tu cartera</h2>
            <div className="portfolio-table">
              <div className="portfolio-head">
                <span>Cliente</span><span>Último entreno</span><span>Esta semana</span><span>Próxima revisión</span><span>Plan</span><span>Menú</span>
              </div>
              {clients.map(c => (
                <Link key={c.id} to={clientLink(c.id)} className="portfolio-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <Avatar name={c.name} photoUrl={c.profilePhoto} size={30} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span className="badge" style={{ height: '18px', fontSize: '10px' }}>{c.subscriptionPlan}</span>
                    </span>
                  </span>
                  <span style={{ color: c.alerts.includes('inactive') ? 'var(--danger)' : undefined }}>{relativeDays(c.lastSessionAt, c.daysSinceSession)}</span>
                  <span>{c.sessionsLast7d} {c.sessionsLast7d === 1 ? 'sesión' : 'sesiones'}</span>
                  <span style={{ color: c.alerts.includes('revision') ? 'var(--warning)' : undefined }}>
                    {c.alerts.includes('revision') ? 'Pendiente' : new Date(c.nextRevisionAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  <span>{c.hasPlan ? <i className="ti ti-circle-check-filled" style={{ color: 'var(--accent-primary)' }} aria-label="Sí" /> : <i className="ti ti-circle-x" style={{ color: 'var(--danger)' }} aria-label="No" />}</span>
                  <span>
                    {!c.nutritionEnabled ? <span style={{ color: 'var(--text-tertiary)' }} title="Su plan no incluye nutrición">—</span>
                      : c.hasMenu ? <i className="ti ti-circle-check-filled" style={{ color: 'var(--accent-primary)' }} aria-label="Sí" />
                      : <i className="ti ti-circle-x" style={{ color: 'var(--warning)' }} aria-label="No" />}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
