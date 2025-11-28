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
                    # Convert string date to Python date object if needed
                    doc_date = metadata["document_date"]
                    if isinstance(doc_date, str):
                        from datetime import datetime
                        doc_date = datetime.strptime(doc_date, "%Y-%m-%d").date()
                    update_fields.append(f"document_date = ${param_num}")
                    params.append(doc_date)
                    param_num += 1

                if metadata.get("due_date") is not None:
                    # Convert string date to Python date object if needed
                    due_date = metadata["due_date"]
                    if isinstance(due_date, str):
                        from datetime import datetime
                        due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
                    update_fields.append(f"due_date = ${param_num}")
                    params.append(due_date)
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
                    update_fields.append(f"ai_metadata = ${param_num}::jsonb")
                    import json
                    params.append(json.dumps(metadata["ai_metadata"]))
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

    @classmethod
    async def search_contacts_by_name(
        cls, user_id: str, name: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for contacts by name (fuzzy match)

        Args:
            user_id: User ID to filter contacts
            name: Name to search for (e.g., "John Doe")
            limit: Maximum number of results to return

        Returns:
            List of contact dictionaries with metadata
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            # Split name into parts for better matching
            name_parts = name.strip().split()
            logger.debug(f"Searching contacts: name='{name}', parts={name_parts}, user_id={user_id[:8]}...")

            async with cls._pool.acquire() as conn:
                # Try multi-strategy search:
                # 1. Exact full name match
                # 2. First name + last name fuzzy match
                # 3. Full name in either field (for single names or reversed names)

                if len(name_parts) >= 2:
                    first_term = name_parts[0]
                    last_term = " ".join(name_parts[1:])

                    rows = await conn.fetch(
                        """
                        SELECT
                            id,
                            first_name,
                            last_name,
                            email,
                            phone,
                            company,
                            job_title,
                            address_city,
                            address_state,
                            address_country,
                            status,
                            category,
                            created_at
                        FROM contacts
                        WHERE user_id = $1
                        AND (
                            -- Exact match
                            (LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3))
                            -- Fuzzy match on first + last
                            OR (first_name ILIKE $4 AND last_name ILIKE $5)
                            -- Full name in last_name (reversed names)
                            OR last_name ILIKE $6
                            -- Full name in first_name
                            OR first_name ILIKE $6
                            -- Email match (if name looks like email)
                            OR (email ILIKE $6 AND $7 = true)
                        )
                        ORDER BY
                            -- Prioritize exact matches
                            CASE
                                WHEN LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3) THEN 1
                                WHEN first_name ILIKE $4 AND last_name ILIKE $5 THEN 2
                                ELSE 3
                            END,
                            created_at DESC
                        LIMIT $8
                        """,
                        user_id,
                        first_term,  # $2
                        last_term,   # $3
                        f"%{first_term}%",  # $4
                        f"%{last_term}%",   # $5
                        f"%{name}%",  # $6
                        "@" in name,  # $7 - is email?
                        limit,  # $8
                    )
                else:
                    # Single name - search in both first and last name
                    single_term = name_parts[0] if name_parts else name

                    rows = await conn.fetch(
                        """
                        SELECT
                            id,
                            first_name,
                            last_name,
                            email,
                            phone,
                            company,
                            job_title,
                            address_city,
                            address_state,
                            address_country,
                            status,
                            category,
                            created_at
                        FROM contacts
                        WHERE user_id = $1
                        AND (
                            first_name ILIKE $2
                            OR last_name ILIKE $2
                            OR email ILIKE $2
                        )
                        ORDER BY
                            -- Exact matches first
                            CASE
                                WHEN LOWER(first_name) = LOWER($3) OR LOWER(last_name) = LOWER($3) THEN 1
                                ELSE 2
                            END,
                            created_at DESC
                        LIMIT $4
                        """,
                        user_id,
                        f"%{single_term}%",  # $2
                        single_term,  # $3
                        limit,  # $4
                    )

                results = [dict(row) for row in rows]
                logger.debug(f"Contact search returned {len(results)} result(s) for '{name}'")
                return results

        except Exception as e:
            logger.error(f"Failed to search contacts by name '{name}': {e}")
            return []

    @classmethod
    async def link_contact_to_document(
        cls, document_id: str, contact_id: str
    ) -> bool:
        """
        Link a contact to a document by adding to related_contact_ids array

        Args:
            document_id: Document ID
            contact_id: Contact ID to link

        Returns:
            True if linked successfully, False otherwise
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                # Use PostgreSQL array append function
                # Only add if not already present
                await conn.execute(
                    """
                    UPDATE documents
                    SET related_contact_ids = array_append(related_contact_ids, $1)
                    WHERE id = $2
                    AND NOT ($1 = ANY(related_contact_ids))
                    """,
                    contact_id,
                    document_id,
                )

                logger.debug(f"✅ Linked contact {contact_id} to document {document_id}")
                return True

        except Exception as e:
            logger.error(f"Failed to link contact to document: {e}")
            return False
