from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from db.database import init_db
from api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    await init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="RAG Research Assistant",
    description="Multi-modal RAG system with hybrid retrieval, re-ranking, and evaluation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Serve extracted images as static files
_images_dir = os.path.join(os.path.dirname(settings.UPLOAD_DIR), "extracted_images")
os.makedirs(_images_dir, exist_ok=True)
app.mount("/images", StaticFiles(directory=_images_dir), name="images")
