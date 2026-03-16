import chromadb

from config import settings


class VectorStore:
    _instance: "VectorStore | None" = None
    _client = None
    _collection = None

    COLLECTION_NAME = "document_chunks"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load(self):
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIR,
            )
            self._collection = self._client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )

    @property
    def collection(self):
        self.load()
        return self._collection

    def add_chunks(
        self,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict],
    ):
        self.collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def query(
        self,
        query_embedding: list[float],
        n_results: int = 20,
        where: dict | None = None,
    ) -> dict:
        kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where
        return self.collection.query(**kwargs)

    def delete_by_document(self, document_id: str):
        self.collection.delete(where={"document_id": document_id})

    def count(self) -> int:
        return self.collection.count()
