import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBodyRevisions, useNextRevision, useWeightProgress } from '../hooks/useBodyRevisions'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api, { API_BASE_URL } from '../lib/api'
import { chartTooltipStyle } from '../lib/chart'
import { EmptyState, Loader, PageHeader } from '../components/ui'

const schema = z.object({
  weight: z.coerce.number().min(30).max(300),
  bodyFat: z.coerce.number().min(1).max(60).optional(),
  chestCm: z.coerce.number().min(30).optional(),
  waistCm: z.coerce.number().min(30).optional(),
  armsCm: z.coerce.number().min(10).optional(),
  legsCm: z.coerce.number().min(20).optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function InputField({ label, name, register, placeholder, error }: any) {
  return (
    <div>
      <label className="label" htmlFor={`rev-${name}`}>{label}</label>
      <input
        id={`rev-${name}`}
        {...register(name)}
        type="number"
        step="0.1"
        inputMode="decimal"
        placeholder={placeholder}
        className={`input${error ? ' invalid' : ''}`}
      />
      {error && <p className="field-error">{error.message}</p>}
    </div>
  )
}

const PHOTO_FIELDS = [
  { key: 'photoFront', label: 'Frontal' },
  { key: 'photoBack', label: 'Espalda' },
  { key: 'photoSide', label: 'Lateral' },
] as const

type PhotoKey = typeof PHOTO_FIELDS[number]['key']

export default function RevisionsPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Partial<Record<PhotoKey, File>>>({})
  const queryClient = useQueryClient()

  const { data: revisions = [], isLoading } = useBodyRevisions()
  const { data: nextRevision } = useNextRevision()
  const { data: weightProgress = [] } = useWeightProgress()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createRevision = useMutation({
    mutationFn: (data: FormData) => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          formData.append(key, String(value))
        }
      })
      PHOTO_FIELDS.forEach(({ key }) => {
        const file = photos[key]
        if (file) formData.append(key, file)
      })
      return api.post('/body-revisions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body-revisions'] })
      queryClient.invalidateQueries({ queryKey: ['weight-progress'] })
      queryClient.invalidateQueries({ queryKey: ['next-revision'] })
      setShowForm(false)
      setPhotos({})
      reset()
    },
  })

  const deleteRevision = useMutation({
    mutationFn: (id: string) => api.delete(`/body-revisions/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body-revisions'] })
      queryClient.invalidateQueries({ queryKey: ['weight-progress'] })
      queryClient.invalidateQueries({ queryKey: ['next-revision'] })
    },
  })

  const chartData = weightProgress.map((r: any) => ({
    fecha: new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    peso: r.weight,
    grasa: r.bodyFat,
    pecho: r.chestCm,
    cintura: r.waistCm,
    brazos: r.armsCm,
    piernas: r.legsCm,
  }))

  const lastRevision = revisions[0]
  const firstRevision = revisions[revisions.length - 1]
  const weightChange = lastRevision && firstRevision
    ? (lastRevision.weight - firstRevision.weight).toFixed(1)
    : null

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-camera" aria-hidden="true" /> Revisiones</>}
        title="Revisiones corporales"
        subtitle="Seguimiento de peso, medidas y progreso físico"
        actions={
          <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}>
            <i className={`ti ${showForm ? 'ti-x' : 'ti-plus'}`} aria-hidden="true" />
            {showForm ? 'Cerrar' : 'Nueva revisión'}
          </button>
        }
      />

      {/* PRÓXIMA REVISIÓN */}
      {nextRevision && (
        <div className="card" style={{
          background: 'var(--accent-gradient)',
          border: 'none',
          marginBottom: '14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '16px',
          color: '#fff',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="icon-tile lg" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              <i className="ti ti-calendar-event" aria-hidden="true" />
            </span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>Próxima revisión</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {new Date(nextRevision.nextRevisionDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderColor: 'transparent', height: '28px', padding: '0 12px' }}>
              {nextRevision.daysUntilRevision <= 0 ? '¡Hoy toca revisión!' : `en ${nextRevision.daysUntilRevision} días`}
            </span>
            <span className="badge" style={{ background: 'rgba(0,0,0,0.15)', color: '#fff', borderColor: 'transparent', height: '28px', padding: '0 12px' }}>
              cada {nextRevision.revisionInterval} días
            </span>
          </div>
        </div>
      )}

      {/* FORMULARIO */}
      {showForm && (
        <div className="card card-accent" style={{ marginBottom: '14px', padding: '1.5rem' }}>
          <h2 className="section-title"><i className="ti ti-clipboard-plus" aria-hidden="true" /> Nueva revisión</h2>
          <form onSubmit={handleSubmit(d => createRevision.mutate(d))}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <InputField label="Peso (kg) *" name="weight" register={register} placeholder="70.5" error={errors.weight} />
              <InputField label="% Grasa corporal" name="bodyFat" register={register} placeholder="15.0" error={errors.bodyFat} />
              <InputField label="Pecho (cm)" name="chestCm" register={register} placeholder="95" error={errors.chestCm} />
              <InputField label="Cintura (cm)" name="waistCm" register={register} placeholder="78" error={errors.waistCm} />
              <InputField label="Brazos (cm)" name="armsCm" register={register} placeholder="35" error={errors.armsCm} />
              <InputField label="Piernas (cm)" name="legsCm" register={register} placeholder="55" error={errors.legsCm} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label className="label" htmlFor="rev-notes">Notas</label>
              <textarea
                id="rev-notes"
                {...register('notes')}
                placeholder="¿Cómo te has sentido esta semana? ¿Cambios notables?..."
                rows={2}
                className="input"
              />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <span className="label">Fotos (opcional)</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {PHOTO_FIELDS.map(({ key, label }) => {
                  const file = photos[key]
                  return (
                    <div key={key}>
                      <label
                        htmlFor={key}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '6px',
                          height: '120px',
                          background: 'var(--bg-primary)',
                          border: `1.5px dashed ${file ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        {file ? (
                          <img src={URL.createObjectURL(file)} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <>
                            <span className="icon-tile"><i className="ti ti-photo-plus" aria-hidden="true" /></span>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
                          </>
                        )}
                      </label>
                      <input
                        id={key}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const selected = e.target.files?.[0]
                          setPhotos(prev => ({ ...prev, [key]: selected }))
                        }}
                        style={{ display: 'none' }}
                      />
                      {file && (
                        <button
                          type="button"
                          onClick={() => setPhotos(prev => ({ ...prev, [key]: undefined }))}
                          className="btn btn-ghost btn-sm btn-block"
                          style={{ marginTop: '4px' }}
                        >
                          <i className="ti ti-x" aria-hidden="true" /> Quitar {label.toLowerCase()}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="submit" disabled={createRevision.isPending} className="btn btn-primary">
                <i className="ti ti-device-floppy" aria-hidden="true" />
                {createRevision.isPending ? 'Guardando...' : 'Guardar revisión'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); setPhotos({}) }} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STATS RÁPIDAS */}
      {revisions.length > 0 && (
        <div className="grid-auto" style={{ '--min': '150px', marginBottom: '14px' } as React.CSSProperties}>
          {[
            { label: 'Peso actual', icon: 'ti-scale', value: `${lastRevision?.weight} kg`, delta: weightChange ? `${Number(weightChange) >= 0 ? '+' : ''}${weightChange} kg total` : '' },
            { label: '% Grasa', icon: 'ti-droplet', value: lastRevision?.bodyFat ? `${lastRevision.bodyFat}%` : '—' },
            { label: 'Pecho', icon: 'ti-ruler-measure', value: lastRevision?.chestCm ? `${lastRevision.chestCm} cm` : '—' },
            { label: 'Cintura', icon: 'ti-ruler-measure', value: lastRevision?.waistCm ? `${lastRevision.waistCm} cm` : '—' },
            { label: 'Brazos', icon: 'ti-ruler-measure', value: lastRevision?.armsCm ? `${lastRevision.armsCm} cm` : '—' },
            { label: 'Piernas', icon: 'ti-ruler-measure', value: lastRevision?.legsCm ? `${lastRevision.legsCm} cm` : '—' },
          ].map(stat => (
            <div key={stat.label} className="card stat" style={{ padding: '1rem' }}>
              <div className="stat-head" style={{ marginBottom: '6px' }}>
                <span className="stat-label">{stat.label}</span>
                <i className={`ti ${stat.icon}`} style={{ color: 'var(--text-tertiary)', fontSize: '16px' }} aria-hidden="true" />
              </div>
              <div className="stat-value" style={{ fontSize: '22px' }}>{stat.value}</div>
              {stat.delta && <div className={`stat-sub ${Number(weightChange) >= 0 ? 'positive' : 'negative'}`}>{stat.delta}</div>}
            </div>
          ))}
        </div>
      )}

      {/* GRÁFICA EVOLUCIÓN */}
      {weightProgress.length > 1 && (
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <h2 className="section-title"><i className="ti ti-trending-down" aria-hidden="true" /> Evolución del peso</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revWeightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [`${v} kg`, 'Peso']} />
              <Area type="monotone" dataKey="peso" stroke="var(--accent-primary)" strokeWidth={2.5} fill="url(#revWeightGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HISTORIAL */}
      <section>
        <h2 className="section-title"><i className="ti ti-history" aria-hidden="true" /> Historial de revisiones</h2>

        {isLoading ? (
          <Loader inline />
        ) : revisions.length === 0 ? (
          <div className="card">
            <EmptyState icon="ti-camera" title="Aún no tienes revisiones">
              Crea tu primera revisión para empezar a seguir tu evolución
            </EmptyState>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {revisions.map((revision: any, index: number) => {
              const prev = revisions[index + 1]
              const weightDiff = prev ? (revision.weight - prev.weight).toFixed(1) : null

              return (
                <div key={revision.id} className={`card${index === 0 ? ' card-accent' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {new Date(revision.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      {index === 0 && <span className="badge badge-solid">Última</span>}
                      {weightDiff && (
                        <span className={`badge ${Number(weightDiff) >= 0 ? 'badge-accent' : 'badge-danger'}`}>
                          <i className={`ti ${Number(weightDiff) >= 0 ? 'ti-arrow-up-right' : 'ti-arrow-down-right'}`} aria-hidden="true" />
                          {Number(weightDiff) >= 0 ? '+' : ''}{weightDiff} kg
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteRevision.mutate(revision.id)}
                      className="btn-icon"
                      title="Eliminar revisión"
                      aria-label="Eliminar revisión"
                    >
                      <i className="ti ti-trash" style={{ fontSize: '17px' }} aria-hidden="true" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {[
                      { label: 'Peso', value: `${revision.weight} kg` },
                      revision.bodyFat && { label: 'Grasa', value: `${revision.bodyFat}%` },
                      revision.chestCm && { label: 'Pecho', value: `${revision.chestCm} cm` },
                      revision.waistCm && { label: 'Cintura', value: `${revision.waistCm} cm` },
                      revision.armsCm && { label: 'Brazos', value: `${revision.armsCm} cm` },
                      revision.legsCm && { label: 'Piernas', value: `${revision.legsCm} cm` },
                    ].filter(Boolean).map((stat: any) => (
                      <div key={stat.label} className="inset" style={{ padding: '8px 12px', minWidth: '84px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{stat.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {revision.notes && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderLeft: '3px solid var(--accent-primary)',
                      background: 'var(--accent-softer)',
                      borderRadius: '0 10px 10px 0',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                    }}>
                      “{revision.notes}”
                    </div>
                  )}

                  {(revision.photoFront || revision.photoBack || revision.photoSide) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {[
                        { url: revision.photoFront, label: 'Frontal' },
                        { url: revision.photoBack, label: 'Espalda' },
                        { url: revision.photoSide, label: 'Lateral' },
                      ].filter(p => p.url).map(photo => (
                        <button
                          key={photo.label}
                          type="button"
                          onClick={() => setSelectedPhoto(`${API_BASE_URL}${photo.url}`)}
                          style={{
                            width: '84px', height: '84px',
                            padding: 0,
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            position: 'relative',
                            background: 'var(--bg-primary)',
                          }}
                        >
                          <img src={`${API_BASE_URL}${photo.url}`} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                            fontSize: '10px', fontWeight: 600, color: '#fff',
                            textAlign: 'center', padding: '10px 2px 4px',
                          }}>
                            {photo.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* LIGHTBOX FOTOS */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fade-up 0.2s var(--ease) both',
          }}
        >
          <img
            src={selectedPhoto}
            alt="Foto revisión"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      )}
    </div>
  )
}
