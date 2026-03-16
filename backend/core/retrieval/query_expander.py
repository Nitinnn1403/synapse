import json
import logging

from core.generation.llm_client import LLMClient
from config import settings

logger = logging.getLogger(__name__)

EXPANSION_PROMPT = """Given the user's question, generate 3 alternative phrasings that capture the same intent but use different words. Return ONLY a JSON array of strings, nothing else.

User question: {question}

JSON array:"""


class QueryExpander:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def expand(self, question: str) -> list[str]:
        """Generate alternative phrasings of the question."""
        try:
            prompt = EXPANSION_PROMPT.format(question=question)
            response = await self.llm.generate(
                messages=[{"role": "user", "content": prompt}],
                model=settings.GROQ_MODEL_FAST,
                temperature=0.7,
                max_tokens=256,
            )
            # Parse JSON array from response
            text = response.content.strip()
            # Handle potential markdown code blocks
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            variations = json.loads(text)
            if isinstance(variations, list):
                return [question] + [str(v) for v in variations[:3]]
        except Exception as e:
            logger.warning(f"Query expansion failed: {e}")

        return [question]
