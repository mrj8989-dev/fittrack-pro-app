import { useState } from 'react'
import {
  useAddMeal, useAddMealItem, useCreateMealPlan, useDeleteMealPlan, useFoods, useRemoveMeal, useRemoveMealItem,
  useRenameMeal, useRenameMealPlan, useScaleMealPlan, useSwapMealItem, useSwapOptions, useUpdateMealItem,
} from '../../hooks/useNutrition'
import type { Macros, Meal, MealItem, MealPlan } from '../../hooks/useNutrition'
import {
  DAY_LABEL, DAY_SHORT, FOOD_GROUPS, FOOD_GROUP_LABEL, MACRO_META, cardStyle, formatMacros,
  iconButtonStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle, unitsHint,
} from './shared'
import { MacroBar } from './MacroBar'

// Lunes = 1 … Domingo = 7, igual que en el backend.
function todayDayOfWeek(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

/** Texto que se edita en el sitio: se muestra como texto y al pulsar el lápiz pasa a input. */
function InlineName({ value, onSave, style }: { value: string; onSave: (name: string) => void; style: React.CSSProperties }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
        <span style={style}>{value}</span>
        <button onClick={() => { setDraft(value); setEditing(true) }} style={{ ...iconButtonStyle, fontSize: '13px' }} title="Renombrar">
          <i className="ti ti-pencil" aria-hidden="true" />
        </button>
      </span>
    )
  }

  const save = () => {
    const name = draft.trim()
    if (name.length >= 2 && name !== value) onSave(name)
    setEditing(false)
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') setEditing(false)
      }}
      aria-label="Nombre"
      style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px' }}
    />
  )
}

function SwapPanel({ planId, item, onClose }: { planId: string; item: MealItem; onClose: () => void }) {
  const { data: options = [], isLoading } = useSwapOptions(planId, item.id)
  const swap = useSwapMealItem()

  return (
    <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '10px', margin: '4px 0 8px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Cambiar <strong>{item.food.name}</strong> ({item.grams} g) por otro alimento de {FOOD_GROUP_LABEL[item.food.group].toLowerCase()} que aporte lo mismo:
      </div>
      {isLoading ? (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Calculando equivalencias...</div>
      ) : options.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No hay otros alimentos de este grupo.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {options.map(o => (
            <button
              key={o.food.id}
              disabled={swap.isPending}
              onClick={() => swap.mutate({ planId, itemId: item.id, foodId: o.food.id }, { onSuccess: onClose })}
              title={formatMacros(o.macros)}
              style={{
                ...secondaryButtonStyle, padding: '6px 10px', fontSize: '12px',
                color: 'var(--text-primary)', background: 'var(--bg-secondary)',
              }}
            >
              {o.food.name} · <strong>{o.grams} g</strong>
            </button>
          ))}
        </div>
      )}
      <button onClick={onClose} style={{ ...iconButtonStyle, fontSize: '12px', marginTop: '8px' }}>Cerrar</button>
    </div>
  )
}

/**
 * - edit: todo (gramos, intercambiar, quitar, comidas) — entrenador y admin.
 * - swap: solo intercambiar alimentos por equivalentes — el cliente en su menú.
 * - view: solo lectura.
 */
type EditMode = 'edit' | 'swap' | 'view'

function ItemRow({ planId, item, mode }: { planId: string; item: MealItem; mode: EditMode }) {
  // Borrador solo mientras se escribe; si no, se muestran los gramos del servidor
  // (que cambian al intercambiar o reescalar el menú).
  const [draft, setDraft] = useState<string | null>(null)
  const grams = draft ?? String(item.grams)
  const [swapping, setSwapping] = useState(false)
  const update = useUpdateMealItem()
  const remove = useRemoveMealItem()

  const commit = () => {
    const value = Number(grams)
    setDraft(null)
    if (value >= 1 && value !== item.grams) update.mutate({ planId, itemId: item.id, grams: value })
  }

  const hint = unitsHint(item.grams, item.food.gramsPerUnit, item.food.unitName)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.food.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {formatMacros(item.macros)}{hint ? ` · ${hint}` : ''}
          </div>
        </div>
        {mode !== 'edit' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.grams} g</span>
            {mode === 'swap' && (
              <button onClick={() => setSwapping(s => !s)} style={iconButtonStyle} title="Cambiar por otro alimento equivalente">
                <i className="ti ti-arrows-exchange" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min={1}
                value={grams}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                aria-label={`Gramos de ${item.food.name}`}
                style={{ ...inputStyle, width: '76px', padding: '6px 8px', textAlign: 'right' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>g</span>
            </div>
            <div style={{ display: 'flex' }}>
              <button onClick={() => setSwapping(s => !s)} style={iconButtonStyle} title="Cambiar por otro alimento equivalente">
                <i className="ti ti-arrows-exchange" aria-hidden="true" />
              </button>
              <button
                onClick={() => remove.mutate({ planId, itemId: item.id })}
                disabled={remove.isPending}
                style={iconButtonStyle}
                title="Quitar"
              >
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>
      {swapping && <SwapPanel planId={planId} item={item} onClose={() => setSwapping(false)} />}
    </>
  )
}

function AddItemRow({ planId, meal }: { planId: string; meal: Meal }) {
  const { data: foods = [] } = useFoods()
  const [open, setOpen] = useState(false)
  const [foodId, setFoodId] = useState('')
  const [grams, setGrams] = useState('100')
  const add = useAddMealItem()

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ ...iconButtonStyle, fontSize: '12px', color: 'var(--accent-primary)', marginTop: '6px' }}>
        <i className="ti ti-plus" style={{ marginRight: '4px' }} aria-hidden="true" />
        Añadir alimento
      </button>
    )
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (!foodId) return
        add.mutate(
          { planId, mealId: meal.id, foodId, grams: Number(grams) },
          { onSuccess: () => { setOpen(false); setFoodId(''); setGrams('100') } },
        )
      }}
      style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}
    >
      <select value={foodId} onChange={e => setFoodId(e.target.value)} required style={{ ...inputStyle, flex: '1 1 180px', padding: '6px 8px' }}>
        <option value="">Elige un alimento…</option>
        {FOOD_GROUPS.map(group => {
          const list = foods.filter(f => f.group === group)
          if (!list.length) return null
          return (
            <optgroup key={group} label={FOOD_GROUP_LABEL[group]}>
              {list.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </optgroup>
          )
        })}
      </select>
      <input type="number" min={1} value={grams} onChange={e => setGrams(e.target.value)} required
        aria-label="Gramos" style={{ ...inputStyle, width: '76px', padding: '6px 8px' }} />
      <button type="submit" disabled={add.isPending} style={{ ...primaryButtonStyle, padding: '6px 12px' }}>Añadir</button>
      <button type="button" onClick={() => setOpen(false)} style={{ ...secondaryButtonStyle, padding: '6px 12px' }}>Cancelar</button>
    </form>
  )
}

function MealCard({ planId, meal, mode }: { planId: string; meal: Meal; mode: EditMode }) {
  const readOnly = mode !== 'edit'
  const renameMeal = useRenameMeal()
  const removeMeal = useRemoveMeal()
  const nameStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }

  return (
    <div style={{ ...cardStyle, padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
        {readOnly ? (
          <span style={nameStyle}>{meal.name}</span>
        ) : (
          <InlineName value={meal.name} style={nameStyle}
            onSave={name => renameMeal.mutate({ planId, mealId: meal.id, name })} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatMacros(meal.totals)}</span>
          {!readOnly && (
            <button
              onClick={() => {
                if (!meal.items.length || confirm(`¿Eliminar "${meal.name}" y sus ${meal.items.length} alimentos?`)) {
                  removeMeal.mutate({ planId, mealId: meal.id })
                }
              }}
              style={{ ...iconButtonStyle, fontSize: '14px' }}
              title="Eliminar comida"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {meal.items.length === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '6px 0' }}>Sin alimentos</div>
      )}
      {meal.items.map(item => <ItemRow key={item.id} planId={planId} item={item} mode={mode} />)}
      {!readOnly && <AddItemRow planId={planId} meal={meal} />}
    </div>
  )
}

function AddMealRow({ planId, dayOfWeek }: { planId: string; dayOfWeek: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const addMeal = useAddMeal()

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ ...secondaryButtonStyle, alignSelf: 'flex-start' }}>
        <i className="ti ti-plus" style={{ marginRight: '6px' }} aria-hidden="true" />
        Añadir comida al {DAY_LABEL[dayOfWeek - 1].toLowerCase()}
      </button>
    )
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        addMeal.mutate({ planId, dayOfWeek, name: name.trim() }, { onSuccess: () => { setOpen(false); setName('') } })
      }}
      style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
    >
      <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Pre-entreno" required minLength={2}
        aria-label="Nombre de la comida" style={{ ...inputStyle, flex: '1 1 180px' }} />
      <button type="submit" disabled={addMeal.isPending} style={primaryButtonStyle}>Añadir</button>
      <button type="button" onClick={() => setOpen(false)} style={secondaryButtonStyle}>Cancelar</button>
    </form>
  )
}

export default function MealPlanEditor({ plan, targets, onDeleted, onDuplicated, extra }: {
  plan: MealPlan
  targets?: Macros
  onDeleted?: () => void
  /** Si se indica, se ofrece duplicar el menú (solo entrenador y admin crean menús). */
  onDuplicated?: (copy: MealPlan) => void
  /** Contenido adicional bajo la cabecera (p. ej. el panel de asignar a un cliente). */
  extra?: React.ReactNode
}) {
  const mode: EditMode = plan.canEdit ? 'edit' : plan.canSwap ? 'swap' : 'view'
  const readOnly = mode !== 'edit'
  const [day, setDay] = useState(todayDayOfWeek)
  // Por defecto se propone el objetivo de kcal; el usuario puede escribir otra cifra.
  const [scaleDraft, setScaleKcal] = useState<string | null>(null)
  const scaleKcal = scaleDraft ?? String(targets?.kcal ?? plan.dailyAverage.kcal)
  const scale = useScaleMealPlan()
  const rename = useRenameMealPlan()
  const duplicate = useCreateMealPlan()
  const deletePlan = useDeleteMealPlan()

  const current = plan.days.find(d => d.dayOfWeek === day) ?? plan.days[0]
  const titleStyle: React.CSSProperties = { fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            {readOnly ? (
              <div style={titleStyle}>{plan.name}</div>
            ) : (
              <InlineName value={plan.name} style={titleStyle} onSave={name => rename.mutate({ planId: plan.id, name })} />
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Media diaria: {formatMacros(plan.dailyAverage)}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {plan.assignedBy && <Badge icon="ti-user-check">Asignado por {plan.assignedBy.name}</Badge>}
              {plan.isGlobal && <Badge icon="ti-world">Plantilla del catálogo</Badge>}
              {mode === 'swap' && <Badge icon="ti-arrows-exchange">Puedes cambiar alimentos por otros equivalentes</Badge>}
              {mode === 'view' && <Badge icon="ti-lock">Solo lectura: duplícala para modificarla</Badge>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onDuplicated && (
              <button
                onClick={() => duplicate.mutate({ sourceId: plan.id }, { onSuccess: onDuplicated })}
                disabled={duplicate.isPending}
                style={secondaryButtonStyle}
                title="Crear una plantilla editable a partir de este menú"
              >
                <i className="ti ti-copy" style={{ marginRight: '6px' }} aria-hidden="true" />
                Duplicar
              </button>
            )}
            {!readOnly && onDeleted && (
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${plan.name}"?`)) deletePlan.mutate(plan.id, { onSuccess: onDeleted })
                }}
                style={secondaryButtonStyle}
                title="Eliminar menú"
              >
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {!readOnly && (
          <form
            onSubmit={e => { e.preventDefault(); scale.mutate({ planId: plan.id, targetKcal: Number(scaleKcal) }) }}
            style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ajustar todos los días a</span>
            <input type="number" min={1000} max={6000} step={50} value={scaleKcal} onChange={e => setScaleKcal(e.target.value)}
              aria-label="Calorías objetivo" style={{ ...inputStyle, width: '96px', padding: '6px 8px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>kcal</span>
            <button type="submit" disabled={scale.isPending} style={{ ...primaryButtonStyle, padding: '6px 12px' }}>
              {scale.isPending ? 'Ajustando...' : 'Ajustar cantidades'}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>La verdura no se toca.</span>
          </form>
        )}

        {extra}
      </div>

      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }} role="tablist" aria-label="Día de la semana">
        {plan.days.map(d => (
          <button
            key={d.dayOfWeek}
            role="tab"
            aria-selected={d.dayOfWeek === day}
            onClick={() => setDay(d.dayOfWeek)}
            title={DAY_LABEL[d.dayOfWeek - 1]}
            style={{
              flex: '1 0 44px', padding: '8px 0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
              border: '0.5px solid var(--border)',
              background: d.dayOfWeek === day ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: d.dayOfWeek === day ? '#fff' : 'var(--text-secondary)',
              fontWeight: d.dayOfWeek === day ? 500 : 400,
            }}
          >
            {DAY_SHORT[d.dayOfWeek - 1]}
          </button>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px' }}>
          {DAY_LABEL[current.dayOfWeek - 1]}{targets ? ' frente al objetivo' : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {MACRO_META.map(m => (
            <MacroBar key={m.key} label={m.label} unit={m.unit} value={current.totals[m.key]} target={targets?.[m.key]} />
          ))}
        </div>
      </div>

      {current.meals.map(meal => <MealCard key={meal.id} planId={plan.id} meal={meal} mode={mode} />)}
      {!readOnly && <AddMealRow planId={plan.id} dayOfWeek={current.dayOfWeek} />}
    </div>
  )
}

function Badge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px',
      borderRadius: '20px', border: '0.5px solid var(--border)', color: 'var(--text-secondary)',
    }}>
      <i className={`ti ${icon}`} aria-hidden="true" />
      {children}
    </span>
  )
}
