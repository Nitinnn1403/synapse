from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ExtractedImage:
    filename: str
    page_number: int | None = None
    caption: str | None = None


@dataclass
class ExtractedTable:
    markdown: str
    page_number: int | None = None
    caption: str | None = None


@dataclass
class PageContent:
    page_number: int
    text: str
    tables: list[ExtractedTable] = field(default_factory=list)
    images: list[ExtractedImage] = field(default_factory=list)


@dataclass
class ParsedDocument:
    text: str
    pages: list[PageContent]
    metadata: dict = field(default_factory=dict)
    images: list[ExtractedImage] = field(default_factory=list)
    tables: list[ExtractedTable] = field(default_factory=list)


class BaseParser(ABC):
    @abstractmethod
    async def parse(self, file_path: str) -> ParsedDocument:
        ...
