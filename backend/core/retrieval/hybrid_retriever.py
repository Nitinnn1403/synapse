from dataclasses import dataclass

import numpy as np

from core.retrieval.vector_store import VectorStore
from core.retrieval.bm25_index import BM25Index
from core.retrieval.embedder import Embedder
from config import settings


@dataclass
class RetrievalResult:
    chunk_id: str
    content: str
    score: float
    metadata: dict


class HybridRetriever:
    def __init__(self):
        self.embedder = Embedder()
        self.vector_store = VectorStore()
        self.bm25 = BM25Index()

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        document_ids: list[str] | None = None,
        user_id: str | None = None,
    ) -> list[RetrievalResult]:
        top_k = top_k or settings.TOP_K_RETRIEVAL

        # Vector search — filter by user_id and optionally document_ids
        query_embedding = self.embedder.encode(query)[0].tolist()
        where_filter: dict | None = None
        conditions = []
        if user_id:
            conditions.append({"user_id": user_id})
        if document_ids:
            if len(document_ids) == 1:
                conditions.append({"document_id": document_ids[0]})
            else:
                conditions.append({"document_id": {"$in": document_ids}})
        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

        vector_results = self.vector_store.query(
            query_embedding=query_embedding,
            n_results=top_k,
            where=where_filter,
        )

        # BM25 search — filter to user's chunks only
        bm25_results = self.bm25.search(query, top_k=top_k, user_id=user_id)

        # Reciprocal Rank Fusion
        return self._rrf_fuse(vector_results, bm25_results, top_k)

    def _rrf_fuse(
        self, vector_results: dict, bm25_results: list[dict], top_k: int, k: int = 60
    ) -> list[RetrievalResult]:
        """Reciprocal Rank Fusion to merge vector and BM25 results."""
        rrf_scores: dict[str, float] = {}
        chunk_data: dict[str, dict] = {}

        # Process vector results
        if vector_results and vector_results.get("ids") and vector_results["ids"][0]:
            ids = vector_results["ids"][0]
            documents = vector_results["documents"][0]
            metadatas = vector_results["metadatas"][0]
            distances = vector_results["distances"][0]

            for rank, (cid, doc, meta, dist) in enumerate(zip(ids, documents, metadatas, distances)):
                rrf_scores[cid] = rrf_scores.get(cid, 0) + settings.VECTOR_WEIGHT / (k + rank + 1)
                chunk_data[cid] = {"content": doc, "metadata": meta}

        # Process BM25 results
        for rank, result in enumerate(bm25_results):
            cid = result["chunk_id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0) + settings.BM25_WEIGHT / (k + rank + 1)
            # BM25 doesn't return content, so we keep vector data if available

        # Sort by RRF score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:top_k]

        results = []
        for cid in sorted_ids:
            data = chunk_data.get(cid, {"content": "", "metadata": {}})
            results.append(RetrievalResult(
                chunk_id=cid,
                content=data["content"],
                score=rrf_scores[cid],
                metadata=data["metadata"],
            ))

        return results
