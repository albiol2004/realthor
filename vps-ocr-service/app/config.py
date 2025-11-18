"""Configuration management using pydantic-settings"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Instance
    vps_instance_id: str = "vps-01"

    # Database
    database_url: str

    # OCR
    ocr_language: str = "es,en"
    ocr_use_gpu: bool = False
    ocr_batch_size: int = 1
    max_file_size_mb: int = 50

    # Embeddings
    embeddings_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embeddings_device: str = "cpu"
    embeddings_chunk_size: int = 500
    embeddings_chunk_overlap: int = 50
    embeddings_batch_size: int = 8

    # Queue
    poll_interval_seconds: int = 5
    max_retries: int = 3
    job_timeout_minutes: int = 15

    # Webhook
    kairo_webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    webhook_enabled: bool = False

    # Temp files
    temp_dir: str = "/tmp/ocr-service"
    cleanup_temp_files: bool = True
    temp_file_max_age_hours: int = 24

    # Logging
    log_level: str = "INFO"
    log_file: str = "/var/log/ocr-service/app.log"
    log_rotation: str = "100 MB"
    log_retention: str = "10 days"

    # Performance
    worker_threads: int = 1
    download_timeout_seconds: int = 120

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Ensure temp directory exists
os.makedirs(settings.temp_dir, exist_ok=True)
