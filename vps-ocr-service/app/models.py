"""Pydantic models for API requests/responses"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID


class OCRJob(BaseModel):
    """OCR job from queue"""

    queue_id: str
    document_id: str
    file_url: str
    file_type: str

    @field_validator('queue_id', 'document_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID objects to strings"""
        if isinstance(v, UUID):
            return str(v)
        return v


class AILabelingJob(BaseModel):
    """AI labeling job from queue"""

    queue_id: str
    document_id: str
    user_id: str
    ocr_text: str
    trigger_type: str  # 'auto' or 'manual'

    @field_validator('queue_id', 'document_id', 'user_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID objects to strings"""
        if isinstance(v, UUID):
            return str(v)
        return v


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

    @field_validator('document_id', 'user_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID objects to strings"""
        if isinstance(v, UUID):
            return str(v)
        return v


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

    @field_validator('document_id', 'queue_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID objects to strings"""
        if isinstance(v, UUID):
            return str(v)
        return v
