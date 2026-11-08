import { Modal } from '../ui'
import {
  MODULE_HINT, MODULE_LABEL, TOGGLEABLE_MODULES,
  useGlobalModules, useSetGlobalModule, useSetUserModule, useUserModules,
} from '../../hooks/useAccess'
import type { ToggleableModule } from '../../hooks/useAccess'
import { apiErrorMessage } from '../../lib/apiError'

function Switch({ checked, onChange, disabled, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

/** Interruptores generales: apagar un módulo lo oculta a todos menos a los admins. */
export function GlobalModulesModal({ onClose }: { onClose: () => void }) {
  const { data: modules } = useGlobalModules()
  const setModule = useSetGlobalModule()

  return (
    <Modal onClose={onClose}>
      <div className="modal card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Módulos">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <span className="icon-tile lg"><i className="ti ti-puzzle" aria-hidden="true" /></span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Módulos de la plataforma</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Un módulo apagado desaparece para clientes y entrenadores. Los datos se conservan.
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar"><i className="ti ti-x" style={{ fontSize: '18px' }} aria-hidden="true" /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TOGGLEABLE_MODULES.map(m => (
            <div key={m} className="inset module-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{MODULE_LABEL[m]}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{MODULE_HINT[m]}</div>
              </div>
              <span className={`badge ${modules?.[m] === false ? 'badge-danger' : 'badge-accent'}`}>
                {modules?.[m] === false ? 'Apagado' : 'Activo'}
              </span>
              <Switch
                label={MODULE_LABEL[m]}
                checked={modules?.[m] ?? true}
                disabled={!modules || setModule.isPending}
                onChange={enabled => setModule.mutate({ module: m, enabled })}
              />
            </div>
          ))}
        </div>
        {setModule.isError && (
          <div className="alert alert-danger" style={{ marginTop: '12px' }}>
            <i className="ti ti-alert-circle" aria-hidden="true" /> {apiErrorMessage(setModule.error)}
          </div>
        )}
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '14px' }}>
          <i className="ti ti-info-circle" aria-hidden="true" /> Para dar o quitar un módulo a una persona concreta, ábrela en la lista de usuarios.
        </p>
      </div>
    </Modal>
  )
}

type Choice = 'plan' | 'on' | 'off'
const choiceOf = (override: boolean | null): Choice => (override === null ? 'plan' : override ? 'on' : 'off')
const valueOf = (c: Choice): boolean | null => (c === 'plan' ? null : c === 'on')

/** Excepciones de un usuario: por defecto manda su plan; se puede forzar cada módulo. */
export function UserModulesSection({ userId, isClient }: { userId: string; isClient: boolean }) {
  const { data: modules, isLoading } = useUserModules(userId)
  const { data: globals } = useGlobalModules()
  const setModule = useSetUserModule(userId)

  return (
    <div style={{ marginTop: '14px' }}>
      <span className="label">Módulos</span>
      <div className="inset user-modules">
        {isLoading || !modules ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px 0' }}>Cargando…</div>
        ) : modules.map(m => {
          const choice = choiceOf(m.override)
          const globallyOff = globals?.[m.module as ToggleableModule] === false
          const defaultLabel = isClient ? (m.includedByPlan ? 'Plan ✓' : 'Plan ✗') : 'Por defecto'
          return (
            <div key={m.module} className="module-row compact">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: m.effective.enabled ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {MODULE_LABEL[m.module]}
                </div>
                {globallyOff && <div style={{ fontSize: '11px', color: 'var(--danger)' }}>Apagado en general</div>}
              </div>
              <div className="segmented" role="radiogroup" aria-label={MODULE_LABEL[m.module]}>
                {(['plan', 'on', 'off'] as Choice[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={choice === c}
                    className={choice === c ? 'active' : ''}
                    disabled={setModule.isPending}
                    onClick={() => choice !== c && setModule.mutate({ module: m.module, enabled: valueOf(c) })}
                    title={c === 'plan' ? 'Lo que diga su plan' : c === 'on' ? 'Forzar activado' : 'Forzar desactivado'}
                  >
                    {c === 'plan' ? defaultLabel : c === 'on' ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {setModule.isError && <p className="field-error">{apiErrorMessage(setModule.error)}</p>}
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
        Se guarda al momento. "Sí" da el módulo aunque su plan no lo incluya.
      </p>
    </div>
  )
}
