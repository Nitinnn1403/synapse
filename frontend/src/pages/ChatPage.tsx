import { useState, useRef, useEffect, useCallback } from 'react'
import React from 'react'
import { FileText, Bot, User, X, ExternalLink, ScrollText, MessageSquareQuote, GitCompare, BarChart2, Lightbulb, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useStore } from '../store'
import { chatQueryStream } from '../api/chat'
import type { Message, Citation } from '../types/chat'
import TypewriterText from '../components/ui/TypewriterText'
import { PromptInputBox } from '../components/ui/ai-prompt-box'

// ── PDF Export ────────────────────────────────────────────────────────────────
async function exportMessageToPdf(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#0f0f0f',
    ignoreElements: (el) =>
      el.tagName === 'IMG' ||
      el.classList.contains('export-ignore'),
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const contentWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * contentWidth) / canvas.width

  let heightLeft = imgHeight
  let yPosition = margin

  pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, imgHeight)
  heightLeft -= pageHeight - margin * 2

  while (heightLeft > 0) {
    pdf.addPage()
    yPosition = -(imgHeight - heightLeft) - margin
    pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, imgHeight)
    heightLeft -= pageHeight - margin * 2
  }

  pdf.save('synapse-answer.pdf')
}

const messageVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
}

// ── Source Panel ──────────────────────────────────────────────────────────────
function SourcePanel({
  citation,
  onClose,
}: {
  citation: Citation | null
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <AnimatePresence>
      {citation && (
        <motion.aside
          key="source-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-80 shrink-0 border-l border-border bg-surface-1 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-semibold text-text-primary">Source {citation.source_index}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Document info */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-text-primary leading-snug break-all">{citation.document_name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {citation.page_number != null && citation.page_number > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-surface-2 border border-border rounded text-text-tertiary">
                    Page {citation.page_number}
                  </span>
                )}
                <span className="text-sm text-text-tertiary">
                  Relevance: <span className="text-primary font-medium">{(citation.relevance_score * 100).toFixed(0)}%</span>
                </span>
              </div>
            </div>

            {/* Images */}
            {citation.images && citation.images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Figures</p>
                <div className="space-y-2">
                  {citation.images.map((src, i) => (
                    <a key={i} href={`http://localhost:8000${src}`} target="_blank" rel="noreferrer" className="block group">
                      <img
                        src={`http://localhost:8000${src}`}
                        alt={`Figure ${i + 1}`}
                        className="w-full rounded border border-border object-contain bg-surface-0 group-hover:border-primary/50 transition-colors"
                      />
                      <div className="flex items-center gap-1 mt-1 text-xs text-text-tertiary group-hover:text-primary transition-colors">
                        <ExternalLink className="w-3 h-3" />
                        <span>Open full size</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Chunk text */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Excerpt</p>
              <p className="text-sm text-text-secondary leading-relaxed bg-surface-2 border border-border rounded p-3">
                {citation.chunk_text}
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

// ── Inline [Source N] chip renderer ──────────────────────────────────────────
function SourceChip({
  index,
  citations,
  onOpen,
}: {
  index: number
  citations: Citation[] | null
  onOpen: (c: Citation) => void
}) {
  const citation = citations?.find((c) => c.source_index === index)
  if (!citation) {
    return <span className="text-text-tertiary text-xs">[{index}]</span>
  }
  return (
    <button
      onClick={() => onOpen(citation)}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-xs font-medium bg-surface-3 hover:bg-primary/15 text-text-tertiary hover:text-primary border border-border hover:border-primary/30 rounded transition-colors align-baseline"
      title={`${citation.document_name}${citation.page_number ? ` p.${citation.page_number}` : ''}`}
    >
      <FileText className="w-2.5 h-2.5" />
      {index}
    </button>
  )
}

// Custom markdown renderer that replaces [Source N] with chips
function CitedMarkdown({
  content,
  citations,
  onOpenSource,
  className,
}: {
  content: string
  citations: Citation[] | null
  onOpenSource: (c: Citation) => void
  className?: string
}) {
  const SOURCE_RE = /\[Source\s+(\d+)\]/g

  const components: Record<string, (props: any) => React.ReactElement | null> = {
    p({ children, ...props }: any) {
      return <p {...props}>{processChildren(children)}</p>
    },
    li({ children, ...props }: any) {
      return <li {...props}>{processChildren(children)}</li>
    },
    img({ src, alt }: any) {
      return (
        <a href={src} target="_blank" rel="noreferrer" className="block my-3 group">
          <img
            src={src}
            alt={alt || 'Figure'}
            className="rounded border border-border max-w-full object-contain group-hover:border-primary/40 transition-colors"
          />
          {alt && alt !== 'Figure' && (
            <span className="text-xs text-text-tertiary mt-1 block">{alt}</span>
          )}
        </a>
      )
    },
  }

  function processChildren(children: React.ReactNode): React.ReactNode {
    return Array.isArray(children)
      ? children.flatMap((child, i) => processNode(child, i))
      : processNode(children, 0)
  }

  function processNode(node: React.ReactNode, key: number): React.ReactNode[] {
    if (typeof node !== 'string') return [node]
    const parts: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    SOURCE_RE.lastIndex = 0
    while ((m = SOURCE_RE.exec(node)) !== null) {
      if (m.index > last) parts.push(node.slice(last, m.index))
      const idx = parseInt(m[1], 10)
      parts.push(
        <SourceChip key={`${key}-${m.index}`} index={idx} citations={citations} onOpen={onOpenSource} />
      )
      last = m.index + m[0].length
    }
    if (last < node.length) parts.push(node.slice(last))
    return parts
  }

  return (
    <div className={className}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  )
}

// ── Confidence Badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ confidence }: { confidence: number }) {
  let color = 'text-danger'
  if (confidence > 0.7) color = 'text-success'
  else if (confidence > 0.4) color = 'text-warning'
  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {(confidence * 100).toFixed(0)}% confidence
    </span>
  )
}

function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-6 h-6 rounded-full skeleton shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3.5 skeleton w-3/4 rounded" />
        <div className="h-3.5 skeleton w-1/2 rounded" />
        <div className="h-3.5 skeleton w-2/3 rounded" />
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isStreaming,
  animateIn,
  onOpenSource,
  onAnimationComplete,
}: {
  message: Message
  isStreaming: boolean
  animateIn: boolean
  onOpenSource: (c: Citation) => void
  onAnimationComplete: () => void
}) {
  const isUser = message.role === 'user'
  const showTypewriter = !isUser && animateIn
  const contentRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  if (!isUser && !message.content) return null

  const handleExport = async () => {
    if (!contentRef.current || exporting) return
    setExporting(true)
    try {
      await exportMessageToPdf(contentRef.current)
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={clsx('flex gap-3 mb-6', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-surface-3 border border-border flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3 h-3 text-text-tertiary" />
        </div>
      )}

      <div className={clsx('flex flex-col', isUser ? 'items-end max-w-[72%]' : 'items-start flex-1 min-w-0')}>
        {isUser ? (
          /* User: simple dark bubble */
          <div className="bg-surface-3 border border-border rounded-xl px-3.5 py-2.5">
            <p className="text-sm text-text-primary">{message.content}</p>
          </div>
        ) : (
          /* AI: no bubble — just text, slight left-border accent */
          <div ref={contentRef} className="w-full pl-3 border-l-2 border-border">
            {showTypewriter ? (
              <TypewriterText fullText={message.content} speed={20} isStreaming={isStreaming} onComplete={onAnimationComplete}>
                {(revealedText, isRevealing) => (
                  <CitedMarkdown
                    content={revealedText}
                    citations={message.citations}
                    onOpenSource={onOpenSource}
                    className={clsx('chat-prose text-sm max-w-none', isRevealing && 'typewriter-cursor')}
                  />
                )}
              </TypewriterText>
            ) : (
              <CitedMarkdown
                content={message.content}
                citations={message.citations}
                onOpenSource={onOpenSource}
                className="chat-prose text-sm max-w-none"
              />
            )}
          </div>
        )}

        {/* Confidence + source pills + export button */}
        {!isUser && (
          <div className="mt-2.5 pl-3 flex flex-wrap items-center gap-2">
            {message.confidence != null && (
              <ConfidenceBadge confidence={message.confidence} />
            )}
            {message.citations && message.citations.length > 0 && (
              <>
                {message.confidence != null && (
                  <span className="text-border text-xs">·</span>
                )}
                {message.citations.map((c) => (
                  <button
                    key={c.source_index}
                    onClick={() => onOpenSource(c)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 hover:bg-surface-3 border border-border rounded text-xs text-text-tertiary hover:text-text-primary transition-all export-ignore"
                  >
                    <FileText className="w-2.5 h-2.5" />
                    <span className="max-w-[120px] truncate">{c.document_name}</span>
                    {c.page_number != null && c.page_number > 0 && (
                      <span className="opacity-60">·{c.page_number}</span>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Export PDF button */}
            {!isStreaming && message.content && (
              <>
                <span className="text-border text-xs export-ignore">·</span>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  title="Export answer as PDF"
                  className="export-ignore inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 hover:bg-primary/15 border border-border hover:border-primary/30 rounded text-xs text-text-tertiary hover:text-primary transition-all disabled:opacity-50"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>{exporting ? 'Exporting…' : 'Export PDF'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-6 h-6 rounded-full bg-surface-3 border border-border flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3 h-3 text-text-tertiary" />
        </div>
      )}
    </motion.div>
  )
}

export default function ChatPage() {
  const { messages, addMessage, updateLastMessage, activeConversationId, setActiveConversationId } = useStore()
  const [streaming, setStreaming] = useState(false)
  const [activeSource, setActiveSource] = useState<Citation | null>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamBufferRef = useRef('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleOpenSource = useCallback((citation: Citation) => {
    setActiveSource((prev) =>
      prev?.source_index === citation.source_index && prev?.document_name === citation.document_name
        ? null
        : citation
    )
  }, [])

  const handleSendMessage = async (question: string) => {
    if (!question.trim() || streaming) return

    setStreaming(true)
    setActiveSource(null)

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
      citations: null,
      confidence: null,
      created_at: new Date().toISOString(),
    }
    addMessage(userMsg)

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      citations: null,
      confidence: null,
      created_at: new Date().toISOString(),
    }
    addMessage(assistantMsg)
    setAnimatingId(assistantMsg.id)

    streamBufferRef.current = ''

    try {
      await chatQueryStream(
        question.trim(),
        activeConversationId || undefined,
        undefined,
        (token) => {
          streamBufferRef.current += token
          updateLastMessage({ content: streamBufferRef.current })
        },
        (data) => {
          setActiveConversationId(data.conversation_id || activeConversationId)
          updateLastMessage({
            citations: data.citations,
            confidence: data.confidence,
          })
        }
      )
    } catch (err: any) {
      updateLastMessage({
        content: `Error: ${err.message || 'Something went wrong. Make sure documents are uploaded and the backend is running.'}`,
      })
    }

    setStreaming(false)
  }

  const inputBar = (
    <div className="absolute bottom-0 left-0 right-0 pb-5 px-4 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <PromptInputBox
          onSend={(msg) => handleSendMessage(msg)}
          isLoading={streaming}
          placeholder={messages.length === 0 ? 'Ask about your documents...' : 'Ask a follow-up...'}
        />
      </div>
    </div>
  )

  const suggestions = [
    { icon: <ScrollText className="w-4 h-4" />, label: 'Summarize the key findings' },
    { icon: <MessageSquareQuote className="w-4 h-4" />, label: 'What are the main arguments?' },
    { icon: <GitCompare className="w-4 h-4" />, label: 'Compare the approaches discussed' },
    { icon: <BarChart2 className="w-4 h-4" />, label: 'List all data and statistics' },
    { icon: <Lightbulb className="w-4 h-4" />, label: 'What conclusions were drawn?' },
  ]

  if (messages.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="relative flex flex-col h-full"
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Greeting */}
          <div className="w-full max-w-2xl mb-8">
            <p className="text-lg text-text-secondary font-medium mb-1">Good to see you</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary leading-tight">
              What would you like<br />to know?
            </h1>
          </div>

          {/* Inline prompt box */}
          <div className="w-full max-w-2xl mb-5">
            <PromptInputBox
              onSend={(msg) => handleSendMessage(msg)}
              isLoading={streaming}
              placeholder="Ask about your documents..."
            />
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => handleSendMessage(s.label)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-2 border border-border text-sm text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-all"
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex h-full overflow-hidden"
    >
      {/* Main chat area */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-36">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={streaming}
                  animateIn={msg.id === animatingId}
                  onOpenSource={handleOpenSource}
                  onAnimationComplete={() => setAnimatingId(null)}
                />
              ))}
            </AnimatePresence>
            {streaming && messages.at(-1)?.content === '' && <MessageSkeleton />}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {inputBar}
      </div>

      {/* Right source panel */}
      <SourcePanel citation={activeSource} onClose={() => setActiveSource(null)} />
    </motion.div>
  )
}