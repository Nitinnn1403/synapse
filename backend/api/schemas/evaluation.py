from pydantic import BaseModel, Field
from datetime import datetime


class EvaluationRunRequest(BaseModel):
    message_id: str = Field(..., description="Message ID to evaluate")


class EvaluationResponse(BaseModel):
    id: str
    message_id: str
    faithfulness: float | None = None
    answer_relevancy: float | None = None
    context_precision: float | None = None
    context_recall: float | None = None
    hallucination_score: float | None = None
    retrieval_precision: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EvaluationAverages(BaseModel):
    avg_faithfulness: float | None = None
    avg_answer_relevancy: float | None = None
    avg_context_precision: float | None = None
    avg_hallucination_score: float | None = None
    total_evaluations: int


class PaginatedEvaluations(BaseModel):
    evaluations: list[EvaluationResponse]
    page: int
    limit: int
