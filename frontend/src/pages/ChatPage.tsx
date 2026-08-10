import { useMyTrainer } from '../hooks/useMessages'
import ChatThread from '../components/ChatThread'

export default function ChatPage() {
  const { data: trainer, isLoading } = useMyTrainer()

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Chat
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Habla directamente con tu entrenador
        </p>
      </div>

      {isLoading ? (
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando...</div>
      ) : !trainer ? (
        <div style={{
          background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: '12px',
          padding: '2rem', textAlign: 'center',
        }}>
          <i className="ti ti-user-off" style={{ fontSize: '28px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Todavía no tienes un entrenador asignado
          </div>
        </div>
      ) : (
        <ChatThread otherUserId={trainer.id} otherUserName={trainer.name} />
      )}
    </div>
  )
}
