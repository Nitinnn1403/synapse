# Synapse

**A full-stack RAG research assistant.** Upload documents, ask questions, get cited answers — powered by hybrid search, cross-encoder reranking, and automatic hallucination detection.

![License](https://img.shields.io/badge/license-MIT-amber)
![Python](https://img.shields.io/badge/python-3.11+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green)
![React](https://img.shields.io/badge/React-19-61dafb)

---

## What it does

Synapse lets you chat with your documents. Upload PDFs, DOCX files, plain text, or paste a URL — then ask natural-language questions and get answers with exact source citations, page numbers, and confidence scores.

Every response is automatically evaluated for faithfulness and hallucination rate using an LLM-as-judge approach.

---

## Features

- **Multi-format ingestion** — PDF (with image + table extraction), DOCX, TXT, and web URLs
- **Semantic chunking** — splits by embedding similarity, not fixed token count
- **Hybrid retrieval** — vector search (ChromaDB) + BM25 keyword search, fused via Reciprocal Rank Fusion
- **Cross-encoder reranking** — reranks top candidates before generation
- **Streaming answers** — token-by-token via Server-Sent Events with inline `[Source N]` citations
- **RAG evaluation** — faithfulness, answer relevancy, context precision, hallucination score (LLM-as-judge)
- **Conversation memory** — follow-up questions condensed into standalone queries
- **Multi-turn chat** — full conversation history with persistent storage

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy (async SQLite) |
| **LLM** | Groq API — LLaMA 3.3 70B (answers), LLaMA 3.1 8B (classification) |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` |
| **Reranker** | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| **Vector Store** | ChromaDB (persistent, cosine similarity) |
| **Keyword Search** | BM25Okapi via `rank-bm25` |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| **State** | Zustand |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Deployment** | Backend → Render, Frontend → Vercel |

---

## Project Structure

```
Synapse/
├── backend/
│   ├── main.py                        # FastAPI app entry
│   ├── config.py                      # Pydantic settings
│   ├── requirements.txt
│   ├── .env.example
│   ├── api/
│   │   ├── router.py
│   │   ├── routes/                    # chat, documents, evaluation, health
│   │   └── schemas/                   # Pydantic request/response models
│   ├── core/
│   │   ├── document_processor/        # Parsers + semantic chunker + pipeline
│   │   ├── retrieval/                 # Embedder, ChromaDB, BM25, hybrid retriever, reranker
│   │   ├── generation/                # LLM client, prompt templates, response builder
│   │   └── evaluation/                # LLM-as-judge metrics
│   └── db/                            # SQLAlchemy models, CRUD, database setup
└── frontend/
    └── src/
        ├── pages/                     # LandingPage, ChatPage, DocumentsPage, EvaluationPage
        ├── components/                # AppLayout, UI components
        ├── api/                       # Axios client + API calls
        ├── store/                     # Zustand global state
        └── types/                     # TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/synapse.git
cd synapse
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> The Vite dev server proxies all `/api` requests to `localhost:8000` automatically.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable | Description | Default |
|---|---|---|
| `GROQ_API_KEY` | Your Groq API key | **required** |
| `GROQ_MODEL` | Main LLM model | `llama-3.3-70b-versatile` |
| `GROQ_MODEL_FAST` | Fast model for classification | `llama-3.1-8b-instant` |
| `EMBEDDING_MODEL` | Sentence-Transformers model | `all-MiniLM-L6-v2` |
| `RERANKER_MODEL` | Cross-encoder model | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| `TOP_K_RETRIEVAL` | Candidates to retrieve | `20` |
| `TOP_K_RERANK` | Final passages after reranking | `5` |
| `CORS_ORIGINS` | Allowed frontend origins (JSON array) | `["http://localhost:5173"]` |

---

## Deployment

### Backend — Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint → connect your repo
3. Render reads `render.yaml` automatically
4. Add environment variables: `GROQ_API_KEY` and `CORS_ORIGINS` (set to your Vercel URL)
5. Use at least the **Starter** instance type (512 MB RAM minimum for ML models)

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → Import → select your repo
2. Set root directory to `frontend`
3. Add environment variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`
4. Deploy

---

## How it works

```
User question
     │
     ▼
Intent classification (conversational vs document query)
     │
     ▼
Query expansion / conversation condensing
     │
     ├──► Vector search (ChromaDB)  ──┐
     │                                ├──► Reciprocal Rank Fusion
     └──► BM25 keyword search  ───────┘
                                       │
                                       ▼
                              Cross-encoder reranking
                                       │
                                       ▼
                              LLM generation (streaming)
                                       │
                                       ▼
                         Citation parsing + response building
                                       │
                                       ▼
                    Background evaluation (faithfulness, relevancy, precision)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Nitin Pandey](https://github.com/Nitinnn1403).
