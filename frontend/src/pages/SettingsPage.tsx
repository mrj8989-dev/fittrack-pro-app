import { useRef } from 'react'
import { useTheme, accentColors } from '../context/ThemeContext'
import type { AccentColor } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useUploadProfilePhoto } from '../hooks/useProfilePhoto'
import Avatar from '../components/Avatar'

const colorOptions: { id: AccentColor; label: string; emoji: string }[] = [
  { id: 'green', label: 'Verde', emoji: '🌿' },
  { id: 'blue', label: 'Azul', emoji: '🔵' },
  { id: 'purple', label: 'Morado', emoji: '🟣' },
  { id: 'cyan', label: 'Cian', emoji: '🩵' },
  { id: 'orange', label: 'Naranja', emoji: '🟠' },
]

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border)',
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1rem',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </div>
      {children}
    </div>
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
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Ajustes
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Personaliza tu experiencia en FitTrack
        </p>
      </div>

      {/* PERFIL */}
      <SettingSection title="Perfil">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ position: 'relative', cursor: 'pointer' }}
            title="Cambiar foto de perfil"
          >
            <Avatar name={user?.name} photoUrl={user?.profilePhoto} size={48} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '18px', height: '18px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-secondary)',
            }}>
              <i className="ti ti-camera" style={{ fontSize: '10px', color: '#fff' }} aria-hidden="true" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {user?.email}
            </div>
            <div style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '2px 10px',
              background: 'rgba(29,158,117,0.15)',
              color: 'var(--accent-primary)',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 500,
            }}>
              {user?.role}
            </div>
          </div>
        </div>
        {uploadPhoto.isPending && (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '10px' }}>Subiendo foto...</div>
        )}
        {uploadPhoto.isError && (
          <div style={{ fontSize: '12px', color: '#E24B4A', marginTop: '10px' }}>No se ha podido subir la foto</div>
        )}
      </SettingSection>

      {/* APARIENCIA */}
      <SettingSection title="Apariencia">

        {/* Modo oscuro/claro */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Tema</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {mode === 'dark' ? 'Modo oscuro activo' : 'Modo claro activo'}
            </div>
          </div>
          <button
            onClick={toggleMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'var(--bg-primary)',
              border: '0.5px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <i className={`ti ${mode === 'dark' ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: '16px' }} aria-hidden="true" />
            {mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>

        {/* Color accent */}
        <div>
          <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>Color principal</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            Se aplica en botones, gráficas y elementos destacados
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {colorOptions.map(color => (
              <button
                key={color.id}
                onClick={() => setAccent(color.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  background: accent === color.id ? 'rgba(29,158,117,0.1)' : 'var(--bg-primary)',
                  border: `0.5px solid ${accent === color.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minWidth: '70px',
                }}
              >
                <div style={{
                  width: '28px', height: '28px',
                  borderRadius: '50%',
                  background: accentColors[color.id].primary,
                  border: accent === color.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  transition: 'border 0.15s',
                }} />
                <div style={{ fontSize: '12px', color: accent === color.id ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  {color.label}
                </div>
                {accent === color.id && (
                  <i className="ti ti-check" style={{ fontSize: '12px', color: 'var(--accent-primary)' }} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>
      </SettingSection>

      {/* VISTA PREVIA */}
      <SettingSection title="Vista previa">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              padding: '8px 16px',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
            }}>
              Botón primario
            </button>
            <button style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--accent-primary)',
              border: '0.5px solid var(--accent-primary)',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
            }}>
              Botón secundario
            </button>
          </div>
          <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px' }}>
            <div style={{ height: '6px', width: '65%', background: 'var(--accent-primary)', borderRadius: '3px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                flex: 1, height: '40px',
                background: i <= 3 ? 'var(--accent-primary)' : 'var(--border)',
                borderRadius: '4px 4px 0 0',
                opacity: i === 3 ? 1 : 0.6,
              }} />
            ))}
          </div>
        </div>
      </SettingSection>

      {/* CUENTA */}
      <SettingSection title="Cuenta">
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: 'rgba(226,75,74,0.1)',
            border: '0.5px solid rgba(226,75,74,0.3)',
            borderRadius: '8px',
            color: '#E24B4A',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          <i className="ti ti-logout" style={{ fontSize: '16px' }} aria-hidden="true" />
          Cerrar sesión
        </button>
      </SettingSection>

    </div>
  )
}