export interface Citation {
  source_index: number
  document_name: string
  page_number: number | null
  chunk_text: string
  relevance_score: number
  images: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[] | null
  confidence: number | null
  created_at: string
}

export interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ChatQueryResponse {
  answer: string
  citations: Citation[]
  confidence: number
  conversation_id: string
  message_id: string
  model_used: string
  tokens_used: number | null
  latency_ms: number | null
}
