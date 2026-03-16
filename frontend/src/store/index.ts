import { create } from 'zustand'
import type { Document } from '../types/document'
import type { Message, Conversation } from '../types/chat'

interface AppState {
  // Documents
  documents: Document[]
  setDocuments: (docs: Document[]) => void
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void

  // Chat
  conversations: Conversation[]
  setConversations: (convs: Conversation[]) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  messages: Message[]
  setMessages: (msgs: Message[]) => void
  addMessage: (msg: Message) => void
  updateLastMessage: (updates: Partial<Message>) => void

  // UI
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  // Documents
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
  updateDocument: (id, updates) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  // Chat
  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
  activeConversationId: null,
  setActiveConversationId: (id) => {
    if (id) localStorage.setItem('activeConversationId', id)
    else localStorage.removeItem('activeConversationId')
    set({ activeConversationId: id })
  },
  messages: [],
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (updates) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...updates }
      }
      return { messages: msgs }
    }),

  // UI
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}))
