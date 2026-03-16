# Contributing to Synapse

Thanks for your interest in contributing! Here's everything you need to get started.

---

## Development setup

Follow the [Getting Started](README.md#getting-started) guide in the README to get both the backend and frontend running locally.

---

## Project layout

- **`backend/core/`** — the RAG pipeline (document processing, retrieval, generation, evaluation)
- **`backend/api/`** — FastAPI routes and Pydantic schemas
- **`backend/db/`** — SQLAlchemy models and CRUD operations
- **`frontend/src/pages/`** — full-page React components
- **`frontend/src/components/`** — shared UI components
- **`frontend/src/api/`** — API client and typed fetch functions

---

## Making changes

1. Fork the repo and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes. Keep each PR focused on one thing.

3. Test manually — both backend and frontend should run without errors.

4. Open a pull request against `main` with a clear description of what changed and why.

---

## Good first issues

- Adding support for new document formats (e.g. `.md`, `.csv`, `.epub`)
- Improving the evaluation metrics
- Writing tests (the `backend/tests/` directory is currently empty)
- UI improvements and accessibility fixes
- Docker / docker-compose setup for easier local development

---

## Code style

- **Python** — follow PEP 8, use type hints, async where appropriate
- **TypeScript** — strict mode, no `any` unless necessary
- Keep functions small and focused
- No unnecessary abstractions

---

## Reporting bugs

Open a [GitHub Issue](../../issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OS, Python version, Node version

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
