import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useUnreadCount } from '../../hooks/useMessages'
import Avatar from '../Avatar'

interface NavItem {
  path: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { path: '/',           label: 'Dashboard',      icon: 'ti-layout-dashboard' },
  { path: '/workout',    label: 'Entrenar',        icon: 'ti-barbell' },
  { path: '/planes',     label: 'Mis planes',      icon: 'ti-clipboard-list' },
  { path: '/progreso',   label: 'Progreso',        icon: 'ti-chart-line' },
  { path: '/revisiones', label: 'Revisiones',      icon: 'ti-camera' },
  { path: '/records',    label: 'Récords',         icon: 'ti-trophy' },
  { path: '/ejercicios', label: 'Ejercicios',      icon: 'ti-crown' },
]

const trainerNavItem: NavItem = { path: '/entrenador', label: 'Entrenador', icon: 'ti-users' }
const chatNavItem: NavItem = { path: '/chat', label: 'Chat', icon: 'ti-message-circle' }
const CHAT_BADGE_PATH: Record<string, string> = { TRAINER: '/entrenador', CLIENT: '/chat' }

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useTheme()
  const { data: unreadCount = 0 } = useUnreadCount()
  const badgePath = user?.role ? CHAT_BADGE_PATH[user.role] : undefined

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-overlay"
        />
      )}

      <aside style={{
        width: '220px',
        minHeight: '100vh',
        background: 'var(--bg-secondary)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0.75rem',
        gap: '4px',
        flexShrink: 0,
        transition: 'transform 0.25s ease',
      }}
      className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 0.75rem',
          marginBottom: '1.5rem',
        }}>
          <i className="ti ti-bolt" style={{ color: 'var(--accent-primary)', fontSize: '22px' }} aria-hidden="true" />
          <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Fit<span style={{ color: 'var(--accent-primary)' }}>Track</span>
          </span>
        </div>

        {(
          user?.role === 'TRAINER' ? [...navItems, trainerNavItem]
          : user?.role === 'CLIENT' ? [...navItems, chatNavItem]
          : navItems
        ).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? '#fff' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-primary)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
            })}
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: '17px' }} aria-hidden="true" />
            {item.label}
            {item.path === badgePath && unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                minWidth: '16px', height: '16px', padding: '0 4px',
                borderRadius: '999px',
                background: '#E24B4A',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        <NavLink
          to="/ajustes"
          onClick={onClose}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            color: isActive ? '#fff' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-primary)' : 'transparent',
            textDecoration: 'none',
          })}
        >
          <i className="ti ti-settings" style={{ fontSize: '17px' }} aria-hidden="true" />
          Ajustes
        </NavLink>

        <button
          onClick={toggleMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <i className={`ti ${mode === 'dark' ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: '17px' }} aria-hidden="true" />
          {mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          marginTop: '4px',
          borderTop: '0.5px solid var(--border)',
          paddingTop: '12px',
        }}>
          <Avatar name={user?.name} photoUrl={user?.profilePhoto} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>PRO</div>
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}
            title="Cerrar sesión"
          >
            <i className="ti ti-logout" style={{ fontSize: '16px' }} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  )
}