import re
import json
import logging

from core.generation.llm_client import LLMClient
from core.retrieval.embedder import Embedder
from config import settings
import numpy as np

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> str:
    """Robustly extract JSON from an LLM response that may include prose or code fences."""
    text = text.strip()
    # Try to extract from a ```json ... ``` block
    m = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if m:
        return m.group(1).strip()
    # Try to find first { ... } or [ ... ] block
    for open_c, close_c in [('{', '}'), ('[', ']')]:
        start = text.find(open_c)
        if start == -1:
            continue
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == open_c:
                depth += 1
            elif ch == close_c:
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
    return text

FAITHFULNESS_PROMPT = """Given the following context and answer, extract individual claims from the answer, then determine if each claim is supported by the context.

Context:
{context}

Answer:
{answer}

For each claim:
1. List the claim
2. Indicate if it is SUPPORTED or NOT SUPPORTED by the context

Return your analysis as JSON:
{{"claims": [{{"claim": "...", "supported": true/false}}], "total": <int>, "supported_count": <int>}}"""

RELEVANCY_PROMPT = """Given the following answer, generate 3 questions that this answer could be responding to.

Answer:
{answer}

Return a JSON array of 3 questions:"""


class EvaluationMetrics:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
        self.embedder = Embedder()

    async def faithfulness(self, answer: str, contexts: list[str]) -> float:
        """What fraction of claims in the answer are supported by the context?"""
        context_str = "\n\n".join(contexts)
        prompt = FAITHFULNESS_PROMPT.format(context=context_str, answer=answer)

        try:
            response = await self.llm.generate(
                messages=[{"role": "user", "content": prompt}],
                model=settings.GROQ_MODEL_FAST,
                temperature=0.0,
                max_tokens=1024,
            )
            text = response.content.strip()
            data = json.loads(_extract_json(text))
            total = data.get("total", 1)
            supported = data.get("supported_count", 0)
            return supported / max(total, 1)
        except Exception as e:
            logger.warning(f"Faithfulness evaluation failed: {e}")
            return 0.5

    async def answer_relevancy(self, question: str, answer: str) -> float:
        """How relevant is the answer to the original question?"""
        prompt = RELEVANCY_PROMPT.format(answer=answer)

        try:
            response = await self.llm.generate(
                messages=[{"role": "user", "content": prompt}],
                model=settings.GROQ_MODEL_FAST,
                temperature=0.7,
                max_tokens=512,
            )
            text = response.content.strip()
            generated_questions = json.loads(_extract_json(text))
            if not isinstance(generated_questions, list):
                return 0.5

            # Compute similarity between original question and generated questions
            original_emb = self.embedder.encode(question)[0]
            gen_embs = self.embedder.encode(generated_questions)

            similarities = []
            for gen_emb in gen_embs:
                cos_sim = np.dot(original_emb, gen_emb) / (
                    np.linalg.norm(original_emb) * np.linalg.norm(gen_emb) + 1e-8
                )
                similarities.append(float(cos_sim))

            return sum(similarities) / len(similarities)
        except Exception as e:
            logger.warning(f"Answer relevancy evaluation failed: {e}")
            return 0.5

    async def context_precision(self, question: str, contexts: list[str]) -> float:
        """What fraction of retrieved contexts are actually relevant?"""
        prompt = f"""Given the question and the following contexts, determine which contexts are relevant to answering the question.

Question: {question}

Contexts:
{chr(10).join(f'[{i+1}] {c[:300]}' for i, c in enumerate(contexts))}

Return a JSON object: {{"relevant_indices": [list of 1-indexed relevant context numbers], "total": {len(contexts)}}}"""

        try:
            response = await self.llm.generate(
                messages=[{"role": "user", "content": prompt}],
                model=settings.GROQ_MODEL_FAST,
                temperature=0.0,
                max_tokens=256,
            )
            text = response.content.strip()
            data = json.loads(_extract_json(text))
            relevant = len(data.get("relevant_indices", []))
            total = data.get("total", len(contexts))
            return relevant / max(total, 1)
        except Exception as e:
            logger.warning(f"Context precision evaluation failed: {e}")
            return 0.5
