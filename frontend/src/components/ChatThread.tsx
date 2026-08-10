import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useThread, useSendMessage } from '../hooks/useMessages'
import Avatar from './Avatar'

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
    <div style={{
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      height: '520px',
    }}>
      {otherUserName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: '0.5px solid var(--border)' }}>
          <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={30} />
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {otherUserName}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cargando...</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
            Todavía no hay mensajes. Escribe el primero.
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
                      background: 'var(--bg-primary)', border: '0.5px solid var(--border)',
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
                    padding: '8px 12px',
                    borderRadius: '14px',
                    borderBottomRightRadius: isMine && isLastInGroup ? '4px' : '14px',
                    borderBottomLeftRadius: !isMine && isLastInGroup ? '4px' : '14px',
                    background: isMine ? 'var(--accent-primary)' : 'var(--bg-primary)',
                    border: isMine ? 'none' : '0.5px solid var(--border)',
                    color: isMine ? '#fff' : 'var(--text-primary)',
                    fontSize: '13px',
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
