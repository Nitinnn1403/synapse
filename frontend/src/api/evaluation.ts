import client from './client'
import type { EvaluationResult, EvaluationAverages } from '../types/evaluation'

interface PaginatedEvaluations {
  evaluations: EvaluationResult[]
  page: number
  limit: number
}

export async function runEvaluation(messageId: string): Promise<EvaluationResult> {
  const res = await client.post('/evaluation/run', { message_id: messageId })
  return res.data
}

export async function getEvaluationMetrics(): Promise<EvaluationAverages> {
  const res = await client.get('/evaluation/metrics')
  return res.data
}

export async function getEvaluationHistory(
  page = 1,
  limit = 50
): Promise<PaginatedEvaluations> {
  const res = await client.get('/evaluation/history', { params: { page, limit } })
  return res.data
}
