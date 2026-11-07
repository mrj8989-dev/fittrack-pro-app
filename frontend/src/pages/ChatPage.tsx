import { useMyTrainer } from '../hooks/useMessages'
import ChatThread from '../components/ChatThread'
import { EmptyState, Loader, PageHeader } from '../components/ui'

export default function ChatPage() {
  const { data: trainer, isLoading } = useMyTrainer()

  return (
    <div className="page" style={{ maxWidth: '700px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-message-circle" aria-hidden="true" /> Chat</>}
        title="Tu entrenador"
        subtitle="Habla directamente con tu entrenador"
      />

      {isLoading ? (
        <Loader inline />
      ) : !trainer ? (
        <div className="card">
          <EmptyState icon="ti-user-off" title="Sin entrenador asignado">Cuando te asignen un entrenador podrás hablar con él desde aquí</EmptyState>
        </div>
      ) : (
        <ChatThread otherUserId={trainer.id} otherUserName={trainer.name} otherUserPhoto={trainer.profilePhoto} />
      )}
    </div>
  )
}
