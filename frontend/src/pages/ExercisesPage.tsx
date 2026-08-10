import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  useExercises, useCreateExercise, useUpdateExercise, useDeleteExercise,
} from '../hooks/useExercises'
import type { ExerciseInput } from '../hooks/useExercises'

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  background: 'var(--bg-primary)',
  border: '0.5px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '9px 16px',
  background: 'var(--accent-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
}

const emptyForm: ExerciseInput = { name: '', description: '', muscleGroup: '', equipment: '', videoUrl: '' }

function ExerciseForm({ initial, onSubmit, onCancel, submitting }: {
  initial: ExerciseInput
  onSubmit: (data: ExerciseInput) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [form, setForm] = useState<ExerciseInput>(initial)

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(form) }}
      style={{
        background: 'var(--bg-secondary)',
        border: '0.5px solid var(--accent-primary)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
      }}
    >
      <input
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Nombre *"
        required
        style={inputStyle}
      />
      <input
        value={form.muscleGroup}
        onChange={e => setForm(f => ({ ...f, muscleGroup: e.target.value }))}
        placeholder="Grupo muscular * (ej. Pecho)"
        required
        style={inputStyle}
      />
      <input
        value={form.equipment ?? ''}
        onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
        placeholder="Equipamiento (ej. Barra)"
        style={inputStyle}
      />
      <input
        value={form.videoUrl ?? ''}
        onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
        placeholder="URL vídeo de YouTube"
        style={inputStyle}
      />
      <input
        value={form.description ?? ''}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Descripción"
        style={{ ...inputStyle, gridColumn: '1 / -1' }}
      />
      <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
        <button type="submit" disabled={submitting} style={primaryButtonStyle}>
          {submitting ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...primaryButtonStyle, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function ExercisesPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'TRAINER' || user?.role === 'ADMIN'

  const [muscleGroup, setMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: exercises = [], isLoading } = useExercises({
    muscleGroup: muscleGroup || undefined,
    equipment: equipment || undefined,
  })
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const deleteExercise = useDeleteExercise()

  const muscleGroups = [...new Set(exercises.map((e: any) => e.muscleGroup))].sort() as string[]
  const equipments = [...new Set(exercises.map((e: any) => e.equipment).filter(Boolean))].sort() as string[]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Ejercicios
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Catálogo de ejercicios con grupo muscular, equipamiento y vídeo de referencia
          </p>
        </div>
        {canManage && (
          <button onClick={() => { setShowCreateForm(s => !s); setEditingId(null) }} style={primaryButtonStyle}>
            <i className="ti ti-plus" style={{ fontSize: '14px', marginRight: '6px' }} aria-hidden="true" />
            Nuevo ejercicio
          </button>
        )}
      </div>

      {showCreateForm && (
        <ExerciseForm
          initial={emptyForm}
          submitting={createExercise.isPending}
          onCancel={() => setShowCreateForm(false)}
          onSubmit={data => createExercise.mutate(data, { onSuccess: () => setShowCreateForm(false) })}
        />
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={muscleGroup} onChange={e => setMuscleGroup(e.target.value)} style={inputStyle}>
          <option value="">Todos los grupos musculares</option>
          {muscleGroups.map(mg => <option key={mg} value={mg}>{mg}</option>)}
        </select>
        <select value={equipment} onChange={e => setEquipment(e.target.value)} style={inputStyle}>
          <option value="">Todo el equipamiento</option>
          {equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando...</div>
      ) : exercises.length === 0 ? (
        <div style={{
          background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: '12px',
          padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px',
        }}>
          No hay ejercicios que coincidan con el filtro
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {exercises.map((ex: any) => (
            editingId === ex.id ? (
              <div key={ex.id} style={{ gridColumn: '1 / -1' }}>
                <ExerciseForm
                  initial={{ name: ex.name, description: ex.description ?? '', muscleGroup: ex.muscleGroup, equipment: ex.equipment ?? '', videoUrl: ex.videoUrl ?? '' }}
                  submitting={updateExercise.isPending}
                  onCancel={() => setEditingId(null)}
                  onSubmit={data => updateExercise.mutate({ id: ex.id, ...data }, { onSuccess: () => setEditingId(null) })}
                />
              </div>
            ) : (
              <div key={ex.id} style={{
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: '12px',
                padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{ex.name}</div>
                  {ex.videoUrl && (
                    <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-tertiary)', fontSize: '18px', flexShrink: 0 }}>
                      <i className="ti ti-brand-youtube" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'var(--accent-primary)', color: '#fff' }}>
                    {ex.muscleGroup}
                  </span>
                  {ex.equipment && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}>
                      {ex.equipment}
                    </span>
                  )}
                </div>
                {ex.description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ex.description}</div>
                )}
                {canManage && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      onClick={() => { setEditingId(ex.id); setShowCreateForm(false) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '12px', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <i className="ti ti-pencil" style={{ fontSize: '13px' }} aria-hidden="true" /> Editar
                    </button>
                    <button
                      onClick={() => deleteExercise.mutate(ex.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '12px', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <i className="ti ti-trash" style={{ fontSize: '13px' }} aria-hidden="true" /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
