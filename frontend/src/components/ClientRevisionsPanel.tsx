import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api, { API_BASE_URL } from '../lib/api'
import { chartTooltipStyle } from '../lib/chart'
import { EmptyState, Loader, Modal, StatCard } from './ui'

interface Revision {
  id: string
  date: string
  weight: number
  bodyFat: number | null
  chestCm: number | null
  waistCm: number | null
  armsCm: number | null
  legsCm: number | null
  notes: string | null
  photoFront: string | null
  photoBack: string | null
  photoSide: string | null
}

const fmtDate = (iso: string, long = false) =>
  new Date(iso).toLocaleDateString('es-ES', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: 'short' })

/** Revisiones corporales de un cliente, en modo lectura (para su entrenador o el admin). */
export default function ClientRevisionsPanel({ clientId }: { clientId: string }) {
  const [photo, setPhoto] = useState<string | null>(null)
  const { data: revisions = [], isLoading } = useQuery<Revision[]>({
    queryKey: ['client-revisions', clientId],
    queryFn: () => api.get('/body-revisions', { params: { clientId } }).then(r => r.data),
  })
  const { data: next } = useQuery<{ nextRevisionDate: string; daysUntilRevision: number; revisionInterval: number }>({
    queryKey: ['client-next-revision', clientId],
    queryFn: () => api.get('/body-revisions/next-revision', { params: { clientId } }).then(r => r.data),
  })

  if (isLoading) return <Loader inline label="Cargando revisiones..." />

  if (revisions.length === 0) {
    return (
      <div className="card">
        <EmptyState icon="ti-camera" title="Sin revisiones">
          Este cliente todavía no ha registrado ninguna revisión corporal{next ? ` (le toca cada ${next.revisionInterval} días)` : ''}.
        </EmptyState>
      </div>
    )
  }

  const latest = revisions[0]
  const first = revisions[revisions.length - 1]
  const change = Number((latest.weight - first.weight).toFixed(1))
  const chart = [...revisions].reverse().map(r => ({ fecha: fmtDate(r.date), peso: r.weight }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="grid-auto stats-grid" style={{ '--min': '170px' } as React.CSSProperties}>
        <StatCard icon="ti-scale" label="Peso actual" value={`${latest.weight} kg`} sub={fmtDate(latest.date, true)} />
        <StatCard
          icon={change <= 0 ? 'ti-trending-down' : 'ti-trending-up'}
          label="Cambio total"
          value={`${change > 0 ? '+' : ''}${change} kg`}
          sub={`desde el ${fmtDate(first.date)}`}
        />
        <StatCard icon="ti-droplet" label="% Grasa" value={latest.bodyFat ? `${latest.bodyFat}%` : '—'} />
        <StatCard
          icon="ti-calendar-event"
          label="Próxima revisión"
          value={!next ? '—' : next.daysUntilRevision <= 0 ? 'Pendiente' : `${next.daysUntilRevision} días`}
          sub={next ? `cada ${next.revisionInterval} días` : undefined}
          tone={next && next.daysUntilRevision <= 0 ? 'negative' : undefined}
        />
      </div>

      <div className={`client-revisions-grid${chart.length > 1 ? ' has-chart' : ''}`}>
      {chart.length > 1 && (
        <div className="card">
          <h3 className="section-title"><i className="ti ti-chart-line" aria-hidden="true" /> Evolución del peso</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="clientWeightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]} allowDecimals={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v} kg`, 'Peso']} />
              <Area type="monotone" dataKey="peso" stroke="var(--accent-primary)" strokeWidth={2.5} fill="url(#clientWeightGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h3 className="section-title"><i className="ti ti-history" aria-hidden="true" /> Historial</h3>
        <div className="revision-list">
          {revisions.map((r, i) => {
            const prev = revisions[i + 1]
            const diff = prev ? Number((r.weight - prev.weight).toFixed(1)) : null
            const measures = [
              ['Peso', `${r.weight} kg`], ['Grasa', r.bodyFat && `${r.bodyFat}%`], ['Pecho', r.chestCm && `${r.chestCm} cm`],
              ['Cintura', r.waistCm && `${r.waistCm} cm`], ['Brazos', r.armsCm && `${r.armsCm} cm`], ['Piernas', r.legsCm && `${r.legsCm} cm`],
            ].filter(([, v]) => v) as [string, string][]
            const photos = [['Frontal', r.photoFront], ['Espalda', r.photoBack], ['Lateral', r.photoSide]].filter(([, p]) => p) as [string, string][]
            return (
              <div key={r.id} className="revision-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(r.date, true)}</span>
                  {i === 0 && <span className="badge badge-solid">Última</span>}
                  {diff !== null && diff !== 0 && (
                    <span className={`badge ${diff < 0 ? 'badge-accent' : 'badge-warning'}`}>{diff > 0 ? '+' : ''}{diff} kg</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {measures.map(([k, v]) => (
                    <span key={k} className="inset" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{k}</span> <strong style={{ color: 'var(--text-primary)' }}>{v}</strong>
                    </span>
                  ))}
                  {photos.map(([label, url]) => (
                    <button key={label} type="button" className="revision-thumb" onClick={() => setPhoto(`${API_BASE_URL}${url}`)} title={label}>
                      <img src={`${API_BASE_URL}${url}`} alt={label} />
                    </button>
                  ))}
                </div>
                {r.notes && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '6px' }}>“{r.notes}”</p>}
              </div>
            )
          })}
        </div>
      </div>
      </div>

      {photo && (
        <Modal onClose={() => setPhoto(null)}>
          <img src={photo} alt="Foto de revisión" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', cursor: 'zoom-out' }} />
        </Modal>
      )}
    </div>
  )
}
