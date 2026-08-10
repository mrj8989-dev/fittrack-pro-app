import { API_BASE_URL } from '../lib/api'

function getInitials(name?: string) {
  return name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
}

export default function Avatar({ name, photoUrl, size = 32 }: { name?: string; photoUrl?: string | null; size?: number }) {
  const commonStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    flexShrink: 0,
  }

  if (photoUrl) {
    return (
      <img
        src={`${API_BASE_URL}${photoUrl}`}
        alt={name || 'Avatar'}
        style={{ ...commonStyle, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div style={{
      ...commonStyle,
      background: 'var(--accent-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${Math.max(10, size * 0.38)}px`,
      color: '#fff',
      fontWeight: 500,
    }}>
      {getInitials(name)}
    </div>
  )
}
