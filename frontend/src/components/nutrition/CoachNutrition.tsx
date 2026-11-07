import { useState } from 'react'
import { useClients } from '../../hooks/useTrainerClients'
import {
  useAssignMealPlan, useClientMealPlans, useCreateMealPlan, useMealPlan, useMealTemplates, useNutritionProfile,
} from '../../hooks/useNutrition'
import type { MealPlan, MealPlanSummary } from '../../hooks/useNutrition'
import MealPlanEditor from './MealPlanEditor'
import FoodCatalog from './FoodCatalog'
import { cardStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle } from './shared'

type Tab = 'templates' | 'clients' | 'foods'

function PlanCard({ plan, selected, onClick }: { plan: MealPlanSummary; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', cursor: 'pointer', borderRadius: '10px', padding: '10px 12px',
      background: selected ? 'var(--bg-primary)' : 'var(--bg-secondary)',
      border: `1px solid ${selected ? 'var(--accent-primary)' : 'var(--border)'}`,
      display: 'flex', flexDirection: 'column', gap: '2px',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{plan.name}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
        {plan.dailyAverage.kcal} kcal/día · {plan.isTemplate ? (plan.isGlobal ? 'Catálogo' : 'Mía') : plan.assignedBy ? 'Asignado' : 'Creado por el cliente'}
      </span>
    </button>
  )
}

/** Panel del entrenador para asignar una copia del menú a uno de sus clientes. */
function AssignPanel({ plan }: { plan: MealPlan }) {
  const { data: clients = [] } = useClients()
  const [clientId, setClientId] = useState('')
  const [kcalDraft, setKcal] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const { data: clientProfile } = useNutritionProfile(clientId, !!clientId)
  const assign = useAssignMealPlan()

  // Se proponen las kcal objetivo del cliente (si tiene perfil nutricional) hasta que se escriba otra cifra.
  const kcal = kcalDraft ?? (clientProfile?.targets ? String(clientProfile.targets.kcal) : '')

  if (!clients.length) {
    return <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '12px' }}>Todavía no hay clientes a los que asignar menús.</div>
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        assign.mutate(
          { planId: plan.id, clientId, targetKcal: kcal ? Number(kcal) : undefined },
          { onSuccess: () => setAssignedTo(clients.find(c => c.id === clientId)?.name ?? null) },
        )
      }}
      style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}
    >
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Asignar a</span>
      <select value={clientId} onChange={e => { setClientId(e.target.value); setKcal(null); setAssignedTo(null) }} required
        aria-label="Cliente" style={{ ...inputStyle, padding: '6px 8px' }}>
        <option value="">Elige cliente…</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ajustado a</span>
      <input type="number" min={1000} max={6000} step={50} value={kcal} onChange={e => setKcal(e.target.value)}
        placeholder="sin ajustar" aria-label="Calorías" style={{ ...inputStyle, width: '110px', padding: '6px 8px' }} />
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>kcal</span>
      <button type="submit" disabled={assign.isPending || !clientId} style={{ ...primaryButtonStyle, padding: '6px 12px' }}>
        <i className="ti ti-send" style={{ marginRight: '6px' }} aria-hidden="true" />
        Asignar
      </button>
      {clientId && !clientProfile?.targets && (
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Este cliente aún no ha calculado sus objetivos.</span>
      )}
      {assignedTo && <span style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>✓ Asignado a {assignedTo}</span>}
      {assign.isError && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>No se pudo asignar.</span>}
    </form>
  )
}

function NewTemplateForm({ onCreated, onCancel }: { onCreated: (plan: MealPlan) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const create = useCreateMealPlan()
  return (
    <form
      onSubmit={e => { e.preventDefault(); create.mutate({ name: name.trim() }, { onSuccess: onCreated }) }}
      style={{ ...cardStyle, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
    >
      <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la plantilla" required minLength={2}
        aria-label="Nombre de la plantilla" style={{ ...inputStyle, flex: '1 1 220px' }} />
      <button type="submit" disabled={create.isPending} style={primaryButtonStyle}>Crear vacía</button>
      <button type="button" onClick={onCancel} style={secondaryButtonStyle}>Cancelar</button>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexBasis: '100%' }}>
        Para partir de una existente, ábrela y pulsa «Duplicar».
      </span>
    </form>
  )
}

export default function CoachNutrition({ isTrainer }: { isTrainer: boolean }) {
  const [tab, setTab] = useState<Tab>('templates')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [clientId, setClientId] = useState('')

  const { data: templates = [] } = useMealTemplates()
  const { data: clients = [] } = useClients()
  const { data: clientPlans = [] } = useClientMealPlans(clientId, !!clientId)
  const { data: clientProfile } = useNutritionProfile(clientId, !!clientId)
  const { data: plan } = useMealPlan(selectedId ?? undefined)

  const list = tab === 'templates' ? templates : tab === 'clients' ? clientPlans : []
  const showEditor = plan && list.some(p => p.id === plan.id)

  const openCopy = (copy: MealPlan) => {
    // Lo que duplica un entrenador o admin siempre es una plantilla suya.
    setTab('templates')
    setSelectedId(copy.id)
  }

  const tabs: [Tab, string][] = [
    ['templates', 'Plantillas'],
    ['clients', isTrainer ? 'Menús de mis clientes' : 'Menús de clientes'],
    ['foods', 'Alimentos'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key}
            onClick={() => { setTab(key); setSelectedId(null); setCreating(false) }}
            style={tab === key ? primaryButtonStyle : secondaryButtonStyle}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'foods' && <FoodCatalog />}

      {tab === 'clients' && (
        <select value={clientId} onChange={e => { setClientId(e.target.value); setSelectedId(null) }}
          aria-label="Cliente" style={{ ...inputStyle, alignSelf: 'flex-start' }}>
          <option value="">Elige un cliente…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {(tab === 'templates' || clientId) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {list.map(p => (
            <PlanCard key={p.id} plan={p} selected={p.id === selectedId} onClick={() => { setSelectedId(p.id); setCreating(false) }} />
          ))}
          {tab === 'templates' && !creating && (
            <button onClick={() => { setCreating(true); setSelectedId(null) }}
              style={{ ...secondaryButtonStyle, borderStyle: 'dashed', minHeight: '52px' }}>
              <i className="ti ti-plus" style={{ marginRight: '6px' }} aria-hidden="true" />
              Nueva plantilla
            </button>
          )}
          {tab === 'clients' && list.length === 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Este cliente aún no tiene menús. Asígnale uno desde «Plantillas».
            </div>
          )}
        </div>
      )}

      {creating && (
        <NewTemplateForm onCancel={() => setCreating(false)} onCreated={p => { setCreating(false); setSelectedId(p.id) }} />
      )}

      {showEditor && (
        <MealPlanEditor
          key={plan.id}
          plan={plan}
          targets={tab === 'clients' ? clientProfile?.targets ?? undefined : undefined}
          onDeleted={() => setSelectedId(null)}
          onDuplicated={openCopy}
          extra={plan.isTemplate ? <AssignPanel plan={plan} /> : undefined}
        />
      )}
    </div>
  )
}
