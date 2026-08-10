import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useThread, useSendMessage } from '../hooks/useMessages'

export default function ChatThread({ otherUserId, otherUserName }: { otherUserId: string; otherUserName?: string }) {
  const { user } = useAuth()
  const { data: messages = [], isLoading } = useThread(otherUserId)
  const sendMessage = useSendMessage()
  const [content, setContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    sendMessage.mutate({ receiverId: otherUserId, content: trimmed }, {
      onSuccess: () => setContent(''),
    })
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      height: '520px',
    }}>
      {otherUserName && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {otherUserName}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isLoading ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cargando...</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
            Todavía no hay mensajes. Escribe el primero.
          </div>
        ) : (
          messages.map((m: any) => {
            const isMine = m.senderId === user?.id
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '8px 12px',
                  borderRadius: '14px',
                  borderBottomRightRadius: isMine ? '4px' : '14px',
                  borderBottomLeftRadius: isMine ? '14px' : '4px',
                  background: isMine ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  border: isMine ? 'none' : '0.5px solid var(--border)',
                  color: isMine ? '#fff' : 'var(--text-primary)',
                  fontSize: '13px',
                  wordBreak: 'break-word',
                }}>
                  {m.content}
                  <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                    {new Date(m.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '0.5px solid var(--border)' }}>
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1,
            padding: '9px 12px',
            background: 'var(--bg-primary)',
            border: '0.5px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sendMessage.isPending || !content.trim()}
          style={{
            padding: '9px 16px',
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <i className="ti ti-send" style={{ fontSize: '14px' }} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
