import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useThread, useSendMessage } from '../hooks/useMessages'
import Avatar from './Avatar'
import { EmptyState, Loader } from './ui'

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function formatDateLabel(date: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) return 'Hoy'
  if (isSameDay(date, yesterday)) return 'Ayer'
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

export default function ChatThread({ otherUserId, otherUserName, otherUserPhoto }: {
  otherUserId: string
  otherUserName?: string
  otherUserPhoto?: string | null
}) {
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
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'min(620px, calc(100vh - 220px))',
      minHeight: '420px',
      padding: 0,
      overflow: 'hidden',
    }}>
      {otherUserName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={36} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {otherUserName}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <Loader inline />
        ) : messages.length === 0 ? (
          <div style={{ margin: 'auto' }}>
            <EmptyState icon="ti-message-circle" title="Sin mensajes">Todavía no hay mensajes. Escribe el primero.</EmptyState>
          </div>
        ) : (
          messages.map((m: any, i: number) => {
            const isMine = m.senderId === user?.id
            const date = new Date(m.createdAt)
            const prev = messages[i - 1]
            const next = messages[i + 1]

            const showDateSeparator = !prev || !isSameDay(date, new Date(prev.createdAt))
            const isFirstInGroup = showDateSeparator || prev.senderId !== m.senderId
            const isLastInGroup = !next || !isSameDay(date, new Date(next.createdAt)) || next.senderId !== m.senderId

            return (
              <div key={m.id}>
                {showDateSeparator && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px' }}>
                    <span style={{
                      fontSize: '11px', color: 'var(--text-tertiary)',
                      fontWeight: 500,
                      background: 'var(--bg-hover)',
                      borderRadius: '20px', padding: '3px 12px',
                    }}>
                      {formatDateLabel(date)}
                    </span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '6px',
                  marginTop: isFirstInGroup ? '10px' : '2px',
                }}>
                  {!isMine && (
                    isLastInGroup
                      ? <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={22} />
                      : <div style={{ width: '22px', flexShrink: 0 }} />
                  )}
                  <div style={{
                    maxWidth: '70%',
                    padding: '9px 13px',
                    borderRadius: '16px',
                    borderBottomRightRadius: isMine && isLastInGroup ? '4px' : '16px',
                    borderBottomLeftRadius: !isMine && isLastInGroup ? '4px' : '16px',
                    background: isMine ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                    border: isMine ? 'none' : '1px solid var(--border)',
                    boxShadow: isMine ? '0 6px 16px -10px var(--accent-primary)' : 'none',
                    color: isMine ? '#fff' : 'var(--text-primary)',
                    fontSize: '13.5px',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                  }}>
                    {m.content}
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                      {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="input"
          style={{ flex: 1, borderRadius: '999px', paddingLeft: '16px' }}
        />
        <button
          type="submit"
          disabled={sendMessage.isPending || !content.trim()}
          className="btn btn-primary"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
          aria-label="Enviar"
        >
          <i className="ti ti-send" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
