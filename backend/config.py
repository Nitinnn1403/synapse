import json
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_FAST: str = "llama-3.1-8b-instant"

    # Embedding
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # Retrieval
    TOP_K_RETRIEVAL: int = 20
    TOP_K_RERANK: int = 5
    BM25_WEIGHT: float = 0.3
    VECTOR_WEIGHT: float = 0.7

    # Chunking
    CHUNK_MIN_SIZE: int = 100
    CHUNK_MAX_SIZE: int = 1500
    SIMILARITY_THRESHOLD_PERCENTILE: int = 25

    # Storage
    UPLOAD_DIR: str = "./storage/uploads"
    CHROMA_PERSIST_DIR: str = "./storage/chroma_data"
    BM25_INDEX_DIR: str = "./storage/bm25_index"
    DATABASE_URL: str = "sqlite+aiosqlite:///./storage/rag_assistant.db"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = '["http://localhost:5173"]'

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
