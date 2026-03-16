import client from './client'
import type { ChatQueryResponse, Conversation } from '../types/chat'

interface PaginatedConversations {
  conversations: Conversation[]
  page: number
  limit: number
}

export async function chatQuery(
  question: string,
  conversationId?: string,
  documentIds?: string[]
): Promise<ChatQueryResponse> {
  const res = await client.post('/chat/query', {
    question,
    conversation_id: conversationId || null,
    document_ids: documentIds || null,
  })
  return res.data
}

export async function chatQueryStream(
  question: string,
  conversationId?: string,
  documentIds?: string[],
  onToken?: (token: string) => void,
  onDone?: (data: { citations: any[]; confidence: number; conversation_id?: string }) => void
) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL + '/api' : '/api'}/chat/query/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      conversation_id: conversationId || null,
      document_ids: documentIds || null,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Query failed')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (data.token) {
          onToken?.(data.token)
        } else if (data.done) {
          onDone?.(data)
        }
      }
    }
  }
}

export async function listConversations(
  page = 1,
  limit = 20
): Promise<PaginatedConversations> {
  const res = await client.get('/chat/conversations', { params: { page, limit } })
  return res.data
}

export async function getConversation(convId: string) {
  const res = await client.get(`/chat/conversations/${convId}`)
  return res.data
}

export async function deleteConversation(convId: string) {
  const res = await client.delete(`/chat/conversations/${convId}`)
  return res.data
}
