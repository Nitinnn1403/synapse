import { useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MessageSquare, FileText, BarChart3,
  Plus, Trash2, MessageCircle, Menu, X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useStore } from '../../store'
import { listConversations, getConversation, deleteConversation } from '../../api/chat'
import synapseLogo from '../../assets/synapse.svg'

const navItems = [
  { to: '/app', label: 'Chat', icon: MessageSquare },
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/evaluation', label: 'Evaluation', icon: BarChart3 },
]

export default function AppLayout() {
  const {
    mobileMenuOpen, setMobileMenuOpen,
    conversations, setConversations,
    activeConversationId, setActiveConversationId,
    setMessages,
  } = useStore()

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, setMobileMenuOpen])

  // Load conversations from backend
  useEffect(() => {
    listConversations()
      .then((res) => setConversations(res.conversations))
      .catch(() => {})
  }, [setConversations])

  // Restore last active conversation on mount
  useEffect(() => {
    const savedId = localStorage.getItem('activeConversationId')
    if (savedId && !activeConversationId) {
      getConversation(savedId)
        .then((data) => {
          setActiveConversationId(savedId)
          setMessages(data.messages || [])
        })
        .catch(() => localStorage.removeItem('activeConversationId'))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null)
    setMessages([])
    navigate('/app')
  }, [setActiveConversationId, setMessages, navigate])

  const handleSelectConversation = useCallback(async (convId: string) => {
    try {
      const data = await getConversation(convId)
      setActiveConversationId(convId)
      setMessages(data.messages || [])
      navigate('/app')
    } catch { /* ignore */ }
  }, [setActiveConversationId, setMessages, navigate])

  const handleDeleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteConversation(convId)
      setConversations(conversations.filter((c) => c.id !== convId))
      if (activeConversationId === convId) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch { /* ignore */ }
  }, [conversations, activeConversationId, setConversations, setActiveConversationId, setMessages])

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <img src={synapseLogo} alt="Synapse" className="w-8 h-8 object-contain" />
          <span className="text-sm font-semibold tracking-tight text-text-primary">Synapse</span>
        </div>
        <button
          className="lg:hidden p-1 text-text-tertiary hover:text-text-primary transition-colors"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 pt-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('w-3.5 h-3.5 shrink-0', isActive && 'text-primary')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 mt-3 mb-1 border-t border-border" />

      {/* History header */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-text-secondary font-medium">History</span>
        <button
          onClick={handleNewChat}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
          title="New Chat"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-2 pb-3 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-sm text-text-secondary px-3 py-2">No conversations yet</p>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className={clsx(
              'w-full text-left px-3 py-2.5 rounded-md text-sm group flex items-center gap-2 transition-colors',
              conv.id === activeConversationId
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
            )}
            onClick={() => handleSelectConversation(conv.id)}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0 opacity-50" />
            <span className="truncate flex-1">{conv.title || 'Untitled'}</span>
            <Trash2
              className="w-3 h-3 opacity-0 group-hover:opacity-60 hover:!opacity-100 shrink-0 hover:text-danger transition-all"
              onClick={(e) => handleDeleteConversation(conv.id, e)}
            />
          </button>
        ))}
      </div>

    </div>
  )

  return (
    <div className="flex h-screen bg-surface-0">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-surface-1 border-r border-border">
        {sidebar}
      </aside>

      {/* Sidebar — mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col lg:hidden bg-surface-1 border-r border-border"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            {sidebar}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile hamburger */}
      <button
        className="fixed top-3.5 left-3.5 z-30 lg:hidden p-2 bg-surface-1 border border-border rounded-md text-text-tertiary hover:text-text-primary transition-colors"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-surface-0">
        <Outlet />
      </main>
    </div>
  )
}
