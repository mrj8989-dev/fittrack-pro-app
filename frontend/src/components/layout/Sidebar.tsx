import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useUnreadCount } from '../../hooks/useMessages'
import Avatar from '../Avatar'
import { NAV_BY_ROLE, ROLE_LABEL, isRole } from '../../lib/roleAccess'
import { PLAN_INFO, isPlan, minimumPlanFor } from '../../lib/planAccess'
import { useFeatureState } from '../../hooks/useAccess'

const CHAT_BADGE_PATH: Record<string, string> = { TRAINER: '/entrenador', CLIENT: '/chat' }

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useTheme()
  const featureState = useFeatureState()
  const { data: unreadCount = 0 } = useUnreadCount(featureState('trainer') === 'available')
  const badgePath = user?.role ? CHAT_BADGE_PATH[user.role] : undefined
  const isClient = user?.role === 'CLIENT'
  const plan = isClient && isPlan(user?.subscriptionPlan) ? user.subscriptionPlan : null

  return (
    <>
      {isOpen && <div onClick={onClose} className="sidebar-overlay" />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="brand" style={{ marginBottom: '0.5rem' }}>
          <span className="brand-mark"><i className="ti ti-bolt" aria-hidden="true" /></span>
          <span className="brand-name">Fit<span>Track</span></span>
          {plan && (
            <span className={`badge ${plan === 'FREE' ? '' : 'badge-accent'}`} style={{ marginLeft: 'auto', height: '20px', fontSize: '10px' }}>
              {plan}
            </span>
          )}
        </div>

        <div className="nav-label">Menú</div>
        {(isRole(user?.role) ? NAV_BY_ROLE[user.role] : []).map(item => {
          const state = item.feature ? featureState(item.feature) : 'available'
          // Apagado por el admin: no se enseña. Fuera de su plan: candado que lleva a los planes.
          if (state === 'hidden') return null
          const locked = state === 'locked'
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) => `${navClass({ isActive })}${locked ? ' locked' : ''}`}
              title={locked ? `Incluido en el plan ${PLAN_INFO[minimumPlanFor(item.feature!)].name}` : undefined}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              {item.label}
              {locked && <i className="ti ti-lock nav-lock" aria-label="Bloqueado" />}
              {!locked && item.path === badgePath && unreadCount > 0 && (
                <span className="nav-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </NavLink>
          )
        })}

        <div style={{ flex: 1, minHeight: '1rem' }} />

        <div className="nav-label">Cuenta</div>
        {isClient && (
          <NavLink to="/planes" onClick={onClose} className={navClass}>
            <i className="ti ti-crown" aria-hidden="true" />
            Mi plan
            {plan === 'FREE' && <span className="badge badge-solid" style={{ marginLeft: 'auto', height: '18px', fontSize: '10px' }}>Mejorar</span>}
          </NavLink>
        )}
        <NavLink to="/ajustes" onClick={onClose} className={navClass}>
          <i className="ti ti-settings" aria-hidden="true" />
          Ajustes
        </NavLink>
        <button onClick={toggleMode} className="nav-link">
          <i className={`ti ${mode === 'dark' ? 'ti-sun' : 'ti-moon'}`} aria-hidden="true" />
          {mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <div className="user-chip">
          <Avatar name={user?.name} photoUrl={user?.profilePhoto} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {isRole(user?.role) ? ROLE_LABEL[user.role] : ''}
            </div>
          </div>
          <button onClick={logout} className="btn-icon" title="Cerrar sesión" aria-label="Cerrar sesión">
            <i className="ti ti-logout" style={{ fontSize: '17px' }} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  )
}
