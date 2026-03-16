import json
import os
import pickle
import re

from rank_bm25 import BM25Okapi

from config import settings


class BM25Index:
    _instance: "BM25Index | None" = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._corpus = []  # list of {"chunk_id": str, "tokens": list[str]}
            cls._instance._bm25 = None
            cls._instance._load_from_disk()
        return cls._instance

    def _tokenize(self, text: str) -> list[str]:
        """Simple tokenizer: lowercase, split on non-alphanumeric, remove short tokens."""
        tokens = re.findall(r'\b\w+\b', text.lower())
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and", "or", "not", "it", "this", "that", "with", "as", "by", "from"}
        return [t for t in tokens if t not in stop_words and len(t) > 1]

    def add_documents(self, chunks: list[dict]):
        """Add chunks to the index. Each chunk: {'id': str, 'content': str, 'user_id': str}"""
        for chunk in chunks:
            tokens = self._tokenize(chunk["content"])
            self._corpus.append({"chunk_id": chunk["id"], "tokens": tokens, "user_id": chunk.get("user_id", "")})
        self._rebuild_index()
        self._save_to_disk()

    def search(self, query: str, top_k: int = 20, user_id: str | None = None) -> list[dict]:
        """Search the index. Returns list of {'chunk_id': str, 'score': float}."""
        if not self._bm25 or not self._corpus:
            return []
        tokens = self._tokenize(query)

        # Filter corpus to this user's chunks only
        if user_id:
            filtered = [(i, c) for i, c in enumerate(self._corpus) if c.get("user_id") == user_id]
        else:
            filtered = list(enumerate(self._corpus))

        if not filtered:
            return []

        # Score only the filtered subset
        all_scores = self._bm25.get_scores(tokens)
        scored = [(self._corpus[i]["chunk_id"], float(all_scores[i])) for i, _ in filtered if all_scores[i] > 0]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [{"chunk_id": cid, "score": score} for cid, score in scored[:top_k]]

    def remove_document(self, chunk_ids: set[str]):
        """Remove chunks by their IDs and rebuild."""
        self._corpus = [c for c in self._corpus if c["chunk_id"] not in chunk_ids]
        self._rebuild_index()
        self._save_to_disk()

    def _rebuild_index(self):
        if self._corpus:
            tokenized = [c["tokens"] for c in self._corpus]
            self._bm25 = BM25Okapi(tokenized)
        else:
            self._bm25 = None

    def _save_to_disk(self):
        os.makedirs(settings.BM25_INDEX_DIR, exist_ok=True)
        corpus_path = os.path.join(settings.BM25_INDEX_DIR, "corpus.json")
        with open(corpus_path, "w") as f:
            json.dump(self._corpus, f)

    def _load_from_disk(self):
        corpus_path = os.path.join(settings.BM25_INDEX_DIR, "corpus.json")
        if os.path.exists(corpus_path):
            with open(corpus_path, "r") as f:
                self._corpus = json.load(f)
            self._rebuild_index()
