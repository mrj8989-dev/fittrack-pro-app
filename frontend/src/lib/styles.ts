// Estilos inline compartidos (para componentes que aún no usan las clases de index.css).

export const inputStyle: React.CSSProperties = {
  height: '38px',
  padding: '0 12px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-strong)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
}

export const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '38px',
  padding: '0 16px',
  background: 'var(--accent-gradient)',
  color: '#fff',
  border: '1px solid transparent',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 6px 18px -8px var(--accent-primary)',
}

export const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-strong)',
  boxShadow: 'var(--shadow-sm)',
}

export const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-tertiary)',
  padding: '6px',
  borderRadius: '8px',
  fontSize: '16px',
  lineHeight: 1,
}

export const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  boxShadow: 'var(--shadow)',
  padding: '1.25rem',
}
