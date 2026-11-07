import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  useExercises, useCreateExercise, useUpdateExercise, useDeleteExercise,
} from '../hooks/useExercises'
import type { Exercise, ExerciseInput } from '../hooks/useExercises'
import { EmptyState, Loader, Modal, PageHeader } from '../components/ui'
import BodyMap from '../components/BodyMap'
import { GROUP_HUE, MUSCLE_LABEL, MUSCLE_TO_GROUP, musclesFor } from '../lib/muscles'
import type { MuscleId } from '../lib/muscles'

const emptyForm: ExerciseInput = { name: '', description: '', muscleGroup: '', equipment: '', videoUrl: '' }

const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const groupColor = (group: string) => `hsl(${GROUP_HUE[group] ?? 200} 70% 55%)`

// ─────────────────────────────────────────────────────────────
// Formulario (modal) de alta / edición
// ─────────────────────────────────────────────────────────────

function ExerciseFormModal({ initial, groups, onSubmit, onClose, submitting, title }: {
  initial: ExerciseInput
  groups: string[]
  onSubmit: (data: ExerciseInput) => void
  onClose: () => void
  submitting: boolean
  title: string
}) {
  const [form, setForm] = useState<ExerciseInput>(initial)
  const set = (k: keyof ExerciseInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal onClose={onClose}>
      <form className="modal card" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); onSubmit(form) }} role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <span className="icon-tile lg"><i className="ti ti-barbell" aria-hidden="true" /></span>
          <h2 style={{ flex: 1, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar"><i className="ti ti-x" style={{ fontSize: '18px' }} aria-hidden="true" /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label" htmlFor="ex-name">Nombre</label>
            <input id="ex-name" className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label" htmlFor="ex-group">Grupo muscular</label>
            <input id="ex-group" className="input" list="ex-groups" value={form.muscleGroup} onChange={set('muscleGroup')} required placeholder="Pecho, Espalda..." />
            <datalist id="ex-groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="ex-equip">Equipamiento</label>
            <input id="ex-equip" className="input" value={form.equipment ?? ''} onChange={set('equipment')} placeholder="Barra, mancuernas..." />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label" htmlFor="ex-video">Vídeo (URL)</label>
            <input id="ex-video" className="input" value={form.videoUrl ?? ''} onChange={set('videoUrl')} placeholder="https://www.youtube.com/..." />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label" htmlFor="ex-desc">Técnica</label>
            <textarea id="ex-desc" className="input" rows={3} value={form.description ?? ''} onChange={set('description')} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <i className="ti ti-device-floppy" aria-hidden="true" /> {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Ficha de un ejercicio
// ─────────────────────────────────────────────────────────────

function ExerciseDetail({ exercise, related, canManage, onSelect, onClose, onEdit, onDelete }: {
  exercise: Exercise
  related: Exercise[]
  canManage: boolean
  onSelect: (id: string) => void
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { primary, secondary } = musclesFor(exercise)
  const secondaryOnly = secondary.filter(m => !primary.includes(m))

  return (
    <div className="ex-detail" key={exercise.id}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="badge" style={{ background: `color-mix(in srgb, ${groupColor(exercise.muscleGroup)} 16%, transparent)`, color: groupColor(exercise.muscleGroup), borderColor: 'transparent' }}>
              {exercise.muscleGroup}
            </span>
            {exercise.equipment && <span className="badge"><i className="ti ti-barbell" aria-hidden="true" /> {exercise.equipment}</span>}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--text-primary)' }}>
            {exercise.name}
          </h2>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="Cerrar ficha" title="Volver al mapa">
          <i className="ti ti-x" style={{ fontSize: '18px' }} aria-hidden="true" />
        </button>
      </div>

      <div className="inset" style={{ padding: '14px 10px 8px', margin: '16px 0 12px' }}>
        <BodyMap primary={primary} secondary={secondaryOnly} height={250} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span><span className="legend-dot primary" /> Principal</span>
          <span><span className="legend-dot secondary" /> Secundario</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <div className="stat-label" style={{ marginBottom: '6px' }}>Músculos principales</div>
          <div className="chips">
            {primary.map(m => <span key={m} className="badge badge-accent">{MUSCLE_LABEL[m]}</span>)}
          </div>
        </div>
        {secondaryOnly.length > 0 && (
          <div>
            <div className="stat-label" style={{ marginBottom: '6px' }}>Secundarios</div>
            <div className="chips">
              {secondaryOnly.map(m => <span key={m} className="badge">{MUSCLE_LABEL[m]}</span>)}
            </div>
          </div>
        )}
      </div>

      {exercise.description && (
        <div style={{ marginTop: '16px' }}>
          <div className="stat-label" style={{ marginBottom: '6px' }}>Técnica</div>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', padding: '10px 14px', borderLeft: '3px solid var(--accent-primary)', background: 'var(--accent-softer)', borderRadius: '0 10px 10px 0' }}>
            {exercise.description}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
        {exercise.videoUrl && (
          <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <i className="ti ti-brand-youtube" aria-hidden="true" /> Ver vídeo
          </a>
        )}
        {canManage && <>
          <button className="btn btn-secondary" onClick={onEdit}><i className="ti ti-pencil" aria-hidden="true" /> Editar</button>
          <button className="btn btn-danger" onClick={onDelete}><i className="ti ti-trash" aria-hidden="true" /> Eliminar</button>
        </>}
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div className="stat-label" style={{ marginBottom: '6px' }}>Más de {exercise.muscleGroup.toLowerCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {related.map(r => (
              <button key={r.id} className="list-item" onClick={() => onSelect(r.id)}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{r.name}</span>
                <i className="ti ti-chevron-right" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'TRAINER' || user?.role === 'ADMIN'

  const [muscleGroup, setMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<{ editing?: Exercise } | null>(null)

  const { data: allExercises = [], isLoading } = useExercises()
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const deleteExercise = useDeleteExercise()

  const groupCounts: Record<string, number> = {}
  allExercises.forEach(e => { groupCounts[e.muscleGroup] = (groupCounts[e.muscleGroup] || 0) + 1 })
  const muscleGroups = Object.keys(groupCounts).sort((a, b) => a.localeCompare(b, 'es'))
  const equipments = [...new Set(allExercises.map(e => e.equipment).filter((eq): eq is string => !!eq))]
    .sort((a, b) => a.localeCompare(b, 'es'))

  const q = normalize(search.trim())
  const exercises = allExercises
    .filter(e =>
      (!muscleGroup || e.muscleGroup === muscleGroup)
      && (!equipment || e.equipment === equipment)
      && (!q || normalize(`${e.name} ${e.muscleGroup} ${e.equipment ?? ''}`).includes(q)))
    .sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup, 'es') || a.name.localeCompare(b.name, 'es'))

  // Lista agrupada por grupo muscular, con cabeceras fijas al hacer scroll.
  const grouped: [string, Exercise[]][] = []
  for (const ex of exercises) {
    const last = grouped[grouped.length - 1]
    if (last && last[0] === ex.muscleGroup) last[1].push(ex)
    else grouped.push([ex.muscleGroup, [ex]])
  }

  const selected = allExercises.find(e => e.id === selectedId) ?? null
  const related = selected
    ? allExercises.filter(e => e.muscleGroup === selected.muscleGroup && e.id !== selected.id).slice(0, 5)
    : []

  // Músculos resaltados en el mapa cuando se filtra por grupo.
  const mapHighlight: MuscleId[] = muscleGroup
    ? (Object.keys(MUSCLE_TO_GROUP) as MuscleId[]).filter(m => MUSCLE_TO_GROUP[m] === muscleGroup)
    : []

  return (
    <div className="page" style={{ maxWidth: '1440px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-list-search" aria-hidden="true" /> Catálogo</>}
        title="Ejercicios"
        subtitle={`${allExercises.length} ejercicios con técnica, músculos implicados y vídeo de referencia`}
        actions={canManage && (
          <button onClick={() => setForm({})} className="btn btn-primary">
            <i className="ti ti-plus" aria-hidden="true" /> Nuevo ejercicio
          </button>
        )}
      />

      <div className="ex-layout">
        {/* LISTA */}
        <section className="card ex-list-panel">
          <div className="ex-toolbar">
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} aria-hidden="true" />
              <input
                className="input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar ejercicio, músculo o material"
                aria-label="Buscar ejercicio"
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <select className="input" value={equipment} onChange={e => setEquipment(e.target.value)} style={{ flex: '0 1 200px' }} aria-label="Equipamiento">
              <option value="">Todo el material</option>
              {equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </div>

          <div className="chips ex-chips">
            <button className={`chip${!muscleGroup ? ' active' : ''}`} onClick={() => setMuscleGroup('')}>
              Todos <span>{allExercises.length}</span>
            </button>
            {muscleGroups.map(mg => (
              <button key={mg} className={`chip${muscleGroup === mg ? ' active' : ''}`} onClick={() => setMuscleGroup(mg === muscleGroup ? '' : mg)}>
                <span className="group-dot" style={{ background: groupColor(mg) }} />
                {mg} <span>{groupCounts[mg]}</span>
              </button>
            ))}
          </div>

          <div className="ex-list">
            {isLoading ? (
              <Loader inline />
            ) : exercises.length === 0 ? (
              <EmptyState icon="ti-filter-off" title="Sin resultados">Prueba con otra búsqueda o quita filtros</EmptyState>
            ) : grouped.map(([group, list]) => (
              <div key={group}>
                <div className="ex-group-header">
                  <span className="group-dot" style={{ background: groupColor(group) }} />
                  {group}
                  <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{list.length}</span>
                </div>
                {list.map(ex => (
                  <button
                    key={ex.id}
                    className={`ex-row${ex.id === selectedId ? ' active' : ''}`}
                    onClick={() => setSelectedId(ex.id)}
                  >
                    <span className="ex-row-bar" style={{ background: groupColor(ex.muscleGroup) }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="ex-row-name">{ex.name}</span>
                      <span className="ex-row-meta">
                        {musclesFor(ex).primary.map(m => MUSCLE_LABEL[m]).join(' · ')}
                        {ex.equipment ? ` — ${ex.equipment}` : ''}
                      </span>
                    </span>
                    <i className="ti ti-chevron-right" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* FICHA / MAPA */}
        <aside className={`card ex-detail-panel${selected ? ' open' : ''}`}>
          {selected ? (
            <ExerciseDetail
              exercise={selected}
              related={related}
              canManage={canManage}
              onSelect={setSelectedId}
              onClose={() => setSelectedId(null)}
              onEdit={() => setForm({ editing: selected })}
              onDelete={() => {
                if (confirm(`¿Eliminar "${selected.name}" del catálogo?`)) {
                  deleteExercise.mutate(selected.id, { onSuccess: () => setSelectedId(null) })
                }
              }}
            />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h2 className="section-title" style={{ justifyContent: 'center' }}>
                <i className="ti ti-hand-finger" aria-hidden="true" /> Elige un músculo
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Toca una zona del cuerpo para ver sus ejercicios, o abre uno de la lista para ver su ficha.
              </p>
              <BodyMap
                primary={mapHighlight}
                onSelect={m => setMuscleGroup(g => (g === MUSCLE_TO_GROUP[m] ? '' : MUSCLE_TO_GROUP[m]))}
                height={380}
              />
              {muscleGroup && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: '10px' }} onClick={() => setMuscleGroup('')}>
                  <i className="ti ti-x" aria-hidden="true" /> Quitar filtro: {muscleGroup}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>

      {form && (
        <ExerciseFormModal
          key={form.editing?.id ?? 'new'}
          title={form.editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
          groups={muscleGroups}
          initial={form.editing
            ? { name: form.editing.name, description: form.editing.description ?? '', muscleGroup: form.editing.muscleGroup, equipment: form.editing.equipment ?? '', videoUrl: form.editing.videoUrl ?? '' }
            : emptyForm}
          submitting={createExercise.isPending || updateExercise.isPending}
          onClose={() => setForm(null)}
          onSubmit={data => {
            if (form.editing) {
              updateExercise.mutate({ id: form.editing.id, ...data }, { onSuccess: () => setForm(null) })
            } else {
              createExercise.mutate(data, { onSuccess: created => { setForm(null); setSelectedId(created.id) } })
            }
          }}
        />
      )}
    </div>
  )
}
