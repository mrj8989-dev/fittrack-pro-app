import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAiConversation, useNewAiConversation, streamAiChat } from '../hooks/useAi'
import type { AiConversation } from '../hooks/useAi'
import { EmptyState, Loader, PageHeader } from '../components/ui'

const SUGGESTIONS = [
  '¿Cómo progreso en press de banca si me he estancado?',
  '¿Qué hago si un día no me da tiempo a entrenar completo?',
  'Explícame la técnica del peso muerto rumano',
  '¿Cuánto debería descansar entre series?',
]

/** Formato mínimo de las respuestas: párrafos, listas con "-" y **negrita**. */
function RichText({ text }: { text: string }) {
  const bold = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)

  const blocks: React.ReactNode[] = []
  let list: string[] = []
  const flushList = () => {
    if (list.length) blocks.push(<ul key={`l${blocks.length}`}>{list.map((li, i) => <li key={i}>{bold(li)}</li>)}</ul>)
    list = []
  }
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*[-•*]\s+(.*)$/)
    if (item) { list.push(item[1]); continue }
    flushList()
    if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{bold(line)}</p>)
  }
  flushList()
  return <div className="rich-text">{blocks}</div>
}

export default function AssistantPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useAiConversation()
  const newConversation = useNewAiConversation()
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<{ question: string; answer: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const messages = data?.messages ?? []
  const usage = data?.usage
  const outOfMessages = !!usage && usage.remaining !== null && usage.remaining <= 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, pending?.answer])

  // Si se sale de la página a mitad de respuesta, se cancela (y no gasta mensaje).
  useEffect(() => () => abortRef.current?.abort(), [])

  async function send(text: string) {
    const question = text.trim()
    if (!question || pending) return
    setInput('')
    setError(null)
    setPending({ question, answer: '' })
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await streamAiChat(
        question,
        delta => setPending(p => (p ? { ...p, answer: p.answer + delta } : p)),
        controller.signal,
      )
      // Pasa la pregunta y la respuesta al historial sin esperar a recargarlo.
      queryClient.setQueryData<AiConversation>(['ai', 'conversation'], old => old && {
        ...old,
        usage: result.usage,
        messages: [
          ...old.messages,
          { id: `u-${Date.now()}`, role: 'user', content: question, createdAt: new Date().toISOString() },
          { id: `a-${Date.now()}`, role: 'assistant', content: result.reply, createdAt: new Date().toISOString() },
        ],
      })
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'El asistente no ha podido responder.')
        setInput(question)
      }
    } finally {
      setPending(null)
      abortRef.current = null
    }
  }

  if (isLoading) return <Loader />

  return (
    <div className="page" style={{ maxWidth: '900px' }}>
      <PageHeader
        eyebrow={<><i className="ti ti-sparkles" aria-hidden="true" /> Asistente IA</>}
        title="Pregúntame lo que quieras"
        subtitle="Dudas de técnica, progresión o recuperación. Conozco tu plan y tus últimas sesiones; los cambios, coméntalos con tu entrenador."
        actions={
          <>
            {usage && (
              <span
                className={`badge ${outOfMessages ? 'badge-danger' : 'badge-accent'}`}
                style={{ height: '32px', padding: '0 12px' }}
                title={data?.usingOwnKey ? 'Usas tu propia clave de API' : undefined}
              >
                <i className={`ti ${data?.usingOwnKey ? 'ti-key' : 'ti-message-bolt'}`} aria-hidden="true" />
                {usage.limit === null ? 'Sin límite' : `${usage.remaining}/${usage.limit} hoy`}
              </span>
            )}
            <Link to="/ajustes#ia" className="btn btn-ghost btn-sm" title="Configurar el asistente">
              <i className="ti ti-adjustments" aria-hidden="true" /> Configurar
            </Link>
            {messages.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => newConversation.mutate()} disabled={!!pending || newConversation.isPending}>
                <i className="ti ti-plus" aria-hidden="true" /> Nueva conversación
              </button>
            )}
          </>
        }
      />

      <section className="card ai-chat">
        <div className="ai-messages">
          {data && !data.configured ? (
            <EmptyState icon="ti-plug-connected-x" title="El asistente aún no está activado">
              Falta una clave de API. La puede poner el administrador en el servidor, o puedes usar la tuya desde <Link to="/ajustes#ia">Ajustes</Link>.
            </EmptyState>
          ) : messages.length === 0 && !pending ? (
            <div style={{ margin: 'auto', width: '100%' }}>
              <EmptyState icon="ti-sparkles" title="¿En qué te ayudo hoy?">
                Prueba con alguna de estas preguntas o escribe la tuya.
              </EmptyState>
              <div className="ai-suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="chip" onClick={() => send(s)} disabled={outOfMessages}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <div key={m.id} className={`ai-bubble ${m.role}`}>
                  {m.role === 'assistant' ? <RichText text={m.content} /> : m.content}
                </div>
              ))}
              {pending && (
                <>
                  <div className="ai-bubble user">{pending.question}</div>
                  <div className="ai-bubble assistant">
                    {pending.answer
                      ? <RichText text={pending.answer} />
                      : <span className="ai-typing"><span /><span /><span /></span>}
                  </div>
                </>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="alert alert-danger" style={{ margin: '0 14px 10px' }}>
            <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
          </div>
        )}

        <form
          className="ai-input"
          onSubmit={e => { e.preventDefault(); send(input) }}
        >
          <textarea
            className="input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
            }}
            placeholder={outOfMessages ? 'Has usado tus mensajes de hoy. Mañana tendrás más.' : 'Escribe tu pregunta… (Enter para enviar)'}
            disabled={!data?.configured || outOfMessages || !!pending}
            maxLength={2000}
            aria-label="Mensaje para el asistente"
          />
          {pending ? (
            <button type="button" className="btn btn-secondary" onClick={() => abortRef.current?.abort()} aria-label="Detener">
              <i className="ti ti-player-stop-filled" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || !data?.configured || outOfMessages} aria-label="Enviar">
              <i className="ti ti-send" aria-hidden="true" />
            </button>
          )}
        </form>
      </section>
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '8px' }}>
        El asistente puede equivocarse. No sustituye a tu entrenador ni a un profesional sanitario.
      </p>
    </div>
  )
}
