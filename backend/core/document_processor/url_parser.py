import trafilatura
from bs4 import BeautifulSoup
import httpx

from core.document_processor.base import BaseParser, ParsedDocument, PageContent


class UrlParser(BaseParser):
    async def parse(self, url: str) -> ParsedDocument:
        # Download the page
        downloaded = trafilatura.fetch_url(url)

        text = ""
        if downloaded:
            extracted = trafilatura.extract(
                downloaded,
                include_tables=True,
                include_links=False,
                include_comments=False,
            )
            if extracted:
                text = extracted

        # Fallback to BeautifulSoup if trafilatura fails
        if not text:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
                response = await client.get(url)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "html.parser")
                # Remove script and style elements
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()
                text = soup.get_text(separator="\n", strip=True)

        page = PageContent(page_number=1, text=text)

        return ParsedDocument(
            text=text,
            pages=[page],
            metadata={"url": url, "filename": url},
        )
