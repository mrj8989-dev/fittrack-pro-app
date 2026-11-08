import { useState } from 'react'
import { useAiSettings, useClearAiApiKey, useSetAiApiKey, useUpdateAiSettings } from '../hooks/useAiSettings'
import type { AiDetail, AiSettings, AiSettingsPatch, AiTone } from '../hooks/useAiSettings'
import { apiErrorMessage } from '../lib/apiError'

const TONES: { id: AiTone; label: string }[] = [
  { id: 'friendly', label: 'Cercano' },
  { id: 'technical', label: 'Técnico' },
  { id: 'motivational', label: 'Motivador' },
]
const DETAILS: { id: AiDetail; label: string }[] = [
  { id: 'brief', label: 'Breve' },
  { id: 'detailed', label: 'Detallado' },
]
const SHARES: { key: 'shareTraining' | 'shareSessions' | 'shareRevisions' | 'shareNutrition'; label: string }[] = [
  { key: 'shareTraining', label: 'Plan de entrenamiento' },
  { key: 'shareSessions', label: 'Últimas sesiones' },
  { key: 'shareRevisions', label: 'Peso y medidas' },
  { key: 'shareNutrition', label: 'Objetivos de nutrición' },
]

/**
 * Configuración del asistente IA. Sin `userId` edita la del usuario actual (Ajustes);
 * con `userId` la de otro usuario desde el panel de admin, que además puede fijar el límite diario.
 */
export default function AiSettingsForm({ userId }: { userId?: string }) {
  const { data } = useAiSettings(userId)
  if (!data) return <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando…</div>
  // El estado del formulario se inicia una vez por usuario; la parte de la clave lee siempre `data`.
  return <Form key={userId ?? 'me'} initial={data} userId={userId} />
}

function Form({ initial, userId }: { initial: AiSettings; userId?: string }) {
  const isAdmin = !!userId
  const update = useUpdateAiSettings(userId)
  const setKey = useSetAiApiKey(userId)
  const clearKey = useClearAiApiKey(userId)
  const [form, setForm] = useState<AiSettingsPatch>({
    tone: initial.tone,
    detail: initial.detail,
    goal: initial.goal ?? '',
    limitations: initial.limitations ?? '',
    shareTraining: initial.shareTraining,
    shareSessions: initial.shareSessions,
    shareRevisions: initial.shareRevisions,
    shareNutrition: initial.shareNutrition,
    dailyLimit: initial.dailyLimit,
  })
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const set = <K extends keyof AiSettingsPatch>(k: K, v: AiSettingsPatch[K]) => { setSaved(false); setForm(f => ({ ...f, [k]: v })) }

  // stopPropagation: este formulario puede ir dentro de otro (la ficha de usuario del admin) y
  // en React el submit sube por el árbol de componentes aunque esté en otra ventana.
  function save(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const { dailyLimit, ...rest } = form
    update.mutate(isAdmin ? { ...rest, dailyLimit } : rest, { onSuccess: () => setSaved(true) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <span className="label">Tono</span>
            <div className="segmented">
              {TONES.map(t => (
                <button key={t.id} type="button" className={form.tone === t.id ? 'active' : ''} onClick={() => set('tone', t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Respuestas</span>
            <div className="segmented">
              {DETAILS.map(d => (
                <button key={d.id} type="button" className={form.detail === d.id ? 'active' : ''} onClick={() => set('detail', d.id)}>{d.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ai-goal">Objetivo personal</label>
          <input id="ai-goal" className="input" maxLength={300} value={form.goal ?? ''} onChange={e => set('goal', e.target.value)} placeholder="Ej.: ganar fuerza en los básicos y bajar un poco de grasa" />
        </div>
        <div>
          <label className="label" htmlFor="ai-limits">Lesiones o limitaciones a tener en cuenta</label>
          <textarea id="ai-limits" className="input" rows={2} maxLength={500} value={form.limitations ?? ''} onChange={e => set('limitations', e.target.value)} placeholder="Ej.: molestias en el hombro derecho al hacer press" />
        </div>

        <div>
          <span className="label">Datos que puede usar el asistente</span>
          <div className="ai-shares">
            {SHARES.map(s => (
              <label key={s.key} className="check" style={{ marginTop: 0 }}>
                <input type="checkbox" checked={!!form[s.key]} onChange={e => set(s.key, e.target.checked)} />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div>
            <label className="label" htmlFor="ai-limit">Límite diario de mensajes</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                id="ai-limit"
                className="input"
                type="number"
                min={0}
                max={1000}
                style={{ width: '110px' }}
                value={form.dailyLimit ?? ''}
                onChange={e => set('dailyLimit', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="Plan"
              />
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Vacío = el de su plan (sin límite si usa su propia clave). 0 = sin mensajes.
              </span>
            </div>
          </div>
        )}

        {update.isError && <div className="alert alert-danger"><i className="ti ti-alert-circle" aria-hidden="true" /> {apiErrorMessage(update.error)}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={update.isPending}>
            <i className="ti ti-device-floppy" aria-hidden="true" /> {update.isPending ? 'Guardando…' : 'Guardar preferencias'}
          </button>
          {saved && <span style={{ fontSize: '12px', color: 'var(--accent-primary)' }}><i className="ti ti-check" aria-hidden="true" /> Guardado</span>}
        </div>
      </form>

      <div className="inset" style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Clave de API propia (opcional)</div>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 10px' }}>
          {isAdmin ? 'Con una clave propia, el consumo va a su cuenta de Anthropic' : 'Con tu propia clave, el consumo va a tu cuenta de Anthropic'} y no se aplica el límite del plan. Se guarda cifrada y no vuelve a mostrarse.
        </p>
        {initial.hasOwnApiKey ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-accent"><i className="ti ti-key" aria-hidden="true" /> ····{initial.apiKeyLast4}</span>
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} disabled={clearKey.isPending} onClick={() => clearKey.mutate()}>
              <i className="ti ti-trash" aria-hidden="true" /> Quitar clave
            </button>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); e.stopPropagation(); setKey.mutate(apiKey, { onSuccess: () => setApiKey('') }) }} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              className="input"
              type="password"
              autoComplete="off"
              style={{ flex: '1 1 240px' }}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              aria-label="Clave de API de Anthropic"
            />
            <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '40px' }} disabled={apiKey.trim().length < 20 || setKey.isPending}>
              {setKey.isPending ? 'Comprobando…' : 'Guardar clave'}
            </button>
          </form>
        )}
        {(setKey.isError || clearKey.isError) && (
          <p className="field-error">{apiErrorMessage(setKey.error ?? clearKey.error)}</p>
        )}
      </div>
    </div>
  )
}
