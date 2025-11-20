"""Database connection and operations"""

import asyncpg
from typing import Optional, Dict, Any, List
from loguru import logger
from app.config import settings


class Database:
    """PostgreSQL database operations"""

    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def connect(cls):
        """Initialize database connection pool"""
        try:
            cls._pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=1,
                max_size=5,
                command_timeout=60,
                statement_cache_size=0,  # Disable for Supabase pgbouncer compatibility
            )
            logger.info("✅ Database connection pool created (statement caching disabled for pgbouncer)")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            raise

    @classmethod
    async def disconnect(cls):
        """Close database connection pool"""
        if cls._pool:
            await cls._pool.close()
            logger.info("Database connection pool closed")

    @classmethod
    async def get_next_ocr_job(cls, vps_instance_id: str) -> Optional[Dict[str, Any]]:
        """Get next OCR job from queue using database function"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                # Call the PostgreSQL function
                row = await conn.fetchrow(
                    "SELECT * FROM get_next_ocr_job($1)", vps_instance_id
                )

                if row:
                    return dict(row)
                return None

        except Exception as e:
            logger.error(f"Failed to get next job: {e}")
            return None

    @classmethod
    async def update_ocr_job_status(
        cls, queue_id: str, status: str, error_message: Optional[str] = None
    ):
        """Update OCR job status"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                await conn.execute(
                    "SELECT update_ocr_job_status($1, $2, $3)",
                    queue_id,
                    status,
                    error_message,
                )
        except Exception as e:
            logger.error(f"Failed to update job status: {e}")
            raise

    @classmethod
    async def save_ocr_result(cls, document_id: str, ocr_text: str):
        """Save OCR text to database (embeddings removed)"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                # Update document with OCR text
                await conn.execute(
                    """
                    UPDATE documents
                    SET ocr_text = $1,
                        ocr_status = 'completed',
                        ocr_processed_at = NOW()
                    WHERE id = $2
                    """,
                    ocr_text,
                    document_id,
                )

            logger.info(f"✅ Saved OCR result for document {document_id}")

        except Exception as e:
            logger.error(f"Failed to save OCR result: {e}")
            raise

    @classmethod
    async def get_document_user_id(cls, document_id: str) -> Optional[str]:
        """Get user_id for a document"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT user_id FROM documents WHERE id = $1", document_id
                )
                return row["user_id"] if row else None
        except Exception as e:
            logger.error(f"Failed to get document user_id: {e}")
            return None

    @classmethod
    async def get_queue_stats(cls) -> Dict[str, int]:
        """Get queue statistics"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                queued = await conn.fetchval(
                    "SELECT COUNT(*) FROM ocr_queue WHERE status = 'queued'"
                )
                processing = await conn.fetchval(
                    "SELECT COUNT(*) FROM ocr_queue WHERE status = 'processing'"
                )
                completed_today = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM ocr_queue
                    WHERE status = 'completed'
                    AND completed_at > NOW() - INTERVAL '24 hours'
                    """
                )
                failed = await conn.fetchval(
                    "SELECT COUNT(*) FROM ocr_queue WHERE status = 'failed'"
                )

                return {
                    "queued": queued or 0,
                    "processing": processing or 0,
                    "completed_today": completed_today or 0,
                    "failed": failed or 0,
                }
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {"queued": 0, "processing": 0, "completed_today": 0, "failed": 0}
