import { useRef } from 'react'
import { useTheme, accentColors } from '../context/ThemeContext'
import type { AccentColor } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useUploadProfilePhoto } from '../hooks/useProfilePhoto'
import Avatar from '../components/Avatar'
import { PageHeader } from '../components/ui'
import { ROLE_LABEL, isRole } from '../lib/roleAccess'

const colorOptions: { id: AccentColor; label: string }[] = [
  { id: 'green', label: 'Esmeralda' },
  { id: 'blue', label: 'Azul' },
  { id: 'purple', label: 'Violeta' },
  { id: 'cyan', label: 'Cian' },
  { id: 'orange', label: 'Naranja' },
]

function SettingSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ marginBottom: '14px' }}>
      <h2 className="section-title"><i className={`ti ${icon}`} aria-hidden="true" /> {title}</h2>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { mode, accent, toggleMode, setAccent } = useTheme()
  const { user, logout, updateUser } = useAuth()
  const uploadPhoto = useUploadProfilePhoto()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadPhoto.mutate(file, {
      onSuccess: updated => updateUser({ profilePhoto: updated.profilePhoto }),
    })
    e.target.value = ''
  }

  return (
    <div className="page" style={{ maxWidth: '680px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-settings" aria-hidden="true" /> Ajustes</>}
        title="Tu cuenta"
        subtitle="Perfil, apariencia y sesión"
      />

      {/* PERFIL */}
      <section className="card card-accent" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ position: 'relative', background: 'none', border: 'none', padding: 0, borderRadius: '50%' }}
          title="Cambiar foto de perfil"
          aria-label="Cambiar foto de perfil"
        >
          <Avatar name={user?.name} photoUrl={user?.profilePhoto} size={64} />
          <span style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            width: '24px', height: '24px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid var(--bg-secondary)',
          }}>
            <i className="ti ti-camera" style={{ fontSize: '12px', color: '#fff' }} aria-hidden="true" />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user?.email}</div>
          <span className="badge badge-accent" style={{ marginTop: '8px' }}>
            {isRole(user?.role) ? ROLE_LABEL[user.role] : user?.role}
          </span>
          {uploadPhoto.isPending && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>Subiendo foto...</div>
          )}
          {uploadPhoto.isError && (
            <div className="field-error">No se ha podido subir la foto</div>
          )}
        </div>
      </section>

      {/* APARIENCIA */}
      <SettingSection title="Apariencia" icon="ti-palette">
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px' }}>Tema</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
          {(['dark', 'light'] as const).map(m => {
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => !active && toggleMode()}
                className="inset"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px', fontWeight: 500,
                  borderColor: active ? 'var(--accent-primary)' : undefined,
                  boxShadow: active ? '0 0 0 3px var(--accent-ring)' : undefined,
                }}
              >
                <span style={{
                  width: '34px', height: '24px', borderRadius: '6px', flexShrink: 0,
                  background: m === 'dark' ? '#0A0C10' : '#F4F6F8',
                  border: '1px solid var(--border-strong)',
                  display: 'flex', alignItems: 'flex-end', padding: '3px',
                }}>
                  <span style={{ width: '60%', height: '5px', borderRadius: '3px', background: 'var(--accent-primary)' }} />
                </span>
                {m === 'dark' ? 'Oscuro' : 'Claro'}
                {active && <i className="ti ti-circle-check-filled" style={{ marginLeft: 'auto', color: 'var(--accent-primary)', fontSize: '18px' }} aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Color principal</div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
          Se aplica en botones, gráficas y elementos destacados
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {colorOptions.map(color => {
            const active = accent === color.id
            const c = accentColors[color.id]
            return (
              <button
                key={color.id}
                onClick={() => setAccent(color.id)}
                title={color.label}
                aria-label={color.label}
                aria-pressed={active}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  background: 'none', border: 'none', padding: 0,
                  color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontSize: '11px', fontWeight: 500,
                }}
              >
                <span style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${c.light}, ${c.primary} 50%, ${c.dark})`,
                  boxShadow: active ? `0 0 0 3px var(--bg-secondary), 0 0 0 5px ${c.primary}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'box-shadow 0.2s',
                }}>
                  {active && <i className="ti ti-check" style={{ color: '#fff', fontSize: '18px' }} aria-hidden="true" />}
                </span>
                {color.label}
              </button>
            )
          })}
        </div>

        <div className="inset" style={{ marginTop: '1.5rem', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm">Botón primario</button>
            <button className="btn btn-secondary btn-sm">Secundario</button>
            <span className="badge badge-accent">Etiqueta</span>
          </div>
          <div className="progress"><div style={{ width: '65%' }} /></div>
        </div>
      </SettingSection>

      {/* CUENTA */}
      <SettingSection title="Sesión" icon="ti-shield-lock">
        <button onClick={logout} className="btn btn-danger">
          <i className="ti ti-logout" aria-hidden="true" /> Cerrar sesión
        </button>
      </SettingSection>
    </div>
  )
}
