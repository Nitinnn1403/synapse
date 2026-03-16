import numpy as np
from dataclasses import dataclass

from config import settings


@dataclass
class ChunkResult:
    content: str
    chunk_index: int
    page_number: int | None
    section_title: str | None
    start_char: int
    end_char: int


class SemanticChunker:
    def __init__(self, embedder):
        self.embedder = embedder
        self.min_size = settings.CHUNK_MIN_SIZE
        self.max_size = settings.CHUNK_MAX_SIZE

    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences using basic rules (avoids spaCy dependency for speed)."""
        import re
        # Split on sentence-ending punctuation followed by space and uppercase letter
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        # Also split on newlines that separate paragraphs
        result = []
        for sent in sentences:
            parts = sent.split('\n\n')
            result.extend(p.strip() for p in parts if p.strip())
        return result

    def chunk(self, text: str, page_numbers: dict[int, int] | None = None) -> list[ChunkResult]:
        """
        Semantic chunking using embedding similarity between consecutive sentences.

        page_numbers: mapping of character offset -> page number
        """
        sentences = self._split_sentences(text)
        if not sentences:
            return []

        # If text is short enough, return as single chunk
        if len(text) <= self.max_size:
            return [ChunkResult(
                content=text,
                chunk_index=0,
                page_number=self._get_page_number(0, page_numbers),
                section_title=None,
                start_char=0,
                end_char=len(text),
            )]

        # Compute sentence embeddings
        embeddings = self.embedder.encode(sentences)

        # Compute cosine similarities between consecutive sentences
        similarities = []
        for i in range(len(embeddings) - 1):
            a = embeddings[i]
            b = embeddings[i + 1]
            cos_sim = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)
            similarities.append(cos_sim)

        # Find breakpoints where similarity drops below threshold
        if similarities:
            threshold_percentile = settings.SIMILARITY_THRESHOLD_PERCENTILE
            threshold = np.percentile(similarities, threshold_percentile)
            breakpoints = [i + 1 for i, sim in enumerate(similarities) if sim < threshold]
        else:
            breakpoints = []

        # Group sentences into chunks
        chunks: list[list[str]] = []
        current_group: list[str] = []
        for i, sentence in enumerate(sentences):
            current_group.append(sentence)
            if i + 1 in breakpoints or i == len(sentences) - 1:
                chunks.append(current_group)
                current_group = []

        # Enforce min/max size constraints
        merged_chunks = self._enforce_size_constraints(chunks)

        # Build ChunkResult objects
        results: list[ChunkResult] = []
        char_offset = 0
        for idx, chunk_sentences in enumerate(merged_chunks):
            content = " ".join(chunk_sentences)
            start_char = text.find(chunk_sentences[0], char_offset)
            if start_char == -1:
                start_char = char_offset
            end_char = start_char + len(content)
            char_offset = start_char + len(chunk_sentences[0])

            results.append(ChunkResult(
                content=content,
                chunk_index=idx,
                page_number=self._get_page_number(start_char, page_numbers),
                section_title=None,
                start_char=start_char,
                end_char=end_char,
            ))

        return results

    def _enforce_size_constraints(self, chunks: list[list[str]]) -> list[list[str]]:
        """Merge small chunks with neighbors, split oversized ones."""
        # Merge small chunks
        merged = []
        buffer: list[str] = []
        for chunk in chunks:
            buffer.extend(chunk)
            combined = " ".join(buffer)
            if len(combined) >= self.min_size:
                merged.append(buffer)
                buffer = []
        if buffer:
            if merged:
                merged[-1].extend(buffer)
            else:
                merged.append(buffer)

        # Split oversized chunks
        final = []
        for chunk in merged:
            combined = " ".join(chunk)
            if len(combined) <= self.max_size:
                final.append(chunk)
            else:
                # Split at sentence boundaries
                current: list[str] = []
                for sent in chunk:
                    test = " ".join(current + [sent])
                    if len(test) > self.max_size and current:
                        final.append(current)
                        current = [sent]
                    else:
                        current.append(sent)
                if current:
                    final.append(current)

        return final

    def _get_page_number(self, char_offset: int, page_numbers: dict[int, int] | None) -> int | None:
        if not page_numbers:
            return None
        # Find the page number for the given character offset
        page = None
        for offset, pn in sorted(page_numbers.items()):
            if offset <= char_offset:
                page = pn
            else:
                break
        return page
