import json
import time
import logging
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import crud
from api.schemas.chat import (
    ChatQueryRequest, ChatQueryResponse, Citation,
    ConversationResponse, ConversationDetailResponse, MessageResponse,
    PaginatedConversations,
)
from core.retrieval.hybrid_retriever import HybridRetriever
from core.retrieval.reranker import Reranker
from core.generation.llm_client import LLMClient
from core.generation.prompt_templates import (
    RAG_SYSTEM_PROMPT, RAG_USER_PROMPT,
    INTENT_CLASSIFICATION_PROMPT, CONVERSATIONAL_SYSTEM_PROMPT,
)
from core.generation.conversation import ConversationManager
from core.generation.response_builder import ResponseBuilder
from core.evaluation.evaluator import Evaluator
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


async def _run_evaluation_bg(message_id: str):
    """Fire-and-forget: evaluate an assistant message after it's saved."""
    try:
        from db.database import async_session
        async with async_session() as db:
            evaluator = Evaluator()
            await evaluator.evaluate_message(message_id, db)
    except Exception as e:
        logger.warning(f"Background evaluation failed for {message_id}: {e}")


async def _enrich_citations_with_images(citations, db: AsyncSession) -> list[Citation]:
    """Look up extracted images for each citation's document+page and attach URLs."""
    enriched = []
    for c in citations:
        images: list[str] = []
        if c.page_number:
            doc_id = await crud.get_document_id_by_filename(db, c.document_name)
            if doc_id:
                doc_images = await crud.get_images_by_document_page(db, doc_id, c.page_number)
                images = [f"/images/{img.filename}" for img in doc_images]
        enriched.append(Citation(
            source_index=c.source_index,
            document_name=c.document_name,
            page_number=c.page_number,
            chunk_text=c.chunk_text,
            relevance_score=c.relevance_score,
            images=images,
        ))
    return enriched


async def _classify_intent(llm: LLMClient, question: str) -> str:
    """Classify whether a message is conversational or a document query."""
    try:
        response = await llm.generate(
            messages=[{"role": "user", "content": INTENT_CLASSIFICATION_PROMPT.format(question=question)}],
            model=settings.GROQ_MODEL_FAST,
            temperature=0.0,
            max_tokens=10,
        )
        intent = response.content.strip().lower().strip('"\'.')
        if "conversational" in intent:
            return "conversational"
    except Exception:
        pass
    return "document_query"


async def _handle_conversational(
    llm: LLMClient,
    question: str,
    conversation_id: str | None,
    db: AsyncSession,
) -> tuple[str, str]:
    """Handle a conversational message and return (answer, conv_id)."""
    messages = [
        {"role": "system", "content": CONVERSATIONAL_SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    llm_response = await llm.generate(messages=messages, temperature=0.7, max_tokens=512)

    if conversation_id:
        conv = await crud.get_conversation(db, conversation_id)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        conv_id = conv.id
    else:
        conv = await crud.create_conversation(db, title=question[:100])
        conv_id = conv.id

    await crud.create_message(db, conversation_id=conv_id, role="user", content=question)
    await crud.create_message(
        db, conversation_id=conv_id, role="assistant", content=llm_response.content,
        model_used=llm_response.model, tokens_used=llm_response.tokens_used,
    )

    return llm_response.content, conv_id


async def _build_context_with_images(contexts, db: AsyncSession) -> str:
    """Format retrieved contexts for the prompt, including image URLs for relevant pages."""
    parts = []
    for i, ctx in enumerate(contexts):
        source_label = f"[Source {i + 1}: {ctx.metadata.get('filename', 'Unknown')}"
        page = ctx.metadata.get("page_number")
        if page:
            source_label += f", Page {page}"
        source_label += "]"
        part = f"{source_label}\n{ctx.content}"

        if page:
            doc_id = await crud.get_document_id_by_filename(db, ctx.metadata.get("filename", ""))
            if doc_id:
                imgs = await crud.get_images_by_document_page(db, doc_id, page)
                if imgs:
                    figure_lines = "\n".join(
                        f"![Figure {j + 1}](http://localhost:8000/images/{img.filename})"
                        for j, img in enumerate(imgs)
                    )
                    part += f"\nFigures for this source (include inline if relevant to your answer):\n{figure_lines}"
        parts.append(part)
    return "\n\n".join(parts)


@router.post("/query", response_model=ChatQueryResponse)
async def chat_query(
    request: ChatQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    start_time = time.time()
    llm = LLMClient()

    intent = await _classify_intent(llm, request.question)

    if intent == "conversational":
        answer, conv_id = await _handle_conversational(llm, request.question, request.conversation_id, db)
        latency = int((time.time() - start_time) * 1000)
        return ChatQueryResponse(
            answer=answer,
            citations=[],
            confidence=None,
            conversation_id=conv_id,
            message_id="",
            model_used=settings.GROQ_MODEL,
            tokens_used=None,
            latency_ms=latency,
        )

    # --- Document query: full RAG pipeline ---

    conv_manager = ConversationManager(llm)
    standalone_question = await conv_manager.get_standalone_question(
        request.question, request.conversation_id, db
    )

    retriever = HybridRetriever()
    candidates = retriever.retrieve(
        query=standalone_question,
        document_ids=request.document_ids,
    )

    if not candidates:
        raise HTTPException(404, "No relevant content found. Please upload documents first.")

    reranker = Reranker()
    top_contexts = reranker.rerank(query=standalone_question, candidates=candidates)

    context_str = await _build_context_with_images(top_contexts, db)
    messages = [
        {"role": "system", "content": RAG_SYSTEM_PROMPT},
        {"role": "user", "content": RAG_USER_PROMPT.format(
            context=context_str, question=request.question
        )},
    ]

    llm_response = await llm.generate(messages=messages)

    builder = ResponseBuilder()
    built = builder.build(llm_response.content, top_contexts)

    if request.conversation_id:
        conv = await crud.get_conversation(db, request.conversation_id)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        conv_id = conv.id
    else:
        conv = await crud.create_conversation(db, title=request.question[:100])
        conv_id = conv.id

    await crud.create_message(db, conversation_id=conv_id, role="user", content=request.question)

    latency = int((time.time() - start_time) * 1000)
    enriched_citations = await _enrich_citations_with_images(built.citations, db)
    citations_json = json.dumps([{
        "source_index": c.source_index,
        "document_name": c.document_name,
        "page_number": c.page_number,
        "chunk_text": c.chunk_text,
        "relevance_score": c.relevance_score,
        "images": c.images,
    } for c in enriched_citations])

    assistant_msg = await crud.create_message(
        db,
        conversation_id=conv_id,
        role="assistant",
        content=built.answer,
        citations_json=citations_json,
        confidence=built.confidence,
        model_used=llm_response.model,
        tokens_used=llm_response.tokens_used,
        latency_ms=latency,
    )

    asyncio.create_task(_run_evaluation_bg(assistant_msg.id))

    return ChatQueryResponse(
        answer=built.answer,
        citations=enriched_citations,
        confidence=built.confidence,
        conversation_id=conv_id,
        message_id=assistant_msg.id,
        model_used=llm_response.model,
        tokens_used=llm_response.tokens_used,
        latency_ms=latency,
    )


@router.post("/query/stream")
async def chat_query_stream(
    request: ChatQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    llm = LLMClient()

    intent = await _classify_intent(llm, request.question)

    if intent == "conversational":
        async def stream_conversational():
            messages = [
                {"role": "system", "content": CONVERSATIONAL_SYSTEM_PROMPT},
                {"role": "user", "content": request.question},
            ]
            full_answer = ""
            async for token in llm.generate_stream(messages=messages, temperature=0.7, max_tokens=512):
                full_answer += token
                yield f"data: {json.dumps({'token': token})}\n\n"

            if request.conversation_id:
                conv = await crud.get_conversation(db, request.conversation_id)
                conv_id = conv.id if conv else None
            else:
                conv = await crud.create_conversation(db, title=request.question[:100])
                conv_id = conv.id

            if conv_id:
                await crud.create_message(db, conversation_id=conv_id, role="user", content=request.question)
                await crud.create_message(db, conversation_id=conv_id, role="assistant", content=full_answer)

            yield f"data: {json.dumps({'done': True, 'citations': [], 'confidence': None, 'conversation_id': conv_id})}\n\n"

        return StreamingResponse(stream_conversational(), media_type="text/event-stream")

    # --- Document query: full RAG pipeline ---

    conv_manager = ConversationManager(llm)
    standalone_question = await conv_manager.get_standalone_question(
        request.question, request.conversation_id, db
    )

    retriever = HybridRetriever()
    candidates = retriever.retrieve(query=standalone_question, document_ids=request.document_ids)
    if not candidates:
        raise HTTPException(404, "No relevant content found.")

    reranker = Reranker()
    top_contexts = reranker.rerank(query=standalone_question, candidates=candidates)

    context_str = await _build_context_with_images(top_contexts, db)
    messages = [
        {"role": "system", "content": RAG_SYSTEM_PROMPT},
        {"role": "user", "content": RAG_USER_PROMPT.format(
            context=context_str, question=request.question
        )},
    ]

    async def stream_response():
        full_answer = ""
        async for token in llm.generate_stream(messages=messages):
            full_answer += token
            yield f"data: {json.dumps({'token': token})}\n\n"

        builder = ResponseBuilder()
        built = builder.build(full_answer, top_contexts)

        if request.conversation_id:
            conv = await crud.get_conversation(db, request.conversation_id)
            conv_id = conv.id if conv else None
        else:
            conv = await crud.create_conversation(db, title=request.question[:100])
            conv_id = conv.id

        if conv_id:
            await crud.create_message(db, conversation_id=conv_id, role="user", content=request.question)
            enriched = await _enrich_citations_with_images(built.citations, db)
            citations_json = json.dumps([{
                "source_index": c.source_index, "document_name": c.document_name,
                "page_number": c.page_number, "chunk_text": c.chunk_text,
                "relevance_score": c.relevance_score, "images": c.images,
            } for c in enriched])
            asst_msg = await crud.create_message(
                db, conversation_id=conv_id, role="assistant", content=built.answer,
                citations_json=citations_json, confidence=built.confidence,
            )
            asyncio.create_task(_run_evaluation_bg(asst_msg.id))
        else:
            enriched = await _enrich_citations_with_images(built.citations, db)

        yield f"data: {json.dumps({'done': True, 'citations': [{'source_index': c.source_index, 'document_name': c.document_name, 'page_number': c.page_number, 'chunk_text': c.chunk_text, 'relevance_score': c.relevance_score, 'images': c.images} for c in enriched], 'confidence': built.confidence, 'conversation_id': conv_id})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


@router.get("/conversations", response_model=PaginatedConversations)
async def list_conversations(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    convs = await crud.list_conversations(db, page=page, limit=limit)
    return PaginatedConversations(
        conversations=[ConversationResponse.model_validate(c) for c in convs],
        page=page,
        limit=limit,
    )


@router.get("/conversations/{conv_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conv_id: str,
    db: AsyncSession = Depends(get_db),
):
    conv = await crud.get_conversation(db, conv_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")

    messages = []
    for msg in conv.messages:
        citations = None
        if msg.citations_json:
            try:
                citations = [Citation(**c) for c in json.loads(msg.citations_json)]
            except Exception:
                pass
        messages.append(MessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            citations=citations,
            confidence=msg.confidence,
            created_at=msg.created_at,
        ))

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        messages=messages,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: str,
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.delete_conversation(db, conv_id)
    if not deleted:
        raise HTTPException(404, "Conversation not found")
    return {"success": True}
