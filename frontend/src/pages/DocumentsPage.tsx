import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Globe, Loader2, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useStore } from '../store'
import { uploadDocument, ingestUrl, listDocuments, deleteDocument, getDocumentStatus } from '../api/documents'
import type { Document } from '../types/document'

export default function DocumentsPage() {
  const { documents, setDocuments, addDocument, updateDocument, removeDocument } = useStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listDocuments().then((res) => setDocuments(res.documents)).catch(() => {})
  }, [setDocuments])

  const pollStatus = useCallback((docId: string) => {
    const poll = async () => {
      try {
        const status = await getDocumentStatus(docId)
        updateDocument(docId, status)
        if (status.status === 'processing' || status.status === 'pending') {
          setTimeout(poll, 2000)
        } else if (status.status === 'ready') {
          toast.success('Document processed successfully!')
        } else if (status.status === 'error') {
          toast.error(`Processing failed: ${status.error_message}`)
        }
      } catch {
        // Stop polling on error
      }
    }
    poll()
  }, [updateDocument])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        const doc = await uploadDocument(file)
        addDocument(doc as unknown as Document)
        pollStatus(doc.id)
        toast.success(`Uploaded: ${file.name}`)
      } catch {
        toast.error(`Failed to upload: ${file.name}`)
      }
    }
  }, [addDocument, pollStatus])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
  })

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    try {
      const doc = await ingestUrl(url.trim())
      addDocument(doc as unknown as Document)
      pollStatus(doc.id)
      toast.success('URL submitted for processing')
      setUrl('')
    } catch {
      toast.error('Failed to ingest URL')
    }
    setLoading(false)
  }

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(docId)
      removeDocument(docId)
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-success" />
      case 'processing':
      case 'pending':
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-danger" />
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full overflow-y-auto p-4 sm:p-6"
    >
      <h2 className="text-2xl font-semibold text-text-primary mb-6">Documents</h2>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-6',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-text-tertiary'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
        <p className="text-text-primary mb-1">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-sm text-text-secondary">Supports PDF, DOCX, TXT</p>
      </div>

      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} className="flex gap-3 mb-8">
        <div className="flex-1 flex items-center gap-2 bg-surface-2 border border-border rounded-xl focus-ring px-3">
          <Globe className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to ingest..."
            className="flex-1 bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ingest'}
        </button>
      </form>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <FileText className="w-10 h-10 mx-auto mb-4 text-text-tertiary" />
          <p>No documents yet. Upload files or paste a URL above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="flex items-center gap-4 p-4 bg-surface-2 border border-border rounded-xl group"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{doc.filename}</p>
                  <p className="text-xs text-text-secondary">
                    {doc.file_type.toUpperCase()}
                    {doc.chunk_count != null && ` \u2022 ${doc.chunk_count} chunks`}
                    {doc.file_size != null && ` \u2022 ${(doc.file_size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {statusIcon(doc.status)}
                  <span className="text-xs text-text-secondary capitalize">{doc.status}</span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-text-tertiary hover:text-danger rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
