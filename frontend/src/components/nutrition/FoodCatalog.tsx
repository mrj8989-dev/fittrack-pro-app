import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCreateFood, useDeleteFood, useFoods, useUpdateFood } from '../../hooks/useNutrition'
import type { Food, FoodGroup, FoodInput } from '../../hooks/useNutrition'
import {
  FOOD_GROUPS, FOOD_GROUP_LABEL, cardStyle, iconButtonStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle,
} from './shared'

type FormState = Record<'name' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'gramsPerUnit', string> & { group: FoodGroup }

const emptyForm: FormState = { name: '', group: 'PROTEIN', kcal: '', protein: '', carbs: '', fat: '', gramsPerUnit: '' }

const toForm = (f: Food): FormState => ({
  name: f.name,
  group: f.group,
  kcal: String(f.kcal),
  protein: String(f.protein),
  carbs: String(f.carbs),
  fat: String(f.fat),
  gramsPerUnit: f.gramsPerUnit ? String(f.gramsPerUnit) : '',
})

function FoodForm({ initial, submitting, onSubmit, onCancel }: {
  initial: FormState
  submitting: boolean
  onSubmit: (data: FoodInput) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  // Aviso si las kcal no cuadran con los macros (4/4/9 kcal por gramo), típico error al copiar etiquetas.
  const computedKcal = Number(form.protein) * 4 + Number(form.carbs) * 4 + Number(form.fat) * 9
  const kcalMismatch = form.kcal !== '' && computedKcal > 0 && Math.abs(computedKcal - Number(form.kcal)) > Number(form.kcal) * 0.15

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onSubmit({
          name: form.name.trim(),
          group: form.group,
          kcal: Number(form.kcal),
          protein: Number(form.protein),
          carbs: Number(form.carbs),
          fat: Number(form.fat),
          ...(form.gramsPerUnit && { unitName: 'unidad', gramsPerUnit: Number(form.gramsPerUnit) }),
        })
      }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', padding: '10px 0' }}
    >
      <input value={form.name} onChange={set('name')} placeholder="Nombre *" required minLength={2}
        aria-label="Nombre" style={{ ...inputStyle, gridColumn: 'span 2' }} />
      <select value={form.group} onChange={set('group')} aria-label="Grupo" style={inputStyle}>
        {FOOD_GROUPS.map(g => <option key={g} value={g}>{FOOD_GROUP_LABEL[g]}</option>)}
      </select>
      <input type="number" step="0.1" min={0} value={form.kcal} onChange={set('kcal')} placeholder="kcal *" required aria-label="kcal por 100 g" style={inputStyle} />
      <input type="number" step="0.1" min={0} value={form.protein} onChange={set('protein')} placeholder="Proteína g *" required aria-label="Proteína por 100 g" style={inputStyle} />
      <input type="number" step="0.1" min={0} value={form.carbs} onChange={set('carbs')} placeholder="Hidratos g *" required aria-label="Hidratos por 100 g" style={inputStyle} />
      <input type="number" step="0.1" min={0} value={form.fat} onChange={set('fat')} placeholder="Grasa g *" required aria-label="Grasa por 100 g" style={inputStyle} />
      <input type="number" step="1" min={1} value={form.gramsPerUnit} onChange={set('gramsPerUnit')} placeholder="g por unidad" aria-label="Gramos por unidad" style={inputStyle} />
      {kcalMismatch && (
        <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: 'var(--warning)' }}>
          Con esos macros salen unas {Math.round(computedKcal)} kcal. Revisa que todo sea por 100 g.
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
        <button type="submit" disabled={submitting} style={primaryButtonStyle}>Guardar</button>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>Cancelar</button>
      </div>
    </form>
  )
}

/** Catálogo común de alimentos. Lo amplían entrenadores y admin; los clientes solo lo usan. */
export default function FoodCatalog() {
  const { user } = useAuth()
  const { data: foods = [] } = useFoods()
  const createFood = useCreateFood()
  const updateFood = useUpdateFood()
  const deleteFood = useDeleteFood()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<FoodGroup | ''>('')

  const canEdit = (f: Food) => user?.role === 'ADMIN' || f.createdById === user?.id
  const term = search.trim().toLowerCase()
  const visible = foods.filter(f => (!group || f.group === group) && (!term || f.name.toLowerCase().includes(term)))

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Catálogo de alimentos</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {foods.length} alimentos, valores por 100 g en crudo. Lo que añadas aquí lo podrán usar todos los usuarios en sus menús.
          </div>
        </div>
        {!creating && (
          <button onClick={() => { setCreating(true); setEditingId(null) }} style={primaryButtonStyle}>
            <i className="ti ti-plus" style={{ marginRight: '6px' }} aria-hidden="true" />
            Nuevo alimento
          </button>
        )}
      </div>

      {creating && (
        <FoodForm
          initial={emptyForm}
          submitting={createFood.isPending}
          onCancel={() => setCreating(false)}
          onSubmit={data => createFood.mutate(data, { onSuccess: () => setCreating(false) })}
        />
      )}

      <div style={{ display: 'flex', gap: '8px', margin: '1rem 0 6px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar alimento…"
          aria-label="Buscar alimento" style={{ ...inputStyle, flex: '1 1 200px' }} />
        <select value={group} onChange={e => setGroup(e.target.value as FoodGroup | '')} aria-label="Grupo" style={inputStyle}>
          <option value="">Todos los grupos</option>
          {FOOD_GROUPS.map(g => <option key={g} value={g}>{FOOD_GROUP_LABEL[g]}</option>)}
        </select>
      </div>

      {deleteFood.isError && (
        <div style={{ fontSize: '12px', color: 'var(--danger)', margin: '6px 0' }}>
          No se puede borrar: el alimento se usa en algún menú.
        </div>
      )}

      <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {visible.map(f => editingId === f.id ? (
          <FoodForm
            key={f.id}
            initial={toForm(f)}
            submitting={updateFood.isPending}
            onCancel={() => setEditingId(null)}
            onSubmit={data => updateFood.mutate({ id: f.id, ...data }, { onSuccess: () => setEditingId(null) })}
          />
        ) : (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{f.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {FOOD_GROUP_LABEL[f.group]} · {f.kcal} kcal · P {f.protein} · H {f.carbs} · G {f.fat}
                {f.gramsPerUnit ? ` · ${f.gramsPerUnit} g/unidad` : ''}
              </div>
            </div>
            {canEdit(f) && (
              <div style={{ display: 'flex' }}>
                <button onClick={() => { setEditingId(f.id); setCreating(false) }} style={iconButtonStyle} title="Editar">
                  <i className="ti ti-pencil" aria-hidden="true" />
                </button>
                <button
                  onClick={() => { if (confirm(`¿Eliminar "${f.name}" del catálogo?`)) deleteFood.mutate(f.id) }}
                  style={iconButtonStyle}
                  title="Eliminar"
                >
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px 0' }}>Ningún alimento coincide con la búsqueda.</div>
        )}
      </div>
    </div>
  )
}
