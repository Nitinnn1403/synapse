from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import Document, Chunk, Conversation, Message, Evaluation, DocumentImage


# --- Documents ---

async def create_document(db: AsyncSession, **kwargs) -> Document:
    doc = Document(**kwargs)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def get_document(db: AsyncSession, doc_id: str) -> Document | None:
    return await db.get(Document, doc_id)


async def list_documents(
    db: AsyncSession,
    status: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> list[Document]:
    stmt = select(Document).order_by(Document.created_at.desc())
    if status:
        stmt = stmt.where(Document.status == status)
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_document(db: AsyncSession, doc_id: str, **kwargs) -> Document | None:
    doc = await db.get(Document, doc_id)
    if not doc:
        return None
    for key, value in kwargs.items():
        setattr(doc, key, value)
    await db.commit()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, doc_id: str) -> bool:
    doc = await db.get(Document, doc_id)
    if not doc:
        return False
    await db.delete(doc)
    await db.commit()
    return True


# --- Chunks ---

async def create_chunks(db: AsyncSession, chunks: list[dict]) -> list[Chunk]:
    chunk_objects = [Chunk(**c) for c in chunks]
    db.add_all(chunk_objects)
    await db.commit()
    return chunk_objects


async def get_chunks_by_document(db: AsyncSession, doc_id: str, page: int = 1, limit: int = 50) -> list[Chunk]:
    stmt = (
        select(Chunk)
        .where(Chunk.document_id == doc_id)
        .order_by(Chunk.chunk_index)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_chunks_by_ids(db: AsyncSession, chunk_ids: list[str]) -> list[Chunk]:
    stmt = select(Chunk).where(Chunk.id.in_(chunk_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_chunks_by_document(db: AsyncSession, doc_id: str) -> int:
    stmt = select(Chunk).where(Chunk.document_id == doc_id)
    result = await db.execute(stmt)
    chunks = result.scalars().all()
    count = len(chunks)
    for chunk in chunks:
        await db.delete(chunk)
    await db.commit()
    return count


# --- Document Images ---

async def create_document_images(db: AsyncSession, images: list[dict]) -> None:
    db.add_all([DocumentImage(**img) for img in images])
    await db.commit()


async def get_images_by_document_page(db: AsyncSession, document_id: str, page_number: int) -> list[DocumentImage]:
    stmt = select(DocumentImage).where(
        DocumentImage.document_id == document_id,
        DocumentImage.page_number == page_number,
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_document_id_by_filename(db: AsyncSession, filename: str) -> str | None:
    stmt = select(Document.id).where(Document.filename == filename)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# --- Conversations ---

async def create_conversation(db: AsyncSession, title: str | None = None) -> Conversation:
    conv = Conversation(title=title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def get_conversation(db: AsyncSession, conv_id: str) -> Conversation | None:
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conv_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_conversations(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
) -> list[Conversation]:
    stmt = (
        select(Conversation)
        .order_by(Conversation.updated_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_conversation(db: AsyncSession, conv_id: str) -> bool:
    conv = await db.get(Conversation, conv_id)
    if not conv:
        return False
    await db.delete(conv)
    await db.commit()
    return True


# --- Messages ---

async def create_message(db: AsyncSession, **kwargs) -> Message:
    msg = Message(**kwargs)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_conversation_messages(db: AsyncSession, conv_id: str, limit: int = 10) -> list[Message]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(reversed(result.scalars().all()))


async def get_message(db: AsyncSession, message_id: str) -> Message | None:
    return await db.get(Message, message_id)


# --- Evaluations ---

async def create_evaluation(db: AsyncSession, **kwargs) -> Evaluation:
    ev = Evaluation(**kwargs)
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return ev


async def get_evaluation_by_message(db: AsyncSession, message_id: str) -> Evaluation | None:
    stmt = select(Evaluation).where(Evaluation.message_id == message_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_evaluations(
    db: AsyncSession,
    page: int = 1,
    limit: int = 50,
) -> list[Evaluation]:
    stmt = (
        select(Evaluation)
        .order_by(Evaluation.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_evaluation_averages(db: AsyncSession) -> dict:
    stmt = select(
        func.avg(Evaluation.faithfulness),
        func.avg(Evaluation.answer_relevancy),
        func.avg(Evaluation.context_precision),
        func.avg(Evaluation.hallucination_score),
        func.count(Evaluation.id),
    )
    result = await db.execute(stmt)
    row = result.one()
    return {
        "avg_faithfulness": row[0],
        "avg_answer_relevancy": row[1],
        "avg_context_precision": row[2],
        "avg_hallucination_score": row[3],
        "total_evaluations": row[4],
    }
