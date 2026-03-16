import os
import fitz  # PyMuPDF

from core.document_processor.base import (
    BaseParser, ParsedDocument, PageContent, ExtractedTable, ExtractedImage
)
from config import settings


class PDFParser(BaseParser):
    async def parse(self, file_path: str, document_id: str | None = None) -> ParsedDocument:
        doc = fitz.open(file_path)
        pages: list[PageContent] = []
        all_tables: list[ExtractedTable] = []
        all_images: list[ExtractedImage] = []
        full_text_parts: list[str] = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_number = page_num + 1

            # Extract text
            text = page.get_text("text")

            # Extract tables
            page_tables: list[ExtractedTable] = []
            try:
                tables = page.find_tables()
                for table in tables:
                    df = table.to_pandas()
                    markdown = df.to_markdown(index=False)
                    et = ExtractedTable(markdown=markdown, page_number=page_number)
                    page_tables.append(et)
                    all_tables.append(et)
            except Exception:
                pass

            # Extract images
            page_images: list[ExtractedImage] = []
            try:
                image_list = page.get_images(full=True)
                for img_index, img_info in enumerate(image_list):
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    if base_image:
                        ext = base_image["ext"]
                        subdir = document_id if document_id else "unscoped"
                        img_filename = f"{subdir}/page{page_number}_img{img_index + 1}.{ext}"
                        img_path = os.path.join(settings.UPLOAD_DIR, "..", "extracted_images", img_filename)
                        os.makedirs(os.path.dirname(img_path), exist_ok=True)
                        with open(img_path, "wb") as f:
                            f.write(base_image["image"])
                        ei = ExtractedImage(filename=img_filename, page_number=page_number)
                        page_images.append(ei)
                        all_images.append(ei)
            except Exception:
                pass

            # Combine text with table markdown
            combined_text = text
            if page_tables:
                combined_text += "\n\n" + "\n\n".join(t.markdown for t in page_tables)

            pages.append(PageContent(
                page_number=page_number,
                text=combined_text,
                tables=page_tables,
                images=page_images,
            ))
            full_text_parts.append(combined_text)

        doc.close()

        return ParsedDocument(
            text="\n\n".join(full_text_parts),
            pages=pages,
            metadata={
                "page_count": len(pages),
                "filename": os.path.basename(file_path),
            },
            images=all_images,
            tables=all_tables,
        )
