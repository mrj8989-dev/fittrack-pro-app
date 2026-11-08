import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import {
  useAdminStats, useAdminUsers, useCreateUser, useUpdateUser,
} from '../hooks/useAdmin'
import { apiErrorMessage } from '../lib/apiError'
import type { AdminUser, AdminUserPatch, SubscriptionPlan } from '../hooks/useAdmin'
import Avatar from '../components/Avatar'
import { EmptyState, Loader, Modal, ProgressBar, StatCard } from '../components/ui'
import { chartTooltipStyle } from '../lib/chart'
import { ROLE_LABEL } from '../lib/roleAccess'
import type { Role } from '../lib/roleAccess'

const ROLES: Role[] = ['CLIENT', 'TRAINER', 'ADMIN']
const PLANS: SubscriptionPlan[] = ['FREE', 'PRO', 'PREMIUM']

const ROLE_BADGE: Record<Role, string> = { ADMIN: 'badge-danger', TRAINER: 'badge-info', CLIENT: 'badge-accent' }
const ROLE_ICON: Record<Role, string> = { ADMIN: 'ti-shield-star', TRAINER: 'ti-user-star', CLIENT: 'ti-user' }
const PLAN_BADGE: Record<SubscriptionPlan, string> = { FREE: '', PRO: 'badge-accent', PREMIUM: 'badge-warning' }

type RoleFilter = Role | 'ALL'

// ─────────────────────────────────────────────────────────────
// Formulario de alta / edición (modal)
// ─────────────────────────────────────────────────────────────

function UserFormModal({ user, trainers, onClose }: {
  user?: AdminUser
  trainers: AdminUser[]
  onClose: () => void
}) {
  const isEdit = !!user
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const mutation = isEdit ? updateUser : createUser

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user?.role ?? 'CLIENT') as Role,
    subscriptionPlan: (user?.subscriptionPlan ?? 'FREE') as SubscriptionPlan,
    trainerId: user?.trainerId ?? '',
    revisionInterval: user?.revisionInterval ?? 14,
  })
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(f => ({ ...f, [key]: value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trainerId = form.role === 'CLIENT' && form.trainerId ? form.trainerId : undefined

    if (isEdit) {
      const patch: AdminUserPatch & { id: string } = {
        id: user.id,
        name: form.name,
        email: form.email,
        role: form.role,
        subscriptionPlan: form.subscriptionPlan,
        revisionInterval: Number(form.revisionInterval),
        trainerId: form.role === 'CLIENT' ? (form.trainerId || null) : null,
      }
      if (form.password) patch.password = form.password
      updateUser.mutate(patch, { onSuccess: onClose })
    } else {
      createUser.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        subscriptionPlan: form.subscriptionPlan,
        trainerId,
      }, { onSuccess: onClose })
    }
  }

  return (
    <Modal onClose={onClose}>
      <form className="modal card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={isEdit ? 'Editar usuario' : 'Nuevo usuario'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          {isEdit
            ? <Avatar name={user.name} photoUrl={user.profilePhoto} size={44} />
            : <span className="icon-tile lg"><i className="ti ti-user-plus" aria-hidden="true" /></span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {isEdit ? `Alta el ${new Date(user.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Da de alta un cliente, entrenador o administrador'}
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar"><i className="ti ti-x" style={{ fontSize: '18px' }} aria-hidden="true" /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label className="label" htmlFor="u-name">Nombre</label>
            <input id="u-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="u-email">Email</label>
            <input id="u-email" className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
        </div>

        <div style={{ marginTop: '14px' }}>
          <span className="label">Rol</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => set('role', r)}
                className="inset"
                aria-pressed={form.role === r}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '10px 6px',
                  color: form.role === r ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: 600,
                  borderColor: form.role === r ? 'var(--accent-primary)' : undefined,
                  background: form.role === r ? 'var(--accent-soft)' : undefined,
                }}
              >
                <i className={`ti ${ROLE_ICON[r]}`} style={{ fontSize: '20px' }} aria-hidden="true" />
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '14px' }}>
          <div>
            <label className="label" htmlFor="u-plan">Plan</label>
            <select id="u-plan" className="input" value={form.subscriptionPlan} onChange={e => set('subscriptionPlan', e.target.value as SubscriptionPlan)}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {form.role === 'CLIENT' && (
            <div>
              <label className="label" htmlFor="u-trainer">Entrenador</label>
              <select id="u-trainer" className="input" value={form.trainerId} onChange={e => set('trainerId', e.target.value)}>
                <option value="">Sin entrenador</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {isEdit && form.role === 'CLIENT' && (
            <div>
              <label className="label" htmlFor="u-interval">Revisión cada (días)</label>
              <input id="u-interval" className="input" type="number" min={7} max={28} value={form.revisionInterval} onChange={e => set('revisionInterval', Number(e.target.value))} />
            </div>
          )}
        </div>

        <div style={{ marginTop: '14px' }}>
          <label className="label" htmlFor="u-pass">{isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}</label>
          <input
            id="u-pass"
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            required={!isEdit}
            minLength={6}
            placeholder={isEdit ? 'Déjala vacía para no cambiarla' : 'Mínimo 6 caracteres'}
          />
        </div>

        {isEdit && user.role === 'TRAINER' && form.role !== 'TRAINER' && user._count.trainerClients > 0 && (
          <div className="alert" style={{ marginTop: '14px', background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            Sus {user._count.trainerClients} clientes quedarán sin entrenador asignado.
          </div>
        )}
        {mutation.isError && (
          <div className="alert alert-danger" style={{ marginTop: '14px' }}>
            <i className="ti ti-alert-circle" aria-hidden="true" /> {apiErrorMessage(mutation.error)}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            <i className={`ti ${isEdit ? 'ti-device-floppy' : 'ti-user-plus'}`} aria-hidden="true" />
            {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Gestión de usuarios
// ─────────────────────────────────────────────────────────────

function UsersManager({ trainers, onEdit, counts }: {
  trainers: AdminUser[]
  onEdit: (u: AdminUser) => void
  counts: Record<RoleFilter, number>
}) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [search, setSearch] = useState('')
  const { data: users = [], isLoading } = useAdminUsers({
    role: roleFilter === 'ALL' ? undefined : roleFilter,
    search: search || undefined,
  })
  const updateUser = useUpdateUser()

  const tabs: { id: RoleFilter; label: string }[] = [
    { id: 'ALL', label: 'Todos' },
    { id: 'CLIENT', label: 'Clientes' },
    { id: 'TRAINER', label: 'Entrenadores' },
    { id: 'ADMIN', label: 'Admins' },
  ]

  return (
    <section className="card admin-users">
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <div className="tabs" role="tablist">
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={roleFilter === t.id} className={`tab${roleFilter === t.id ? ' active' : ''}`} onClick={() => setRoleFilter(t.id)}>
              {t.label}
              <span style={{ fontSize: '11px', opacity: 0.7 }}>{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} aria-hidden="true" />
          <input className="input" placeholder="Buscar por nombre o email" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px' }} aria-label="Buscar usuarios" />
        </div>
      </div>

      {isLoading ? (
        <Loader inline />
      ) : users.length === 0 ? (
        <EmptyState icon="ti-users" title="Sin resultados">No hay usuarios que coincidan con el filtro</EmptyState>
      ) : (
        <div className="admin-users-list">
          {users.map(u => (
            <div key={u.id} className="user-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <Avatar name={u.name} photoUrl={u.profilePhoto} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge ${ROLE_BADGE[u.role]}`}><i className={`ti ${ROLE_ICON[u.role]}`} aria-hidden="true" /> {ROLE_LABEL[u.role]}</span>
                {u.role === 'CLIENT' && <span className={`badge ${PLAN_BADGE[u.subscriptionPlan]}`}>{u.subscriptionPlan}</span>}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: 0 }}>
                {u.role === 'CLIENT' ? (
                  <select
                    className="input"
                    value={u.trainerId ?? ''}
                    onChange={e => updateUser.mutate({ id: u.id, trainerId: e.target.value || null })}
                    aria-label={`Entrenador de ${u.name}`}
                    style={{ height: '34px', fontSize: '12px', color: u.trainerId ? 'var(--text-primary)' : 'var(--warning)' }}
                  >
                    <option value="">Sin entrenador</option>
                    {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                ) : u.role === 'TRAINER' ? (
                  <span><i className="ti ti-users" aria-hidden="true" /> {u._count.trainerClients} clientes</span>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>Acceso total</span>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', gap: '12px' }}>
                {u.role === 'CLIENT' && (
                  <>
                    <span title="Sesiones"><i className="ti ti-barbell" aria-hidden="true" /> {u._count.workoutSessions}</span>
                    <span title="Revisiones"><i className="ti ti-camera" aria-hidden="true" /> {u._count.bodyRevisions}</span>
                    <span title="Menús"><i className="ti ti-salad" aria-hidden="true" /> {u._count.mealPlans}</span>
                  </>
                )}
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(u)} style={{ justifySelf: 'end' }}>
                <i className="ti ti-pencil" aria-hidden="true" /> Editar
              </button>
            </div>
          ))}
        </div>
      )}
      {updateUser.isError && (
        <div className="alert alert-danger" style={{ margin: '0 1.25rem 1.25rem' }}>
          <i className="ti ti-alert-circle" aria-hidden="true" /> {apiErrorMessage(updateUser.error)}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useAdminStats()
  const { data: trainers = [] } = useAdminUsers({ role: 'TRAINER' })
  const [modal, setModal] = useState<{ user?: AdminUser } | null>(null)

  if (isLoading || !stats) return <Loader label="Cargando panel..." />

  const counts: Record<RoleFilter, number> = {
    ALL: stats.users.total,
    CLIENT: stats.users.clients,
    TRAINER: stats.users.trainers,
    ADMIN: stats.users.admins,
  }
  const activity = stats.activity.map(a => ({
    ...a,
    label: new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  }))
  const totalClients = Math.max(stats.users.clients, 1)

  return (
    <div className="page" style={{ maxWidth: '1280px' }}>
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="page-eyebrow" style={{ color: 'var(--accent-light)' }}>
            <i className="ti ti-shield-star" aria-hidden="true" /> Administración
          </div>
          <h1 className="hero-title">Hola, {user?.name?.split(' ')[0]}</h1>
          <p className="hero-subtitle">
            {stats.users.total} usuarios · {stats.sessions.last7d} sesiones esta semana · {stats.exercises} ejercicios en el catálogo
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => setModal({})}>
              <i className="ti ti-user-plus" aria-hidden="true" /> Nuevo usuario
            </button>
            <Link to="/entrenador" className="btn btn-glass"><i className="ti ti-users" aria-hidden="true" /> Ver clientes</Link>
            <Link to="/nutricion" className="btn btn-glass"><i className="ti ti-salad" aria-hidden="true" /> Menús</Link>
            <Link to="/ejercicios" className="btn btn-glass"><i className="ti ti-list-search" aria-hidden="true" /> Ejercicios</Link>
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <div className="grid-auto stats-grid" style={{ '--min': '180px', marginBottom: '14px' } as React.CSSProperties}>
        <StatCard icon="ti-users" label="Usuarios" value={stats.users.total} sub={`+${stats.users.new30d} en 30 días`} tone="positive" />
        <StatCard icon="ti-user-star" label="Entrenadores" value={stats.users.trainers} sub={`${(stats.users.clients / Math.max(stats.users.trainers, 1)).toFixed(1)} clientes / entrenador`} />
        <StatCard
          icon="ti-user"
          label="Clientes"
          value={stats.users.clients}
          sub={stats.users.unassignedClients > 0 ? `${stats.users.unassignedClients} sin entrenador` : 'Todos asignados'}
          tone={stats.users.unassignedClients > 0 ? 'negative' : 'positive'}
        />
        <StatCard icon="ti-barbell" label="Sesiones (7 días)" value={stats.sessions.last7d} sub={`${stats.sessions.total} en total`} />
        <StatCard icon="ti-camera" label="Revisiones (30 días)" value={stats.revisions30d} />
        <StatCard icon="ti-salad" label="Menús de clientes" value={stats.mealPlans} />
      </div>

      <div className="admin-main">
        <div className="admin-users-col">
          <UsersManager trainers={trainers} counts={counts} onEdit={u => setModal({ user: u })} />
        </div>

        <aside className="admin-side">
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: '2px' }}><i className="ti ti-activity" aria-hidden="true" /> Actividad · 14 días</h2>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={activity} barSize={10}>
              <defs>
                <linearGradient id="adminAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-light)" />
                  <stop offset="100%" stopColor="var(--accent-primary)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval={1} />
              <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={chartTooltipStyle} formatter={(v: number) => [v, 'Sesiones']} />
              <Bar dataKey="sessions" fill="url(#adminAct)" radius={[6, 6, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
          </div>

          <div className="card">
          <h2 className="section-title"><i className="ti ti-crown" aria-hidden="true" /> Planes de clientes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PLANS.map(p => {
              const n = stats.clientsByPlan[p] ?? 0
              return (
                <div key={p}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span className={`badge ${PLAN_BADGE[p]}`}>{p}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({Math.round((n / totalClients) * 100)}%)</span></span>
                  </div>
                  <ProgressBar value={(n / totalClients) * 100} />
                </div>
              )
            })}
          </div>

          <div className="divider" style={{ margin: '1rem 0 0.75rem' }} />
          <h3 className="section-title" style={{ marginBottom: '10px' }}><i className="ti ti-sparkles" aria-hidden="true" /> Últimas altas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stats.recentUsers.slice(0, 3).map(u => (
              <button key={u.id} className="list-item" onClick={() => setModal({ user: u })}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <Avatar name={u.name} photoUrl={u.profilePhoto} size={28} />
                  <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                </span>
                <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
              </button>
            ))}
          </div>
          </div>
        </aside>
      </div>

      {modal && <UserFormModal key={modal.user?.id ?? 'new'} user={modal.user} trainers={trainers} onClose={() => setModal(null)} />}
    </div>
  )
}
