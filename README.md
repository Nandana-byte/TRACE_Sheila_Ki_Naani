# TRACE — AI-Powered Collective Intelligence for Finding Missing People

> *"Every sighting is a clue. Every clue makes the search smarter."*

TRACE is an AI-assisted evidence-fusion and decision-support platform for missing-person investigations. It acts as the intelligence layer connecting fragmented clues across CCTV, witness reports, photographs, social media, phone data, public transport, police reports, volunteers, and hospitals into a coherent movement trajectory, ranked search priority map, and high-value next clue recommendation.

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI Python)

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

Backend API will run at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/api/docs`.

### 2. Frontend Setup (Next.js TypeScript)

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend application will run at `http://localhost:3000`.

---

## 🎯 Hackathon Interactive Demo Guide

1. Open `http://localhost:3000/dashboard` to view active cases.
2. Click **Open TRACE Workspace** for the pre-seeded case **Ananya Sharma** (`TRACE-2026-0891`).
3. Explore the **5 initial fused clues**, evidence timeline, Mapbox trajectory, React Flow evidence graph, and TRACE Confidence score (86.5%).
4. Click **"Add 6th Clue & Recalculate TRACE"** in the right intelligence panel (or submit a public sighting at `/public/cases/TRACE-2026-0891/report`).
5. Observe live recalculation: Railway Station priority updates, trajectory extends, graph updates, and confirmation toast appears!

---

## 🛠️ Stack & Architecture

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Mapbox GL JS, React Flow (@xyflow/react), Lucide Icons
- **Backend**: Python 3.13, FastAPI, SQLAlchemy, Pydantic V2, SQLite/PostgreSQL (PostGIS dual-support)
- **AI Abstraction**: Multimodal LLM/Vision API integration with automatic fallback to **Demo AI Mode** if API keys are omitted.
