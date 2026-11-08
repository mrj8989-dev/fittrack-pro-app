import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { AuthSession } from '../context/AuthContext'
import { apiErrorMessage } from '../lib/apiError'

/** Cambio de la contraseña propia. Al terminar, el backend devuelve una sesión nueva. */
export default function ChangePasswordForm({ onDone, submitLabel = 'Cambiar contraseña', currentLabel = 'Contraseña actual' }: {
  onDone?: () => void
  submitLabel?: string
  currentLabel?: string
}) {
  const { applySession } = useAuth()
  const [form, setForm] = useState({ current: '', next: '', repeat: '' })
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDone(false)
    setForm(f => ({ ...f, [k]: e.target.value }))
  }

  const change = useMutation({
    mutationFn: () => api.post<AuthSession>('/auth/change-password', {
      currentPassword: form.current,
      newPassword: form.next,
    }).then(r => r.data),
    onSuccess: session => {
      applySession(session)
      setForm({ current: '', next: '', repeat: '' })
      setDone(true)
      onDone?.()
    },
  })

  const mismatch = form.repeat.length > 0 && form.next !== form.repeat

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (!mismatch) change.mutate() }}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <div>
        <label className="label" htmlFor="pw-current">{currentLabel}</label>
        <input id="pw-current" className="input" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div>
          <label className="label" htmlFor="pw-next">Nueva contraseña</label>
          <input id="pw-next" className="input" type="password" autoComplete="new-password" minLength={6} value={form.next} onChange={set('next')} required placeholder="Mínimo 6 caracteres" />
        </div>
        <div>
          <label className="label" htmlFor="pw-repeat">Repite la nueva</label>
          <input id="pw-repeat" className={`input${mismatch ? ' invalid' : ''}`} type="password" autoComplete="new-password" value={form.repeat} onChange={set('repeat')} required />
          {mismatch && <p className="field-error">No coincide con la nueva contraseña</p>}
        </div>
      </div>

      {change.isError && (
        <div className="alert alert-danger"><i className="ti ti-alert-circle" aria-hidden="true" /> {apiErrorMessage(change.error)}</div>
      )}
      {done && (
        <div className="alert" style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
          <i className="ti ti-circle-check" aria-hidden="true" /> Contraseña actualizada
        </div>
      )}

      <div>
        <button type="submit" className="btn btn-primary" disabled={change.isPending || mismatch}>
          <i className="ti ti-lock" aria-hidden="true" /> {change.isPending ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
