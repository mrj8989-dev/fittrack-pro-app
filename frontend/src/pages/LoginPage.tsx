import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'

const schema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      {/* Panel visual */}
      <aside className="login-hero">
        <div className="login-hero-img" />
        <div className="login-hero-overlay" />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="brand" style={{ padding: 0 }}>
            <span className="brand-mark"><i className="ti ti-bolt" aria-hidden="true" /></span>
            <span className="brand-name" style={{ color: '#fff' }}>Fit<span>Track</span></span>
          </div>
          <div style={{ marginTop: 'auto', maxWidth: '440px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Tu progreso,<br />tu historia.
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginTop: '14px', lineHeight: 1.6 }}>
              Entrenamientos, nutrición y revisiones en un solo sitio, conectado con tu entrenador.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '22px', flexWrap: 'wrap' }}>
              {['Sesiones en tiempo real', 'Menús semanales', 'Chat con tu entrenador'].map(t => (
                <span key={t} className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.14)', height: '28px', padding: '0 12px' }}>
                  <i className="ti ti-check" aria-hidden="true" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Formulario */}
      <main className="login-form-wrap">
        <div style={{ width: '100%', maxWidth: '380px', animation: 'fade-up 0.4s var(--ease) both' }}>
          <div className="brand login-mobile-brand" style={{ padding: 0, marginBottom: '2rem' }}>
            <span className="brand-mark"><i className="ti ti-bolt" aria-hidden="true" /></span>
            <span className="brand-name">Fit<span>Track</span></span>
          </div>

          <h1 className="page-title">Bienvenido de nuevo</h1>
          <p className="page-subtitle" style={{ marginBottom: '2rem' }}>Inicia sesión para continuar con tu entrenamiento</p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }} noValidate>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className={`input${errors.email ? ' invalid' : ''}`}
                style={{ height: '44px' }}
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`input${errors.password ? ' invalid' : ''}`}
                style={{ height: '44px' }}
              />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block" style={{ marginTop: '0.5rem' }}>
              {loading ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Entrando...</> : <>Entrar <i className="ti ti-arrow-right" aria-hidden="true" /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2rem' }}>
            FitTrack Pro · © {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  )
}
