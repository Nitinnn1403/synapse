import logging

from sqlalchemy.ext.asyncio import AsyncSession

from core.generation.llm_client import LLMClient
from core.generation.prompt_templates import CONVERSATION_CONDENSE_PROMPT
from db import crud
from config import settings

logger = logging.getLogger(__name__)


class ConversationManager:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def get_standalone_question(
        self, question: str, conversation_id: str | None, db: AsyncSession
    ) -> str:
        """If there's conversation history, condense the follow-up into a standalone question."""
        if not conversation_id:
            return question

        messages = await crud.get_conversation_messages(db, conversation_id, limit=10)
        if not messages:
            return question

        # Build history string
        history_parts = []
        for msg in messages:
            role = "Human" if msg.role == "user" else "Assistant"
            history_parts.append(f"{role}: {msg.content}")
        history = "\n".join(history_parts)

        prompt = CONVERSATION_CONDENSE_PROMPT.format(
            history=history,
            question=question,
        )

        response = await self.llm.generate(
            messages=[{"role": "user", "content": prompt}],
            model=settings.GROQ_MODEL_FAST,
            temperature=0.0,
            max_tokens=256,
        )

        standalone = response.content.strip()
        logger.info(f"Condensed question: '{question}' -> '{standalone}'")
        return standalone
