from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api import auth, cases, evidence, public, intelligence
from app.utils.seed_data import seed_demo_data

# Create Database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="TRACE — AI-Powered Collective Intelligence Platform for Finding Missing People",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs"
)

# Configure CORS
origins = settings.CORS_ORIGINS or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow local frontend development requests
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Demo Data on Startup
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(evidence.router, prefix=settings.API_V1_STR)
app.include_router(public.router, prefix=settings.API_V1_STR)
app.include_router(intelligence.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "title": "TRACE API",
        "status": "operational",
        "tagline": "Every sighting is a clue. Every clue makes the search smarter.",
        "docs": "/api/docs"
    }

@app.get("/api/health")
def health():
    return {"status": "ok"}
