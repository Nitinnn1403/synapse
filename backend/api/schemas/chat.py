from pydantic import BaseModel, Field
from datetime import datetime


class Citation(BaseModel):
    source_index: int
    document_name: str
    page_number: int | None = None
    chunk_text: str
    relevance_score: float
    images: list[str] = []


class ChatQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="The question to ask")
    conversation_id: str | None = Field(None, description="Existing conversation to continue")
    document_ids: list[str] | None = Field(None, description="Filter to specific documents")


class ChatQueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    confidence: float | None = None
    conversation_id: str
    message_id: str
    model_used: str
    tokens_used: int | None = None
    latency_ms: int | None = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: list[Citation] | None = None
    confidence: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    title: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(BaseModel):
    id: str
    title: str | None = None
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime


class PaginatedConversations(BaseModel):
    conversations: list[ConversationResponse]
    page: int
    limit: int
