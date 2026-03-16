import time
import logging
from dataclasses import dataclass
from typing import AsyncGenerator

from groq import Groq, AsyncGroq

from config import settings

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    content: str
    model: str
    tokens_used: int | None = None
    latency_ms: int | None = None


class LLMClient:
    _instance: "LLMClient | None" = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._client = Groq(api_key=settings.GROQ_API_KEY)
            cls._instance._async_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        return cls._instance

    async def generate(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        model = model or settings.GROQ_MODEL
        start = time.time()

        response = await self._async_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        latency = int((time.time() - start) * 1000)
        content = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else None

        return LLMResponse(
            content=content,
            model=model,
            tokens_used=tokens,
            latency_ms=latency,
        )

    async def generate_stream(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        model = model or settings.GROQ_MODEL

        stream = await self._async_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
