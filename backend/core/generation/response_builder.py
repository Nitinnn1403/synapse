import re
from dataclasses import dataclass, field

from core.retrieval.hybrid_retriever import RetrievalResult


@dataclass
class Citation:
    source_index: int
    document_name: str
    page_number: int | None
    chunk_text: str
    relevance_score: float
    images: list[str] = field(default_factory=list)


@dataclass
class BuiltResponse:
    answer: str
    citations: list[Citation]
    confidence: float


class ResponseBuilder:
    def build(self, raw_answer: str, contexts: list[RetrievalResult]) -> BuiltResponse:
        """Parse [Source N] references and build structured citations."""
        # Build source mapping
        source_map: dict[int, RetrievalResult] = {}
        for i, ctx in enumerate(contexts):
            source_map[i + 1] = ctx

        # Find all [Source N] references in the answer
        referenced_indices = set()
        for match in re.finditer(r'\[Source\s+(\d+)\]', raw_answer):
            idx = int(match.group(1))
            if idx in source_map:
                referenced_indices.add(idx)

        # Build citations for referenced sources
        citations: list[Citation] = []
        for idx in sorted(referenced_indices):
            ctx = source_map[idx]
            citations.append(Citation(
                source_index=idx,
                document_name=ctx.metadata.get("filename", "Unknown"),
                page_number=ctx.metadata.get("page_number"),
                chunk_text=ctx.content[:500],  # Truncate for response size
                relevance_score=ctx.score,
            ))

        # If no sources were referenced, include all contexts as citations
        if not citations and contexts:
            for i, ctx in enumerate(contexts):
                citations.append(Citation(
                    source_index=i + 1,
                    document_name=ctx.metadata.get("filename", "Unknown"),
                    page_number=ctx.metadata.get("page_number"),
                    chunk_text=ctx.content[:500],
                    relevance_score=ctx.score,
                ))

        # Compute confidence from average reranker scores
        if contexts:
            avg_score = sum(c.score for c in contexts) / len(contexts)
            # Normalize to 0-1 range (cross-encoder scores can be negative)
            confidence = max(0.0, min(1.0, (avg_score + 5) / 10))
        else:
            confidence = 0.0

        return BuiltResponse(
            answer=raw_answer,
            citations=citations,
            confidence=round(confidence, 3),
        )
