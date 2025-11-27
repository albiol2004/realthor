"""
Kairo VPS OCR Service

FastAPI application for document OCR processing with embeddings generation
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from loguru import logger
import sys

from app.config import settings
from app.database import Database
from app.ocr_worker import OCRWorker
from app.ai_labeling_worker import AILabelingWorker
from app.job_poller import JobPoller
from app.ai_labeling_poller import AILabelingPoller
from app.models import HealthResponse, QueueStats
from app import __version__

# Configure logging
logger.remove()  # Remove default handler
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.log_level,
)

# Add file logging if configured
if settings.log_file:
    logger.add(
        settings.log_file,
        rotation=settings.log_rotation,
        retention=settings.log_retention,
        level=settings.log_level,
    )

# Global instances
ocr_worker: OCRWorker = None
ai_labeling_worker: AILabelingWorker = None
job_poller: JobPoller = None
ai_labeling_poller: AILabelingPoller = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events

    Startup:
    - Load ML models (OCR only)
    - Load AI labeling worker (optional)
    - Connect to database
    - Start job pollers (OCR + AI labeling)

    Shutdown:
    - Stop job pollers
    - Close database connections
    """
    global ocr_worker, ai_labeling_worker, job_poller, ai_labeling_poller

    logger.info("=" * 60)
    logger.info(f"🚀 Starting Kairo VPS OCR + AI Labeling Service v{__version__}")
    logger.info(f"Instance ID: {settings.vps_instance_id}")
    logger.info(f"OCR Language: {settings.ocr_language}")
    logger.info(f"GPU Enabled: {settings.ocr_use_gpu}")
    logger.info(f"AI Labeling Enabled: {settings.ai_labeling_enabled}")
    logger.info(f"Webhook Enabled: {settings.webhook_enabled}")
    logger.info("=" * 60)

    try:
        # Step 1: Connect to database
        logger.info("[1/5] Connecting to database...")
        await Database.connect()

        # Step 2: Load OCR models
        logger.info("[2/5] Loading OCR models (PaddleOCR)...")
        ocr_worker = OCRWorker()

        # Step 3: Load AI labeling worker (optional)
        if settings.ai_labeling_enabled and settings.deepseek_api_key:
            logger.info("[3/5] Loading AI labeling worker (Deepseek)...")
            ai_labeling_worker = AILabelingWorker()
        else:
            logger.warning("[3/5] AI labeling disabled (missing DEEPSEEK_API_KEY)")

        # Step 4: Start OCR job poller
        logger.info("[4/5] Starting OCR job poller...")
        job_poller = JobPoller(ocr_worker)
        await job_poller.start()

        # Step 5: Start AI labeling job poller (if AI labeling is enabled)
        if ai_labeling_worker:
            logger.info("[5/5] Starting AI labeling job poller...")
            ai_labeling_poller = AILabelingPoller(ai_labeling_worker)
            await ai_labeling_poller.start()
        else:
            logger.info("[5/5] Skipping AI labeling poller (AI labeling disabled)")

        logger.info("=" * 60)
        logger.info("✅ Service is ready!")
        logger.info(f"📊 OCR polling interval: {settings.poll_interval_seconds}s")
        if ai_labeling_worker:
            logger.info(f"🤖 AI labeling active (Deepseek)")
        logger.info("=" * 60)

        yield

    except Exception as e:
        logger.error(f"❌ Failed to start service: {e}", exc_info=True)
        raise

    finally:
        # Shutdown
        logger.info("🛑 Shutting down service...")

        if job_poller:
            await job_poller.stop()

        if ai_labeling_poller:
            await ai_labeling_poller.stop()

        await Database.disconnect()

        logger.info("✅ Service stopped")


# Create FastAPI app
app = FastAPI(
    title="Kairo VPS OCR + AI Labeling Service",
    description="Document OCR processing and AI-powered labeling for Kairo CRM",
    version=__version__,
    lifespan=lifespan,
)


@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "service": "Kairo VPS OCR + AI Labeling Service",
        "version": __version__,
        "status": "running",
        "instance_id": settings.vps_instance_id,
        "features": {
            "ocr": True,
            "ai_labeling": settings.ai_labeling_enabled and settings.deepseek_api_key is not None,
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint

    Returns service status and loaded models
    """
    queue_stats = await Database.get_queue_stats()

    return HealthResponse(
        status="ok",
        models_loaded=ocr_worker is not None,
        queue_size=queue_stats["queued"],
        vps_instance_id=settings.vps_instance_id,
        version=__version__,
    )


@app.get("/api/queue/stats", response_model=QueueStats)
async def queue_stats():
    """
    Get queue statistics

    Returns counts of queued, processing, completed, and failed jobs
    """
    stats = await Database.get_queue_stats()
    return QueueStats(**stats)


@app.get("/api/test/ocr", response_model=dict)
async def test_ocr():
    """
    Test OCR functionality

    This endpoint can be used to verify OCR is working
    Returns info about loaded models
    """
    if not ocr_worker:
        return JSONResponse(
            status_code=503, content={"error": "OCR worker not initialized"}
        )

    return {
        "ocr_loaded": True,
        "language": settings.ocr_language,
        "gpu_enabled": settings.ocr_use_gpu,
        "model_info": "PaddleOCR",
    }


@app.get("/api/test/embeddings", response_model=dict)
async def test_embeddings():
    """
    Embeddings functionality has been removed

    This endpoint is kept for backward compatibility but returns a deprecation notice
    """
    return {
        "embeddings_loaded": False,
        "deprecated": True,
        "message": "Embeddings functionality has been removed from this service. Only OCR is now performed.",
    }


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload in production
        log_level=settings.log_level.lower(),
    )
