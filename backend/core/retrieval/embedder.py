import numpy as np
from sentence_transformers import SentenceTransformer

from config import settings


class Embedder:
    _instance: "Embedder | None" = None
    _model: SentenceTransformer | None = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load(self):
        if self._model is None:
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def encode(self, texts: list[str] | str) -> np.ndarray:
        self.load()
        if isinstance(texts, str):
            texts = [texts]
        return self._model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
