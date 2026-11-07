// Primitivas visuales compartidas. El estilo vive en index.css; aquí solo la estructura.
import { createPortal } from 'react-dom'

export function PageHeader({ eyebrow, title, subtitle, actions }: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, icon, tone }: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: string
  tone?: 'positive' | 'negative'
}) {
  return (
    <div className="card stat">
      <div className="stat-head">
        <span className="stat-label">{label}</span>
        {icon && <span className="icon-tile"><i className={`ti ${icon}`} aria-hidden="true" /></span>}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className={`stat-sub ${tone ?? ''}`}>{sub}</div>}
    </div>
  )
}

export function EmptyState({ icon = 'ti-mood-empty', title, children, action }: {
  icon?: string
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="icon-tile lg"><i className={`ti ${icon}`} aria-hidden="true" /></span>
      <div className="empty-state-title">{title}</div>
      {children && <div style={{ maxWidth: '44ch' }}>{children}</div>}
      {action && <div style={{ marginTop: '10px' }}>{action}</div>}
    </div>
  )
}

export function Loader({ label = 'Cargando...', inline }: { label?: string; inline?: boolean }) {
  return (
    <div className="loader" style={inline ? { minHeight: 0, padding: '1.5rem 0' } : undefined}>
      <span className="spinner" />
      {label}
    </div>
  )
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, ...(color ? { background: color } : {}) }} />
    </div>
  )
}

/**
 * Fondo + diálogo renderizados en <body>. Así no quedan atrapados dentro de una tarjeta con
 * backdrop-filter (que crea un nuevo contexto para los elementos position: fixed).
 */
export function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>{children}</div>,
    document.body,
  )
}
