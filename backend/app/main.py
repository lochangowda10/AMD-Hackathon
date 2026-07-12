from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import app_logger
from app.database.init_db import init_db

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

from app.api.router import api_router

app.include_router(api_router, prefix="/api/v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://navia-ai.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "AI Swing Trading Copilot Backend Running 🚀"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }


@app.on_event("startup")
async def startup():
    init_db()
    app_logger.info("Database Initialized")
    app_logger.info("Backend Started")