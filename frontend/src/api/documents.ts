import client from './client'
import type { Document } from '../types/document'

interface PaginatedDocuments {
  documents: Document[]
  page: number
  limit: number
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await client.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function ingestUrl(url: string): Promise<Document> {
  const res = await client.post('/documents/url', { url })
  return res.data
}

export async function listDocuments(
  status?: string,
  page = 1,
  limit = 20
): Promise<PaginatedDocuments> {
  const params: Record<string, string | number> = { page, limit }
  if (status) params.status = status
  const res = await client.get('/documents', { params })
  return res.data
}

export async function getDocumentStatus(docId: string) {
  const res = await client.get(`/documents/${docId}/status`)
  return res.data
}

export async function deleteDocument(docId: string) {
  const res = await client.delete(`/documents/${docId}`)
  return res.data
}
