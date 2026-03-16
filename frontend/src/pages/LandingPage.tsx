import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import synapseLogo from '../assets/synapse.svg'

const capabilities = [
  {
    title: 'Multi-format Ingestion',
    desc: 'PDFs, DOCX, TXT or any URL. Tables and images are extracted, parsed, and indexed automatically in the background.',
    tag: 'PyMuPDF · trafilatura',
  },
  {
    title: 'Hybrid Search',
    desc: 'Semantic vector search and BM25 keyword retrieval run simultaneously, fused together via Reciprocal Rank Fusion.',
    tag: 'ChromaDB · BM25Okapi',
  },
  {
    title: 'Cross-Encoder Reranking',
    desc: 'Top retrieval candidates are reranked by a cross-encoder model before generation — not just cosine similarity.',
    tag: 'ms-marco-MiniLM',
  },
  {
    title: 'Streaming Answers',
    desc: 'Answers stream token-by-token with inline source citations, exact page numbers, and extracted figures.',
    tag: 'SSE · Groq LLaMA 3.3',
  },
  {
    title: 'Hallucination Detection',
    desc: 'Every response is scored for faithfulness. Claims not grounded in your documents are automatically flagged.',
    tag: 'LLM-as-judge',
  },
  {
    title: 'Conversation Memory',
    desc: 'Follow-up questions are condensed into standalone queries — full multi-turn context without prompt bloat.',
    tag: 'Query condensing',
  },
]

const steps = [
  {
    step: '01',
    title: 'Upload your documents',
    detail: 'PyMuPDF · python-docx · trafilatura',
    desc: 'Drop in PDFs, Word docs, plain text files, or paste a URL. Content is parsed, tables extracted, images identified, and everything chunked semantically — not by fixed token count.',
  },
  {
    step: '02',
    title: 'Hybrid retrieval kicks in',
    detail: 'ChromaDB · BM25Okapi · RRF',
    desc: 'Your question triggers semantic vector search and BM25 keyword search simultaneously. Results are merged via Reciprocal Rank Fusion, then reranked by a cross-encoder model.',
  },
  {
    step: '03',
    title: 'Grounded answer generated',
    detail: 'Groq LLaMA 3.3 70B · SSE',
    desc: 'An LLM synthesizes an answer using only the retrieved context, streamed token-by-token. Every claim maps to a source — document name, page number, and the exact passage.',
  },
  {
    step: '04',
    title: 'Response evaluated',
    detail: 'LLM-as-judge · faithfulness score',
    desc: 'Faithfulness, answer relevancy, and context precision are scored automatically in the background. Hallucination rate is surfaced so you always know how much to trust the answer.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary overflow-x-hidden">

      {/* Floating Island Navbar */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-8 bg-surface-1/80 backdrop-blur-md border border-border rounded-2xl px-5 py-2.5 w-full max-w-3xl shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            <img src={synapseLogo} alt="Synapse" className="w-6 h-6 object-contain" />
            <span className="text-sm font-semibold tracking-tight">Synapse</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#what" className="text-xs text-text-secondary hover:text-text-primary transition-colors">What is it</a>
            <a href="#capabilities" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Capabilities</a>
            <a href="#how" className="text-xs text-text-secondary hover:text-text-primary transition-colors">How it works</a>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 bg-primary text-black text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Launch App <ArrowRight className="w-3 h-3" />
          </motion.button>
        </motion.nav>
      </div>

      {/* Hero — Ember Glow */}
      <section id="what" className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/15 blur-[60px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full bg-primary/20 blur-[30px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-surface-2/60 backdrop-blur-sm border border-primary/20 rounded-full px-4 py-1.5 text-xs text-text-secondary mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
            Open Source · RAG Research Assistant
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Upload documents.<br />
            <span className="text-primary">Get cited answers.</span>
          </h1>
          <p className="text-base md:text-lg text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            Synapse lets you chat with your documents using hybrid search and RAG evaluation —
            every answer grounded in your sources with exact page citations.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 bg-primary text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Launch App <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 bg-surface-2/60 backdrop-blur-sm border border-border text-text-secondary font-medium text-sm px-6 py-3 rounded-xl hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              Learn more
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-10 flex items-center gap-8 md:gap-16 mt-20 flex-wrap justify-center"
        >
          {[
            { label: 'Retrieval strategy', value: 'Hybrid + RRF' },
            { label: 'Reranking', value: 'Cross-encoder' },
            { label: 'Evaluation', value: 'LLM-as-judge' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-sm font-semibold text-primary">{value}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Capabilities — two-column editorial */}
      <section id="capabilities" className="px-6 py-24 border-t border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-32"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-5">
              Built for<br />serious retrieval.
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed mb-8">
              Not a wrapper around a simple similarity search — a full production-grade RAG pipeline with hybrid retrieval, reranking, and automatic evaluation.
            </p>
            <div className="flex flex-wrap gap-2">
              {['all-MiniLM-L6-v2', 'ChromaDB', 'BM25Okapi', 'LLaMA 3.3 70B'].map((tag) => (
                <span key={tag} className="text-xs font-mono bg-surface-2 border border-border px-2.5 py-1 rounded-md text-text-tertiary">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          <div className="divide-y divide-border">
            {capabilities.map(({ title, desc, tag }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="group flex items-start gap-6 py-6 cursor-default"
              >
                <span className="text-xs font-mono text-text-tertiary group-hover:text-primary transition-colors pt-0.5 shrink-0 w-6 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    <span className="text-xs font-mono text-text-tertiary bg-surface-2 border border-border px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-primary transition-all shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — vertical timeline */}
      <section id="how" className="px-6 py-24 border-t border-border">
        <div className="max-w-3xl mx-auto">

          {/* Header — left aligned */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Four steps.<br />
              <span className="text-text-secondary font-normal">Zero hallucination.</span>
            </h2>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/60 via-primary/20 to-transparent pointer-events-none" />

            <div className="space-y-12">
              {steps.map(({ step, title, detail, desc }, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.1 }}
                  className="relative flex gap-8 pl-10 group"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 w-[21px] h-[21px] rounded-full border border-border bg-surface-0 flex items-center justify-center group-hover:border-primary/60 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-primary tabular-nums">{step}</span>
                      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed mb-3">{desc}</p>
                    <span className="text-xs font-mono text-text-tertiary bg-surface-2 border border-border px-2.5 py-1 rounded-md">
                      {detail}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border overflow-hidden">
        {/* Ember glow — reuses hero treatment */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full bg-primary/15 blur-[60px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-20">
          {/* Top rule + label */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 mb-10"
          >
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-mono text-text-tertiary uppercase tracking-widest">Get started</span>
            <div className="h-px flex-1 bg-border" />
          </motion.div>

          {/* Large display text */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] text-text-primary">
              Your documents,<br />
              <span className="text-primary">finally answerable.</span>
            </h2>
          </motion.div>

          {/* Bottom row: subtitle left, button right */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8"
          >
            <p className="text-base text-text-secondary max-w-sm leading-relaxed">
              Upload a document, ask a question, get a cited answer — in under 30 seconds.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/app')}
              className="shrink-0 inline-flex items-center gap-2 bg-primary text-black font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Launch App <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>

        {/* Footer inside CTA section */}
        <div className="relative z-10 border-t border-border flex items-center justify-between px-8 md:px-16 h-14">
          <div className="flex items-center gap-2">
            <img src={synapseLogo} alt="Synapse" className="w-5 h-5 object-contain" />
            <span className="text-xs text-text-tertiary font-medium">Synapse</span>
          </div>
          <p className="text-xs text-text-tertiary">
            Built by <span className="text-text-secondary">Nitin Pandey</span>
          </p>
        </div>
      </section>
    </div>
  )
}
