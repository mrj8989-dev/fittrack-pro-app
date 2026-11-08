import { useAuth } from '../context/AuthContext'
import ChangePasswordForm from '../components/ChangePasswordForm'

/**
 * Se muestra en lugar de la app cuando la contraseña la puso un admin o un entrenador:
 * hasta que el usuario la cambie no puede navegar.
 */
export default function ForcePasswordChangePage() {
  const { user, logout } = useAuth()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', animation: 'fade-up 0.35s var(--ease) both' }}>
        <div className="brand" style={{ padding: 0, marginBottom: '1.5rem' }}>
          <span className="brand-mark"><i className="ti ti-bolt" aria-hidden="true" /></span>
          <span className="brand-name">Fit<span>Track</span></span>
        </div>
        <h1 className="page-title">Elige tu contraseña</h1>
        <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
          Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Tu cuenta tiene una contraseña provisional:
          cámbiala por una que solo conozcas tú para continuar.
        </p>
        <ChangePasswordForm submitLabel="Guardar y continuar" currentLabel="Contraseña provisional" />
        <button className="btn btn-ghost btn-sm" style={{ marginTop: '14px' }} onClick={logout}>
          <i className="ti ti-logout" aria-hidden="true" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
