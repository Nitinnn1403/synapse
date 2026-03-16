import os
import uuid
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from core.document_processor.base import ParsedDocument
from core.document_processor.pdf_parser import PDFParser
from core.document_processor.docx_parser import DocxParser
from core.document_processor.txt_parser import TxtParser
from core.document_processor.url_parser import UrlParser
from core.document_processor.chunker import SemanticChunker
from core.retrieval.embedder import Embedder
from core.retrieval.vector_store import VectorStore
from core.retrieval.bm25_index import BM25Index
from db import crud
from db.database import async_session

logger = logging.getLogger(__name__)

PARSERS = {
    "pdf": PDFParser(),
    "docx": DocxParser(),
    "txt": TxtParser(),
    "url": UrlParser(),
}


def _detect_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return "pdf"
    elif ext in ("docx", "doc"):
        return "docx"
    elif ext in ("txt", "text", "md"):
        return "txt"
    return "txt"


async def process_document(document_id: str):
    """Background task: parse, chunk, embed, and store a document."""
    async with async_session() as db:
        try:
            doc = await crud.get_document(db, document_id)
            if not doc:
                logger.error(f"Document {document_id} not found")
                return

            # Update status
            await crud.update_document(db, document_id, status="processing")

            # Select parser
            file_type = doc.file_type
            parser = PARSERS.get(file_type)
            if not parser:
                await crud.update_document(db, document_id, status="error", error_message=f"Unsupported file type: {file_type}")
                return

            # Parse  (pass document_id so PDFParser namespaces extracted images)
            if hasattr(parser, 'parse') and file_type == 'pdf':
                parsed: ParsedDocument = await parser.parse(doc.original_path, document_id=doc.id)
            else:
                parsed: ParsedDocument = await parser.parse(doc.original_path)

            # Build page number mapping (char offset -> page number)
            page_numbers: dict[int, int] = {}
            offset = 0
            for page in parsed.pages:
                page_numbers[offset] = page.page_number
                offset += len(page.text) + 2  # +2 for "\n\n" separator

            # Chunk
            embedder = Embedder()
            chunker = SemanticChunker(embedder)
            chunk_results = chunker.chunk(parsed.text, page_numbers)

            if not chunk_results:
                await crud.update_document(db, document_id, status="ready", chunk_count=0)
                return

            # Generate chunk IDs and prepare data
            chunk_dicts = []
            chunk_texts = []
            for cr in chunk_results:
                chunk_id = str(uuid.uuid4())
                chunk_dicts.append({
                    "id": chunk_id,
                    "document_id": document_id,
                    "content": cr.content,
                    "chunk_index": cr.chunk_index,
                    "page_number": cr.page_number,
                    "section_title": cr.section_title,
                    "start_char": cr.start_char,
                    "end_char": cr.end_char,
                })
                chunk_texts.append(cr.content)

            # Embed
            embeddings = embedder.encode(chunk_texts)

            # Store in ChromaDB
            vector_store = VectorStore()
            vector_store.add_chunks(
                ids=[c["id"] for c in chunk_dicts],
                documents=chunk_texts,
                embeddings=embeddings.tolist(),
                metadatas=[{
                    "document_id": document_id,
                    "user_id": doc.user_id,
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "page_number": c["page_number"] or 0,
                    "chunk_index": c["chunk_index"],
                } for c in chunk_dicts],
            )

            # Store in BM25
            bm25 = BM25Index()
            bm25.add_documents([{"id": c["id"], "content": c["content"], "user_id": doc.user_id} for c in chunk_dicts])

            # Store chunks in database
            await crud.create_chunks(db, chunk_dicts)

            # Store extracted images in database
            if parsed.images:
                image_dicts = [
                    {
                        "document_id": document_id,
                        "page_number": img.page_number or 0,
                        "filename": img.filename,
                    }
                    for img in parsed.images
                ]
                await crud.create_document_images(db, image_dicts)

            # Update document
            await crud.update_document(
                db, document_id,
                status="ready",
                chunk_count=len(chunk_dicts),
                page_count=len(parsed.pages),
            )

            logger.info(f"Document {document_id} processed: {len(chunk_dicts)} chunks")

        except Exception as e:
            logger.exception(f"Error processing document {document_id}")
            async with async_session() as db2:
                await crud.update_document(db2, document_id, status="error", error_message=str(e))
