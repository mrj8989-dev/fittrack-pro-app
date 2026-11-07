/** Barra de progreso de un macro frente a su objetivo diario. */
export function MacroBar({ label, value, target, unit }: { label: string; value: number; target?: number; unit: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0
  const diff = target ? value - target : 0
  // Margen de ±5 %: dentro, en verde; por debajo, ámbar; por encima, rojo.
  const tolerance = target ? target * 0.05 : 0
  const color = !target ? 'var(--accent-primary)'
    : Math.abs(diff) <= tolerance ? 'var(--accent-primary)'
    : diff < 0 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', gap: '6px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {value}{target ? ` / ${target}` : ''} {unit}
        </span>
      </div>
      <div className="progress">
        <div style={{ width: `${target ? pct : 100}%`, background: color }} />
      </div>
    </div>
  )
}
