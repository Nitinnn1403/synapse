import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from core.evaluation.metrics import EvaluationMetrics
from core.generation.llm_client import LLMClient
from db import crud

logger = logging.getLogger(__name__)


class Evaluator:
    def __init__(self):
        self.llm = LLMClient()
        self.metrics = EvaluationMetrics(self.llm)

    async def evaluate_message(self, message_id: str, db: AsyncSession) -> dict:
        """Run all evaluation metrics on a message."""
        msg = await crud.get_conversation_messages(db, "")  # need to find by message_id
        # Get the message directly
        from sqlalchemy import select
        from db.models import Message
        stmt = select(Message).where(Message.id == message_id)
        result = await db.execute(stmt)
        message = result.scalar_one_or_none()

        if not message or message.role != "assistant":
            raise ValueError("Message not found or is not an assistant message")

        # Get the preceding user question
        from db.models import Message as MsgModel
        stmt = (
            select(MsgModel)
            .where(MsgModel.conversation_id == message.conversation_id)
            .where(MsgModel.role == "user")
            .where(MsgModel.created_at <= message.created_at)
            .order_by(MsgModel.created_at.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        user_msg = result.scalar_one_or_none()
        question = user_msg.content if user_msg else "Unknown question"

        # Get contexts from citations
        contexts = []
        if message.citations_json:
            try:
                citations = json.loads(message.citations_json)
                contexts = [c.get("chunk_text", "") for c in citations if c.get("chunk_text")]
            except Exception:
                pass

        # Run metrics
        faithfulness = await self.metrics.faithfulness(message.content, contexts)
        relevancy = await self.metrics.answer_relevancy(question, message.content)
        precision = await self.metrics.context_precision(question, contexts) if contexts else 0.0
        hallucination = 1.0 - faithfulness

        # Store evaluation
        evaluation = await crud.create_evaluation(
            db,
            message_id=message_id,
            faithfulness=round(faithfulness, 3),
            answer_relevancy=round(relevancy, 3),
            context_precision=round(precision, 3),
            hallucination_score=round(hallucination, 3),
        )

        return {
            "id": evaluation.id,
            "message_id": message_id,
            "faithfulness": evaluation.faithfulness,
            "answer_relevancy": evaluation.answer_relevancy,
            "context_precision": evaluation.context_precision,
            "hallucination_score": evaluation.hallucination_score,
            "created_at": str(evaluation.created_at),
        }
