from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import app_logger

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    app_logger.info("Backend Started")