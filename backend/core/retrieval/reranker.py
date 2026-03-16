from sentence_transformers import CrossEncoder

from core.retrieval.hybrid_retriever import RetrievalResult
from config import settings


class Reranker:
    _instance: "Reranker | None" = None
    _model: CrossEncoder | None = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load(self):
        if self._model is None:
            self._model = CrossEncoder(settings.RERANKER_MODEL)

    def rerank(
        self,
        query: str,
        candidates: list[RetrievalResult],
        top_k: int | None = None,
    ) -> list[RetrievalResult]:
        if not candidates:
            return []

        top_k = top_k or settings.TOP_K_RERANK
        self.load()

        # Create query-document pairs
        pairs = [(query, c.content) for c in candidates]

        # Score with cross-encoder
        scores = self._model.predict(pairs)

        # Attach scores and sort
        scored = list(zip(candidates, scores))
        scored.sort(key=lambda x: x[1], reverse=True)

        # Return top-k with updated scores
        results = []
        for candidate, score in scored[:top_k]:
            results.append(RetrievalResult(
                chunk_id=candidate.chunk_id,
                content=candidate.content,
                score=float(score),
                metadata=candidate.metadata,
            ))

        return results
