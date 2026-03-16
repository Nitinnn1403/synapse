export interface EvaluationResult {
  id: string
  message_id: string
  faithfulness: number | null
  answer_relevancy: number | null
  context_precision: number | null
  context_recall: number | null
  hallucination_score: number | null
  retrieval_precision: number | null
  created_at: string
}

export interface EvaluationAverages {
  avg_faithfulness: number | null
  avg_answer_relevancy: number | null
  avg_context_precision: number | null
  avg_hallucination_score: number | null
  total_evaluations: number
}
