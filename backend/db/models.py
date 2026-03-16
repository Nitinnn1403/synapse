import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from db.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt, url
    original_path = Column(String)
    file_size = Column(Integer)
    page_count = Column(Integer)
    chunk_count = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending, processing, ready, error
    error_message = Column(Text)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
    images = relationship("DocumentImage", back_populates="document", cascade="all, delete-orphan")


class DocumentImage(Base):
    __tablename__ = "document_images"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    page_number = Column(Integer, nullable=False)
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    document = relationship("Document", back_populates="images")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer)
    section_title = Column(String)
    start_char = Column(Integer)
    end_char = Column(Integer)
    metadata_json = Column(Text)
    created_at = Column(DateTime, default=utcnow)

    document = relationship("Document", back_populates="chunks")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations_json = Column(Text)
    confidence = Column(Float)
    model_used = Column(String)
    tokens_used = Column(Integer)
    latency_ms = Column(Integer)
    created_at = Column(DateTime, default=utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    evaluation = relationship("Evaluation", back_populates="message", uselist=False, cascade="all, delete-orphan")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    faithfulness = Column(Float)
    answer_relevancy = Column(Float)
    context_precision = Column(Float)
    context_recall = Column(Float)
    hallucination_score = Column(Float)
    retrieval_precision = Column(Float)
    created_at = Column(DateTime, default=utcnow)

    message = relationship("Message", back_populates="evaluation")
