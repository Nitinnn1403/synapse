from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import crud
from api.schemas.evaluation import (
    EvaluationRunRequest, EvaluationResponse, EvaluationAverages, PaginatedEvaluations,
)
from core.evaluation.evaluator import Evaluator

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.post("/run", response_model=EvaluationResponse)
async def run_evaluation(
    request: EvaluationRunRequest,
    db: AsyncSession = Depends(get_db),
):
    message = await crud.get_message(db, request.message_id)
    if not message:
        raise HTTPException(404, "Message not found")
    evaluator = Evaluator()
    try:
        result = await evaluator.evaluate_message(request.message_id, db)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Evaluation failed: {str(e)}")


@router.get("/metrics", response_model=EvaluationAverages)
async def get_metrics(
    db: AsyncSession = Depends(get_db),
):
    averages = await crud.get_evaluation_averages(db)
    return EvaluationAverages(**averages)


@router.get("/history", response_model=PaginatedEvaluations)
async def get_history(
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    evals = await crud.list_evaluations(db, page=page, limit=limit)
    return PaginatedEvaluations(
        evaluations=[EvaluationResponse.model_validate(e) for e in evals],
        page=page,
        limit=limit,
    )
