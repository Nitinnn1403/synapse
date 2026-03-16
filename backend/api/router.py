from fastapi import APIRouter

from api.routes.health import router as health_router
from api.routes.documents import router as documents_router
from api.routes.chat import router as chat_router
from api.routes.evaluation import router as evaluation_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(documents_router)
api_router.include_router(chat_router)
api_router.include_router(evaluation_router)
