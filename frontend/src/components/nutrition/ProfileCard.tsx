import { useState } from 'react'
import {
  useNutritionProfile, useSaveNutritionProfile,
} from '../../hooks/useNutrition'
import type { ActivityLevel, NutritionGoal, NutritionProfileInput, NutritionProfileResponse, Sex } from '../../hooks/useNutrition'
import {
  ACTIVITY_LABEL, GOAL_LABEL, cardStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle,
} from './shared'

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }

function toForm(data: NutritionProfileResponse | undefined): NutritionProfileInput {
  const p = data?.profile
  return {
    sex: p?.sex ?? 'MALE',
    birthDate: p?.birthDate ? p.birthDate.slice(0, 10) : '',
    heightCm: p?.heightCm ?? 175,
    weightKg: p?.weightKg ?? data?.weightKg ?? undefined,
    activityLevel: p?.activityLevel ?? 'MODERATE',
    goal: p?.goal ?? 'GAIN_MUSCLE',
  }
}

function ProfileForm({ data, onDone }: { data: NutritionProfileResponse | undefined; onDone: () => void }) {
  const [form, setForm] = useState<NutritionProfileInput>(() => toForm(data))
  const save = useSaveNutritionProfile()
  const weightFromRevision = data?.weightSource === 'revision'

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        save.mutate(
          { ...form, weightKg: weightFromRevision ? undefined : form.weightKg },
          { onSuccess: onDone },
        )
      }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginTop: '1rem' }}
    >
      <label style={labelStyle}>
        Sexo
        <select value={form.sex} onChange={e => setForm(f => ({ ...f, sex: e.target.value as Sex }))} style={inputStyle}>
          <option value="MALE">Hombre</option>
          <option value="FEMALE">Mujer</option>
        </select>
      </label>
      <label style={labelStyle}>
        Fecha de nacimiento
        <input type="date" required value={form.birthDate}
          onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Altura (cm)
        <input type="number" required min={120} max={230} value={form.heightCm}
          onChange={e => setForm(f => ({ ...f, heightCm: Number(e.target.value) }))} style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Peso (kg)
        {weightFromRevision ? (
          <span style={{ ...inputStyle, color: 'var(--text-secondary)' }}>
            {data?.weightKg} kg · de tu última revisión
          </span>
        ) : (
          <input type="number" required min={30} max={300} step="0.1" value={form.weightKg ?? ''}
            onChange={e => setForm(f => ({ ...f, weightKg: Number(e.target.value) }))} style={inputStyle} />
        )}
      </label>
      <label style={labelStyle}>
        Actividad
        <select value={form.activityLevel}
          onChange={e => setForm(f => ({ ...f, activityLevel: e.target.value as ActivityLevel }))} style={inputStyle}>
          {Object.entries(ACTIVITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label style={labelStyle}>
        Objetivo
        <select value={form.goal}
          onChange={e => setForm(f => ({ ...f, goal: e.target.value as NutritionGoal }))} style={inputStyle}>
          {Object.entries(GOAL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1', alignItems: 'center' }}>
        <button type="submit" disabled={save.isPending} style={primaryButtonStyle}>
          {save.isPending ? 'Calculando...' : 'Calcular mis objetivos'}
        </button>
        {data?.profile && (
          <button type="button" onClick={onDone} style={secondaryButtonStyle}>Cancelar</button>
        )}
        {save.isError && <span style={{ fontSize: '12px', color: '#E24B4A' }}>No se pudo guardar. Revisa los datos.</span>}
      </div>
    </form>
  )
}

export default function ProfileCard() {
  const { data, isLoading } = useNutritionProfile()
  const [editing, setEditing] = useState(false)

  if (isLoading) return <div style={{ ...cardStyle, color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando...</div>

  const targets = data?.targets
  const showForm = editing || !data?.profile

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Mis objetivos diarios</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {data?.profile
              ? `${GOAL_LABEL[data.profile.goal]} · gasto estimado ${targets?.tdee ?? '—'} kcal/día`
              : 'Rellena tus datos y calculamos tus calorías y macros según tu objetivo'}
          </div>
        </div>
        {data?.profile && !editing && (
          <button onClick={() => setEditing(true)} style={secondaryButtonStyle}>
            <i className="ti ti-pencil" style={{ marginRight: '6px' }} aria-hidden="true" />
            Editar datos
          </button>
        )}
      </div>

      {targets && !showForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginTop: '1rem' }}>
          {[
            { label: 'Calorías', value: `${targets.kcal}`, unit: 'kcal' },
            { label: 'Proteína', value: `${targets.protein}`, unit: 'g' },
            { label: 'Hidratos', value: `${targets.carbs}`, unit: 'g' },
            { label: 'Grasa', value: `${targets.fat}`, unit: 'g' },
          ].map(t => (
            <div key={t.label} style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t.value} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>{t.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.profile && !targets && !showForm && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '1rem' }}>
          Falta tu peso para calcular los objetivos: añade una revisión corporal o indícalo en tus datos.
        </div>
      )}

      {showForm && <ProfileForm data={data} onDone={() => setEditing(false)} />}
    </div>
  )
}
