import { useState, useEffect } from 'react'
import { ShieldCheck, Target, Brain, AlertTriangle, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getEvaluationMetrics, getEvaluationHistory } from '../api/evaluation'
import type { EvaluationAverages, EvaluationResult } from '../types/evaluation'

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  index,
}: {
  label: string
  value: number | null
  icon: React.ElementType
  color: string
  index: number
}) {
  const displayValue = value != null ? (value * 100).toFixed(1) + '%' : '--'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="bg-surface-2 border border-border rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          color === 'text-success' && 'bg-success/15',
          color === 'text-primary' && 'bg-primary/15',
          color === 'text-warning' && 'bg-warning/15',
          color === 'text-danger' && 'bg-danger/15',
        )}>
          <Icon className={clsx('w-4 h-4', color)} />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-text-primary">{displayValue}</p>
    </motion.div>
  )
}

export default function EvaluationPage() {
  const [averages, setAverages] = useState<EvaluationAverages | null>(null)
  const [history, setHistory] = useState<EvaluationResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [metrics, hist] = await Promise.all([
          getEvaluationMetrics(),
          getEvaluationHistory(),
        ])
        setAverages(metrics)
        setHistory(hist.evaluations)
      } catch {
        // Handle error silently
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full overflow-y-auto p-4 sm:p-6"
      >
        <div className="h-8 skeleton w-48 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-2 border border-border rounded-xl p-5 space-y-3">
              <div className="h-4 skeleton w-24" />
              <div className="h-8 skeleton w-16" />
            </div>
          ))}
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-5 h-[340px] skeleton" />
      </motion.div>
    )
  }

  if (!averages || averages.total_evaluations === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-center justify-center h-full text-text-secondary"
      >
        <BarChart3 className="w-10 h-10 mb-4 text-text-tertiary" />
        <h2 className="text-xl font-medium text-text-primary mb-2">No evaluations yet</h2>
        <p className="text-sm">Ask questions in the chat to generate evaluation metrics.</p>
      </motion.div>
    )
  }

  const chartData = history.map((e, i) => ({
    name: `#${history.length - i}`,
    faithfulness: (e.faithfulness ?? 0) * 100,
    relevancy: (e.answer_relevancy ?? 0) * 100,
    precision: (e.context_precision ?? 0) * 100,
  })).reverse()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full overflow-y-auto p-4 sm:p-6"
    >
      <h2 className="text-2xl font-semibold text-text-primary mb-6">Evaluation Dashboard</h2>
      <p className="text-sm text-text-secondary mb-6">
        {averages.total_evaluations} evaluation{averages.total_evaluations !== 1 ? 's' : ''} recorded
      </p>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Faithfulness" value={averages.avg_faithfulness} icon={ShieldCheck} color="text-success" index={0} />
        <MetricCard label="Answer Relevancy" value={averages.avg_answer_relevancy} icon={Target} color="text-primary" index={1} />
        <MetricCard label="Context Precision" value={averages.avg_context_precision} icon={Brain} color="text-warning" index={2} />
        <MetricCard label="Hallucination Rate" value={averages.avg_hallucination_score} icon={AlertTriangle} color="text-danger" index={3} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-xl p-5 mb-8">
          <h3 className="text-sm font-medium text-text-primary mb-4">Metrics Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="name" stroke="#525252" fontSize={12} />
              <YAxis stroke="#525252" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: '#171717',
                  border: '1px solid #2A2A2A',
                  borderRadius: '6px',
                  color: '#FAFAFA',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="faithfulness" fill="#22c55e" name="Faithfulness" radius={[4, 4, 0, 0]} />
              <Bar dataKey="relevancy" fill="#F59E0B" name="Relevancy" radius={[4, 4, 0, 0]} />
              <Bar dataKey="precision" fill="#eab308" name="Precision" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">Evaluation History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Faithfulness</th>
                <th className="text-left px-5 py-3 font-medium">Relevancy</th>
                <th className="text-left px-5 py-3 font-medium">Precision</th>
                <th className="text-left px-5 py-3 font-medium">Hallucination</th>
              </tr>
            </thead>
            <tbody>
              {history.map((e) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-surface-3/50 transition-colors">
                  <td className="px-5 py-3 text-text-secondary">
                    {new Date(e.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {e.faithfulness != null ? (e.faithfulness * 100).toFixed(1) + '%' : '--'}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {e.answer_relevancy != null ? (e.answer_relevancy * 100).toFixed(1) + '%' : '--'}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {e.context_precision != null ? (e.context_precision * 100).toFixed(1) + '%' : '--'}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {e.hallucination_score != null ? (e.hallucination_score * 100).toFixed(1) + '%' : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
