import { useState } from 'react'
import { useAddClient } from '../hooks/useTrainerClients'
import { apiErrorMessage } from '../lib/apiError'
import { Modal } from './ui'

/** Alta de un cliente por el entrenador: crea la cuenta o, si el email ya es de un cliente libre, lo asigna. */
export default function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded?: (id: string) => void }) {
  const addClient = useAddClient()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addClient.mutate(
      { email: form.email, name: form.name || undefined, password: form.password || undefined },
      { onSuccess: client => { onAdded?.(client.id); onClose() } },
    )
  }

  return (
    <Modal onClose={onClose}>
      <form className="modal card" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()} onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Añadir cliente">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <span className="icon-tile lg"><i className="ti ti-user-plus" aria-hidden="true" /></span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Añadir cliente</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Crea su cuenta y pasará a tu cartera</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar"><i className="ti ti-x" style={{ fontSize: '18px' }} aria-hidden="true" /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="label" htmlFor="ac-name">Nombre</label>
            <input id="ac-name" className="input" value={form.name} onChange={set('name')} minLength={2} placeholder="Nombre y apellidos" autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="ac-email">Email</label>
            <input id="ac-email" className="input" type="email" value={form.email} onChange={set('email')} required placeholder="cliente@email.com" />
          </div>
          <div>
            <label className="label" htmlFor="ac-pass">Contraseña inicial</label>
            <input id="ac-pass" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} minLength={6} placeholder="Mínimo 6 caracteres" />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            <i className="ti ti-info-circle" aria-hidden="true" /> Las cuentas nuevas se crean con el plan PRO. Si el cliente ya tiene cuenta, basta con su email: debe ser PRO o PREMIUM y no tener entrenador.
          </p>
        </div>

        {addClient.isError && (
          <div className="alert alert-danger" style={{ marginTop: '14px' }}>
            <i className="ti ti-alert-circle" aria-hidden="true" /> {apiErrorMessage(addClient.error)}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={addClient.isPending}>
            <i className="ti ti-user-plus" aria-hidden="true" /> {addClient.isPending ? 'Añadiendo...' : 'Añadir cliente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
