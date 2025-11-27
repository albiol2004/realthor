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

    # ==================== AI LABELING QUEUE METHODS ====================

    @classmethod
    async def get_next_ai_labeling_job(cls, vps_instance_id: str) -> Optional[Dict[str, Any]]:
        """
        Get next AI labeling job from queue

        Uses row-level locking to prevent duplicate processing
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                async with conn.transaction():
                    # Find oldest pending job and lock it
                    row = await conn.fetchrow(
                        """
                        SELECT
                            q.id as queue_id,
                            q.document_id,
                            q.user_id,
                            q.trigger_type,
                            d.ocr_text
                        FROM ai_labeling_queue q
                        JOIN documents d ON d.id = q.document_id
                        WHERE q.status = 'pending'
                        ORDER BY q.created_at ASC
                        LIMIT 1
                        FOR UPDATE SKIP LOCKED
                        """
                    )

                    if not row:
                        return None

                    # Update status to processing
                    await conn.execute(
                        """
                        UPDATE ai_labeling_queue
                        SET status = 'processing',
                            processing_started_at = NOW()
                        WHERE id = $1
                        """,
                        row["queue_id"],
                    )

                    return dict(row)

        except Exception as e:
            logger.error(f"Failed to get next AI labeling job: {e}")
            return None

    @classmethod
    async def update_ai_labeling_job_status(
        cls, queue_id: str, status: str, error_message: Optional[str] = None
    ):
        """Update AI labeling job status"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                if status == "completed":
                    await conn.execute(
                        """
                        UPDATE ai_labeling_queue
                        SET status = $1,
                            completed_at = NOW(),
                            error_message = NULL
                        WHERE id = $2
                        """,
                        status,
                        queue_id,
                    )
                elif status == "failed":
                    await conn.execute(
                        """
                        UPDATE ai_labeling_queue
                        SET status = $1,
                            error_message = $2,
                            retry_count = retry_count + 1
                        WHERE id = $3
                        """,
                        status,
                        error_message,
                        queue_id,
                    )
                else:
                    await conn.execute(
                        """
                        UPDATE ai_labeling_queue
                        SET status = $1
                        WHERE id = $2
                        """,
                        status,
                        queue_id,
                    )

        except Exception as e:
            logger.error(f"Failed to update AI labeling job status: {e}")
            raise

    @classmethod
    async def save_ai_labeling_result(cls, document_id: str, metadata: Dict[str, Any]):
        """
        Save AI labeling result to document

        Only updates non-null fields (as per requirements)
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                # Build dynamic UPDATE query based on non-null fields
                update_fields = []
                params = []
                param_num = 1

                if metadata.get("category") is not None:
                    update_fields.append(f"category = ${param_num}")
                    params.append(metadata["category"])
                    param_num += 1

                if metadata.get("extracted_names") is not None:
                    update_fields.append(f"extracted_names = ${param_num}")
                    params.append(metadata["extracted_names"])
                    param_num += 1

                if metadata.get("document_date") is not None:
                    update_fields.append(f"document_date = ${param_num}")
                    params.append(metadata["document_date"])
                    param_num += 1

                if metadata.get("due_date") is not None:
                    update_fields.append(f"due_date = ${param_num}")
                    params.append(metadata["due_date"])
                    param_num += 1

                if metadata.get("description") is not None:
                    update_fields.append(f"description = ${param_num}")
                    params.append(metadata["description"])
                    param_num += 1

                if metadata.get("has_signature") is not None:
                    update_fields.append(f"has_signature = ${param_num}")
                    params.append(metadata["has_signature"])
                    param_num += 1

                if metadata.get("importance_score") is not None:
                    update_fields.append(f"importance_score = ${param_num}")
                    params.append(metadata["importance_score"])
                    param_num += 1

                if metadata.get("ai_metadata") is not None:
                    update_fields.append(f"ai_metadata = ${param_num}")
                    params.append(metadata["ai_metadata"])
                    param_num += 1

                if metadata.get("ai_confidence") is not None:
                    update_fields.append(f"ai_confidence = ${param_num}")
                    params.append(metadata["ai_confidence"])
                    param_num += 1

                # Always update ai_processed_at
                update_fields.append("ai_processed_at = NOW()")

                # Add document_id as last param
                params.append(document_id)

                if update_fields:
                    query = f"""
                        UPDATE documents
                        SET {', '.join(update_fields)}
                        WHERE id = ${param_num}
                    """

                    await conn.execute(query, *params)

            logger.info(f"✅ Saved AI labeling result for document {document_id}")

        except Exception as e:
            logger.error(f"Failed to save AI labeling result: {e}")
            raise

    @classmethod
    async def create_ai_labeling_job(
        cls, document_id: str, user_id: str, trigger_type: str = "auto"
    ) -> str:
        """
        Create a new AI labeling job

        Returns the queue ID
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO ai_labeling_queue (document_id, user_id, trigger_type)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (document_id) WHERE status IN ('pending', 'processing')
                    DO NOTHING
                    RETURNING id
                    """,
                    document_id,
                    user_id,
                    trigger_type,
                )

                if row:
                    logger.info(f"✅ Created AI labeling job for document {document_id}")
                    return row["id"]
                else:
                    logger.info(f"⚠️  AI labeling job already exists for document {document_id}")
                    return None

        except Exception as e:
            logger.error(f"Failed to create AI labeling job: {e}")
            raise
