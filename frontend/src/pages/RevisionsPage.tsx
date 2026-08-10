import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBodyRevisions, useNextRevision, useWeightProgress } from '../hooks/useBodyRevisions'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../lib/api'

    // RevisionsPage
    //     ↓ llama
    // useBodyRevisions()      ← hook con React Query
    //     ↓ llama
    // api.get('/body-revisions')   ← Axios con JWT automático
    //     ↓ llama
    // Backend NestJS               ← endpoint GET /body-revisions
    //     ↓ llama
    // Prisma → PostgreSQL          ← devuelve los datos
    //     ↓ sube
    // RevisionsPage recibe data y renderiza

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
      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      <input
        {...register(name)}
        type="number"
        step="0.1"
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-primary)',
          border: `0.5px solid ${error ? '#E24B4A' : 'var(--border)'}`,
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          outline: 'none',
        }}
      />
      {error && <p style={{ fontSize: '12px', color: '#E24B4A', marginTop: '4px' }}>{error.message}</p>}
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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Revisiones corporales
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Seguimiento de peso, medidas y progreso físico
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px',
            background: 'var(--accent-primary)',
            color: '#fff', border: 'none',
            borderRadius: '10px', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: '16px' }} aria-hidden="true" />
          Nueva revisión
        </button>
      </div>

      {/* PRÓXIMA REVISIÓN */}
      {nextRevision && (
        <div style={{
          background: `linear-gradient(135deg, var(--accent-dark) 0%, var(--accent-primary) 100%)`,
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '8px',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
              Próxima revisión
            </div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#fff' }}>
              {new Date(nextRevision.nextRevisionDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
              {nextRevision.daysUntilRevision === 0
                ? '¡Hoy toca revisión!'
                : `en ${nextRevision.daysUntilRevision} días`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
              Intervalo configurado
            </div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: '#fff' }}>
              cada {nextRevision.revisionInterval} días
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO */}
      {showForm && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--accent-primary)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            Nueva revisión
          </h2>
          <form onSubmit={handleSubmit(d => createRevision.mutate(d))}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <InputField label="Peso (kg) *" name="weight" register={register} placeholder="70.5" error={errors.weight} />
              <InputField label="% Grasa corporal" name="bodyFat" register={register} placeholder="15.0" error={errors.bodyFat} />
              <InputField label="Pecho (cm)" name="chestCm" register={register} placeholder="95" error={errors.chestCm} />
              <InputField label="Cintura (cm)" name="waistCm" register={register} placeholder="78" error={errors.waistCm} />
              <InputField label="Brazos (cm)" name="armsCm" register={register} placeholder="35" error={errors.armsCm} />
              <InputField label="Piernas (cm)" name="legsCm" register={register} placeholder="55" error={errors.legsCm} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Notas
              </label>
              <textarea
                {...register('notes')}
                placeholder="¿Cómo te has sentido esta semana? ¿Cambios notables?..."
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-primary)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px', outline: 'none', resize: 'vertical',
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Fotos (opcional)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {PHOTO_FIELDS.map(({ key, label }) => {
                  const file = photos[key]
                  return (
                    <div key={key}>
                      <label
                        htmlFor={key}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '4px',
                          height: '90px',
                          background: 'var(--bg-primary)',
                          border: `0.5px dashed var(--border)`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {file ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <>
                            <i className="ti ti-camera" style={{ fontSize: '20px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{label}</span>
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
                          style={{
                            marginTop: '4px', width: '100%',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '11px', color: 'var(--text-tertiary)', padding: '2px',
                          }}
                        >
                          Quitar {label.toLowerCase()}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={createRevision.isPending}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent-primary)',
                  color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '13px',
                  fontWeight: 500, cursor: 'pointer',
                }}
              >
                {createRevision.isPending ? 'Guardando...' : 'Guardar revisión'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); setPhotos({}) }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STATS RÁPIDAS */}
      {revisions.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '1.5rem',
        }}>
          {[
            { label: 'Peso actual', value: `${lastRevision?.weight} kg`, delta: weightChange ? `${Number(weightChange) >= 0 ? '+' : ''}${weightChange} kg total` : '' },
            { label: '% Grasa', value: lastRevision?.bodyFat ? `${lastRevision.bodyFat}%` : '—' },
            { label: 'Pecho', value: lastRevision?.chestCm ? `${lastRevision.chestCm} cm` : '—' },
            { label: 'Cintura', value: lastRevision?.waistCm ? `${lastRevision.waistCm} cm` : '—' },
            { label: 'Brazos', value: lastRevision?.armsCm ? `${lastRevision.armsCm} cm` : '—' },
            { label: 'Piernas', value: lastRevision?.legsCm ? `${lastRevision.legsCm} cm` : '—' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)' }}>{stat.value}</div>
              {stat.delta && <div style={{ fontSize: '11px', color: Number(weightChange) >= 0 ? 'var(--accent-primary)' : '#E24B4A', marginTop: '3px' }}>{stat.delta}</div>}
            </div>
          ))}
        </div>
      )}

      {/* GRÁFICA EVOLUCIÓN */}
      {weightProgress.length > 1 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Evolución del peso
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: any) => [`${v} kg`, 'Peso']}
              />
              <Area type="monotone" dataKey="peso" stroke="var(--accent-primary)" strokeWidth={2} fill="url(#weightGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HISTORIAL */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Historial de revisiones
        </h2>

        {isLoading ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando...</div>
        ) : revisions.length === 0 ? (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border)',
            borderRadius: '12px',
            padding: '2rem', textAlign: 'center',
          }}>
            <i className="ti ti-camera" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '8px' }} aria-hidden="true" />
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Aún no tienes revisiones
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Crea tu primera revisión para empezar a trackear tu evolución
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {revisions.map((revision: any, index: number) => {
              const prev = revisions[index + 1]
              const weightDiff = prev ? (revision.weight - prev.weight).toFixed(1) : null

              return (
                <div key={revision.id} style={{
                  background: 'var(--bg-secondary)',
                  border: `0.5px solid ${index === 0 ? 'var(--accent-primary)' : 'var(--border)'}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {index === 0 && (
                        <div style={{
                          padding: '2px 10px',
                          background: 'var(--accent-primary)',
                          color: '#fff',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}>
                          Última
                        </div>
                      )}
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {new Date(revision.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      {weightDiff && (
                        <div style={{ fontSize: '12px', color: Number(weightDiff) >= 0 ? 'var(--accent-primary)' : '#E24B4A' }}>
                          {Number(weightDiff) >= 0 ? '+' : ''}{weightDiff} kg
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteRevision.mutate(revision.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}
                    >
                      <i className="ti ti-trash" style={{ fontSize: '16px' }} aria-hidden="true" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {[
                      { label: 'Peso', value: `${revision.weight} kg` },
                      revision.bodyFat && { label: 'Grasa', value: `${revision.bodyFat}%` },
                      revision.chestCm && { label: 'Pecho', value: `${revision.chestCm} cm` },
                      revision.waistCm && { label: 'Cintura', value: `${revision.waistCm} cm` },
                      revision.armsCm && { label: 'Brazos', value: `${revision.armsCm} cm` },
                      revision.legsCm && { label: 'Piernas', value: `${revision.legsCm} cm` },
                    ].filter(Boolean).map((stat: any) => (
                      <div key={stat.label}>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{stat.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {revision.notes && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                    }}>
                      "{revision.notes}"
                    </div>
                  )}

                  {(revision.photoFront || revision.photoBack || revision.photoSide) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      {[
                        { url: revision.photoFront, label: 'Frontal' },
                        { url: revision.photoBack, label: 'Espalda' },
                        { url: revision.photoSide, label: 'Lateral' },
                      ].filter(p => p.url).map(photo => (
                        <div
                          key={photo.label}
                          onClick={() => setSelectedPhoto(`http://localhost:3000${photo.url}`)}
                          style={{
                            width: '70px', height: '70px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '0.5px solid var(--border)',
                            position: 'relative',
                          }}
                        >
                          <img
                            src={`http://localhost:3000${photo.url}`}
                            alt={photo.label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'rgba(0,0,0,0.6)',
                            fontSize: '9px', color: '#fff',
                            textAlign: 'center', padding: '2px',
                          }}>
                            {photo.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* LIGHTBOX FOTOS */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <img
            src={selectedPhoto}
            alt="Foto revisión"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  )
}