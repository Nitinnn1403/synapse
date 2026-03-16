export interface Document {
  id: string
  filename: string
  file_type: string
  original_path: string | null
  file_size: number | null
  page_count: number | null
  chunk_count: number | null
  status: string
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Chunk {
  id: string
  document_id: string
  content: string
  chunk_index: number
  page_number: number | null
  section_title: string | null
}
