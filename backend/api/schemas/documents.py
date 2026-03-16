from pydantic import BaseModel, Field
from datetime import datetime


class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    status: str

    model_config = {"from_attributes": True}


class DocumentUrlRequest(BaseModel):
    url: str = Field(..., description="URL to scrape and ingest")


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    original_path: str | None = None
    file_size: int | None = None
    page_count: int | None = None
    chunk_count: int | None = None
    status: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    chunk_count: int | None = None
    error_message: str | None = None


class ChunkResponse(BaseModel):
    id: str
    document_id: str
    content: str
    chunk_index: int
    page_number: int | None = None
    section_title: str | None = None

    model_config = {"from_attributes": True}


class PaginatedDocuments(BaseModel):
    documents: list[DocumentResponse]
    page: int
    limit: int


class PaginatedChunks(BaseModel):
    chunks: list[ChunkResponse]
    page: int
    limit: int
