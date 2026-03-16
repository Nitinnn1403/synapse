import os
import uuid
import asyncio

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import crud
from api.schemas.documents import (
    DocumentUploadResponse, DocumentUrlRequest, DocumentResponse,
    DocumentStatusResponse, PaginatedDocuments, PaginatedChunks, ChunkResponse,
)
from core.document_processor.pipeline import process_document, _detect_file_type
from config import settings

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate file type
    file_type = _detect_file_type(file.filename or "unknown.txt")
    allowed = {"pdf", "docx", "txt"}
    if file_type not in allowed:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(allowed)}")

    # Save file to disk
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    doc_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "txt"
    save_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}.{ext}")

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # Create document record
    doc = await crud.create_document(
        db,
        id=doc_id,
        filename=file.filename or "unknown",
        file_type=file_type,
        original_path=save_path,
        file_size=len(content),
        status="pending",
    )

    # Process in background
    background_tasks.add_task(process_document, doc_id)

    return DocumentUploadResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        status=doc.status,
    )


@router.post("/url", response_model=DocumentUploadResponse)
async def ingest_url(
    request: DocumentUrlRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    doc_id = str(uuid.uuid4())

    doc = await crud.create_document(
        db,
        id=doc_id,
        filename=request.url,
        file_type="url",
        original_path=request.url,
        status="pending",
    )

    background_tasks.add_task(process_document, doc_id)

    return DocumentUploadResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        status=doc.status,
    )


@router.get("", response_model=PaginatedDocuments)
async def list_documents(
    status: str | None = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    docs = await crud.list_documents(db, status=status, page=page, limit=limit)
    return PaginatedDocuments(
        documents=[DocumentResponse.model_validate(d) for d in docs],
        page=page,
        limit=limit,
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return DocumentResponse.model_validate(doc)


@router.get("/{doc_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return DocumentStatusResponse(
        id=doc.id,
        status=doc.status,
        chunk_count=doc.chunk_count,
        error_message=doc.error_message,
    )


@router.get("/{doc_id}/chunks", response_model=PaginatedChunks)
async def get_document_chunks(
    doc_id: str,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    chunks = await crud.get_chunks_by_document(db, doc_id, page=page, limit=limit)
    return PaginatedChunks(
        chunks=[ChunkResponse.model_validate(c) for c in chunks],
        page=page,
        limit=limit,
    )


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    doc = await crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete from vector store
    from core.retrieval.vector_store import VectorStore
    from core.retrieval.bm25_index import BM25Index

    vector_store = VectorStore()
    vector_store.delete_by_document(doc_id)

    # Delete from BM25 index
    chunks = await crud.get_chunks_by_document(db, doc_id, page=1, limit=10000)
    chunk_ids = {c.id for c in chunks}
    bm25 = BM25Index()
    bm25.remove_document(chunk_ids)

    # Delete chunks and document from database
    await crud.delete_chunks_by_document(db, doc_id)
    await crud.delete_document(db, doc_id)

    # Delete file from disk
    if doc.original_path and os.path.exists(doc.original_path) and doc.file_type != "url":
        os.remove(doc.original_path)

    return {"success": True}
