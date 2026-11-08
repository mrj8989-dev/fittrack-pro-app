import { useMemo, useState } from 'react'
import type { Food, MealPlan } from '../../hooks/useNutrition'
import { Modal } from '../ui'
import { DAY_LABEL, DAY_SHORT, FOOD_GROUPS, FOOD_GROUP_LABEL, unitsHint } from './shared'

interface Line { food: Food; grams: number }

/** Suma los gramos de cada alimento en los días elegidos, agrupados por tipo de alimento. */
function buildList(plan: MealPlan, days: Set<number>) {
  const byFood = new Map<string, Line>()
  for (const day of plan.days) {
    if (!days.has(day.dayOfWeek)) continue
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const line = byFood.get(item.food.id)
        if (line) line.grams += item.grams
        else byFood.set(item.food.id, { food: item.food, grams: item.grams })
      }
    }
  }
  return FOOD_GROUPS
    .map(group => ({
      group,
      lines: [...byFood.values()]
        .filter(l => l.food.group === group)
        .sort((a, b) => a.food.name.localeCompare(b.food.name, 'es')),
    }))
    .filter(g => g.lines.length > 0)
}

/** 1250 g → "1,3 kg"; por debajo de un kilo, en gramos redondeados a 5. */
function formatQty(grams: number) {
  if (grams >= 1000) return `${(grams / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg`
  return `${Math.max(5, Math.round(grams / 5) * 5)} g`
}

export default function ShoppingList({ plan, onClose }: { plan: MealPlan; onClose: () => void }) {
  const [days, setDays] = useState<Set<number>>(() => new Set(plan.days.map(d => d.dayOfWeek)))
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const groups = useMemo(() => buildList(plan, days), [plan, days])
  const total = groups.reduce((n, g) => n + g.lines.length, 0)

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const asText = () => [
    `Lista de la compra — ${plan.name}`,
    `Días: ${days.size === 7 ? 'toda la semana' : [...days].sort().map(d => DAY_LABEL[d - 1]).join(', ')}`,
    ...groups.flatMap(g => [
      '',
      FOOD_GROUP_LABEL[g.group].toUpperCase(),
      ...g.lines.map(l => {
        const hint = unitsHint(l.grams, l.food.gramsPerUnit, l.food.unitName)
        return `- ${l.food.name}: ${formatQty(l.grams)}${hint ? ` (${hint})` : ''}`
      }),
    ]),
  ].join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(asText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal card" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Lista de la compra">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <span className="icon-tile lg"><i className="ti ti-shopping-cart" aria-hidden="true" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Lista de la compra</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{plan.name} · cantidades en crudo</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar"><i className="ti ti-x" style={{ fontSize: '18px' }} aria-hidden="true" /></button>
        </div>

        <span className="label">Días que vas a comprar</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {plan.days.map(d => (
            <button
              key={d.dayOfWeek}
              type="button"
              className={`chip${days.has(d.dayOfWeek) ? ' active' : ''}`}
              style={{ width: '38px', justifyContent: 'center', padding: 0 }}
              onClick={() => setDays(s => toggle(s, d.dayOfWeek))}
              title={DAY_LABEL[d.dayOfWeek - 1]}
              aria-pressed={days.has(d.dayOfWeek)}
            >
              {DAY_SHORT[d.dayOfWeek - 1]}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDays(new Set(plan.days.map(d => d.dayOfWeek)))}>
            Toda la semana
          </button>
        </div>

        <div style={{ marginTop: '6px' }}>
          {total === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '20px 0', textAlign: 'center' }}>
              Elige al menos un día con comidas.
            </p>
          ) : groups.map(g => (
            <div key={g.group} className="shopping-group">
              <h3>{FOOD_GROUP_LABEL[g.group]}</h3>
              {g.lines.map(l => {
                const hint = unitsHint(l.grams, l.food.gramsPerUnit, l.food.unitName)
                const done = checked.has(l.food.id)
                return (
                  <label key={l.food.id} className={`shopping-item${done ? ' done' : ''}`}>
                    <input type="checkbox" checked={done} onChange={() => setChecked(s => toggle(s, l.food.id))} />
                    <span className="shopping-name">{l.food.name}</span>
                    <span className="shopping-qty">{formatQty(l.grams)}{hint && <small>{hint}</small>}</span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {total} {total === 1 ? 'producto' : 'productos'}{checked.size ? ` · ${checked.size} en el carro` : ''}
          </span>
          <button type="button" className="btn btn-primary" onClick={copy} disabled={total === 0}>
            <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} aria-hidden="true" /> {copied ? 'Copiada' : 'Copiar lista'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
