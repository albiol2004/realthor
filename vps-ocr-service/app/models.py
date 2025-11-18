"""Pydantic models for API requests/responses"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class OCRJob(BaseModel):
    """OCR job from queue"""

    queue_id: str
    document_id: str
    file_url: str
    file_type: str


class OCRResult(BaseModel):
    """OCR processing result"""

    text: str
    language: str
    page_count: int
    processing_time_seconds: float


class EmbeddingChunk(BaseModel):
    """Single embedding chunk"""

    document_id: str
    user_id: str
    chunk_index: int
    chunk_text: str
    chunk_length: int
    embedding: List[float]
    content_hash: str


class QueueStats(BaseModel):
    """Queue statistics"""

    queued: int
    processing: int
    completed_today: int
    failed: int


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    models_loaded: bool
    queue_size: int
    vps_instance_id: str
    version: str


class WebhookPayload(BaseModel):
    """Payload sent to Kairo webhook"""

    document_id: str
    queue_id: str
    status: str  # "completed" or "failed"
    ocr_text: Optional[str] = None
    error_message: Optional[str] = None
    secret: str
