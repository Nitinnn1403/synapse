import os

from core.document_processor.base import BaseParser, ParsedDocument, PageContent


class TxtParser(BaseParser):
    async def parse(self, file_path: str) -> ParsedDocument:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()

        page = PageContent(page_number=1, text=text)

        return ParsedDocument(
            text=text,
            pages=[page],
            metadata={"filename": os.path.basename(file_path)},
        )
