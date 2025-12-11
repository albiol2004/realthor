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

                # ✨ DO NOT SET ai_processed_at HERE
                # It will be set AFTER contact matching completes
                # See: mark_ai_processing_complete() method

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
    async def mark_ai_processing_complete(cls, document_id: str):
        """
        Mark AI processing as complete (sets ai_processed_at timestamp)

        This should be called AFTER contact matching completes, so the frontend
        knows that ALL AI processing (including contact linking) is done.
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE documents
                    SET ai_processed_at = NOW()
                    WHERE id = $1
                    """,
                    document_id,
                )

            logger.info(f"✅ Marked AI processing complete for document {document_id}")

        except Exception as e:
            logger.error(f"Failed to mark AI processing complete: {e}")
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
                            date_of_birth,
                            place_of_birth,
                            status,
                            category,
                            created_at
                        FROM contacts
                        WHERE user_id = $1
                        AND (
                            -- Exact match (both first and last)
                            (LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3))
                            -- Fuzzy match on first name (use OR, not AND)
                            OR first_name ILIKE $4
                            -- Fuzzy match on last name with remaining terms
                            OR last_name ILIKE $5
                            -- Full name in last_name (reversed names like "Garcia Ramirez, Alejandro")
                            OR last_name ILIKE $6
                            -- Full name in first_name
                            OR first_name ILIKE $6
                            -- Email match
                            OR email ILIKE $6
                            -- Phone match
                            OR phone ILIKE $6
                            -- Company match
                            OR company ILIKE $6
                        )
                        ORDER BY
                            -- Prioritize exact matches
                            CASE
                                WHEN LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3) THEN 1
                                WHEN first_name ILIKE $4 OR last_name ILIKE $5 THEN 2
                                ELSE 3
                            END,
                            created_at DESC
                        LIMIT $7
                        """,
                        user_id,
                        first_term,  # $2
                        last_term,   # $3
                        f"%{first_term}%",  # $4
                        f"%{last_term}%",   # $5
                        f"%{name}%",  # $6
                        limit,  # $7
                    )
                else:
                    # Single name - search in all text fields
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
                            date_of_birth,
                            place_of_birth,
                            status,
                            category,
                            created_at
                        FROM contacts
                        WHERE user_id = $1
                        AND (
                            first_name ILIKE $2
                            OR last_name ILIKE $2
                            OR email ILIKE $2
                            OR phone ILIKE $2
                            OR company ILIKE $2
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
                # Use PostgreSQL array concatenation operator ||
                # COALESCE handles NULL arrays (converts NULL to empty array)
                # Only add if not already present in array
                result = await conn.execute(
                    """
                    UPDATE documents
                    SET related_contact_ids = COALESCE(related_contact_ids, ARRAY[]::uuid[]) || $1::uuid
                    WHERE id = $2
                    AND (
                        related_contact_ids IS NULL
                        OR NOT ($1::uuid = ANY(related_contact_ids))
                    )
                    """,
                    contact_id,
                    document_id,
                )

                # Check if any rows were updated
                rows_updated = int(result.split()[-1]) if result else 0

                if rows_updated > 0:
                    logger.info(f"✅ Linked contact {contact_id} to document {document_id}")
                    return True
                else:
                    logger.debug(f"Contact {contact_id} already linked to document {document_id}")
                    return True  # Still return True since contact is linked

        except Exception as e:
            logger.error(f"Failed to link contact to document: {e}")
            return False

    # ==================== CONTACT IMPORT QUEUE METHODS ====================

    @classmethod
    async def get_next_import_job(cls, vps_instance_id: str) -> Optional[Dict[str, Any]]:
        """
        Get next contact import job from queue

        Uses database function with FOR UPDATE SKIP LOCKED
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM get_next_import_job($1)",
                    vps_instance_id
                )

                if row:
                    return dict(row)
                return None

        except Exception as e:
            logger.error(f"Failed to get next import job: {e}")
            return None

    @classmethod
    async def update_import_job_status(
        cls,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
        stats: Optional[Dict[str, int]] = None
    ):
        """Update contact import job status"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            import json
            stats_json = json.dumps(stats) if stats else None

            async with cls._pool.acquire() as conn:
                await conn.execute(
                    "SELECT update_import_job_status($1, $2::contact_import_status, $3, $4::jsonb)",
                    job_id,
                    status,
                    error_message,
                    stats_json
                )

            logger.info(f"Updated import job {job_id} status to {status}")

        except Exception as e:
            logger.error(f"Failed to update import job status: {e}")
            raise

    @classmethod
    async def save_import_job_mapping(
        cls,
        job_id: str,
        column_mapping: Dict[str, str],
        csv_headers: List[str]
    ):
        """Save AI column mapping result to job"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            import json

            async with cls._pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE contact_import_jobs
                    SET column_mapping = $1::jsonb,
                        csv_headers = $2
                    WHERE id = $3
                    """,
                    json.dumps(column_mapping),
                    csv_headers,
                    job_id
                )

            logger.info(f"Saved column mapping for job {job_id}")

        except Exception as e:
            logger.error(f"Failed to save column mapping: {e}")
            raise

    @classmethod
    async def save_import_rows(
        cls,
        job_id: str,
        rows: List[Dict[str, Any]]
    ):
        """
        Bulk save analyzed import rows

        Each row should have:
        - row_number: int
        - raw_data: dict
        - mapped_data: dict
        - status: 'new' | 'duplicate' | 'conflict'
        - matched_contact_id: Optional[str]
        - match_confidence: Optional[float]
        - conflicts: Optional[list]
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        if not rows:
            return

        try:
            import json

            async with cls._pool.acquire() as conn:
                # Use COPY for bulk insert (faster)
                # But for simplicity, use executemany
                await conn.executemany(
                    """
                    INSERT INTO contact_import_rows (
                        job_id, row_number, raw_data, mapped_data,
                        status, matched_contact_id, match_confidence, conflicts
                    ) VALUES (
                        $1, $2, $3::jsonb, $4::jsonb,
                        $5::contact_import_row_status, $6, $7, $8::jsonb
                    )
                    """,
                    [
                        (
                            job_id,
                            row["row_number"],
                            json.dumps(row["raw_data"]),
                            json.dumps(row["mapped_data"]) if row.get("mapped_data") else None,
                            row["status"],
                            row.get("matched_contact_id"),
                            row.get("match_confidence"),
                            json.dumps(row["conflicts"]) if row.get("conflicts") else None
                        )
                        for row in rows
                    ]
                )

            logger.info(f"Saved {len(rows)} import rows for job {job_id}")

        except Exception as e:
            logger.error(f"Failed to save import rows: {e}")
            raise

    @classmethod
    async def get_import_rows_for_processing(
        cls,
        job_id: str,
        include_statuses: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get import rows ready for processing

        Args:
            job_id: Import job ID
            include_statuses: Filter by row status (default: all non-skipped)

        Returns:
            List of rows with their decisions
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                if include_statuses:
                    rows = await conn.fetch(
                        """
                        SELECT
                            id, row_number, raw_data, mapped_data,
                            status, matched_contact_id, match_confidence,
                            conflicts, decision, overwrite_fields
                        FROM contact_import_rows
                        WHERE job_id = $1
                        AND status = ANY($2::contact_import_row_status[])
                        AND (decision IS NULL OR decision != 'skip')
                        ORDER BY row_number ASC
                        """,
                        job_id,
                        include_statuses
                    )
                else:
                    rows = await conn.fetch(
                        """
                        SELECT
                            id, row_number, raw_data, mapped_data,
                            status, matched_contact_id, match_confidence,
                            conflicts, decision, overwrite_fields
                        FROM contact_import_rows
                        WHERE job_id = $1
                        AND (decision IS NULL OR decision != 'skip')
                        ORDER BY row_number ASC
                        """,
                        job_id
                    )

                return [dict(row) for row in rows]

        except Exception as e:
            logger.error(f"Failed to get import rows for processing: {e}")
            return []

    @classmethod
    async def update_import_row_result(
        cls,
        row_id: str,
        status: str,
        created_contact_id: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Update import row after processing"""
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE contact_import_rows
                    SET status = $1::contact_import_row_status,
                        created_contact_id = $2,
                        import_error = $3
                    WHERE id = $4
                    """,
                    status,
                    created_contact_id,
                    error,
                    row_id
                )

        except Exception as e:
            logger.error(f"Failed to update import row result: {e}")
            raise

    @classmethod
    async def get_user_contacts_for_matching(
        cls,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all user contacts for duplicate matching

        Returns minimal contact info for efficient matching
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT
                        id, first_name, last_name, email, phone,
                        company, job_title, address_street, address_city,
                        address_state, address_zip, address_country,
                        source, notes, date_of_birth, place_of_birth
                    FROM contacts
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    """,
                    user_id
                )

                return [dict(row) for row in rows]

        except Exception as e:
            logger.error(f"Failed to get user contacts for matching: {e}")
            return []

    @classmethod
    async def create_contact(
        cls,
        user_id: str,
        contact_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        Create a new contact

        Returns the created contact ID
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        try:
            async with cls._pool.acquire() as conn:
                # Build dynamic INSERT based on provided fields
                fields = ["user_id"]
                values = [user_id]
                placeholders = ["$1"]

                contact_fields = [
                    "first_name", "last_name", "email", "phone",
                    "company", "job_title", "profile_picture_url",
                    "address_street", "address_city", "address_state",
                    "address_zip", "address_country", "status", "source",
                    "tags", "budget_min", "budget_max", "notes",
                    "custom_fields", "category", "role",
                    "date_of_birth", "place_of_birth"
                ]

                param_num = 2
                for field in contact_fields:
                    if field in contact_data and contact_data[field] is not None:
                        fields.append(field)
                        value = contact_data[field]

                        # Handle special types
                        if field == "tags" and isinstance(value, list):
                            values.append(value)
                        elif field == "custom_fields" and isinstance(value, dict):
                            import json
                            values.append(json.dumps(value))
                            placeholders.append(f"${param_num}::jsonb")
                            param_num += 1
                            continue
                        elif field == "date_of_birth" and isinstance(value, str):
                            from datetime import datetime
                            values.append(datetime.strptime(value, "%Y-%m-%d").date())
                        elif field in ["budget_min", "budget_max"]:
                            values.append(float(value) if value else None)
                        else:
                            values.append(value)

                        placeholders.append(f"${param_num}")
                        param_num += 1

                query = f"""
                    INSERT INTO contacts ({', '.join(fields)})
                    VALUES ({', '.join(placeholders)})
                    RETURNING id
                """

                row = await conn.fetchrow(query, *values)
                return str(row["id"]) if row else None

        except Exception as e:
            logger.error(f"Failed to create contact: {e}")
            raise

    @classmethod
    async def update_contact(
        cls,
        contact_id: str,
        update_data: Dict[str, Any],
        only_empty_fields: bool = False,
        specific_fields: List[str] = None
    ) -> bool:
        """
        Update an existing contact

        Args:
            contact_id: Contact to update
            update_data: Fields to update
            only_empty_fields: If True, only update fields that are currently NULL/empty
            specific_fields: If provided, only update these specific fields

        Returns:
            True if updated successfully
        """
        if not cls._pool:
            raise RuntimeError("Database not connected")

        if not update_data:
            return True

        try:
            async with cls._pool.acquire() as conn:
                # Build dynamic UPDATE
                set_clauses = []
                values = []
                param_num = 1

                allowed_fields = [
                    "first_name", "last_name", "email", "phone",
                    "company", "job_title", "profile_picture_url",
                    "address_street", "address_city", "address_state",
                    "address_zip", "address_country", "source",
                    "tags", "budget_min", "budget_max", "notes",
                    "custom_fields", "date_of_birth", "place_of_birth"
                ]

                for field in allowed_fields:
                    if field not in update_data or update_data[field] is None:
                        continue

                    # Skip if not in specific_fields list (when provided)
                    if specific_fields and field not in specific_fields:
                        continue

                    value = update_data[field]

                    # Handle special types
                    if field == "custom_fields" and isinstance(value, dict):
                        import json
                        value = json.dumps(value)
                        type_cast = "::jsonb"
                    elif field == "date_of_birth" and isinstance(value, str):
                        from datetime import datetime
                        value = datetime.strptime(value, "%Y-%m-%d").date()
                        type_cast = ""
                    elif field in ["budget_min", "budget_max"]:
                        value = float(value) if value else None
                        type_cast = ""
                    else:
                        type_cast = ""

                    if only_empty_fields:
                        # Only update if current value is NULL or empty string
                        set_clauses.append(
                            f"{field} = CASE WHEN {field} IS NULL OR {field} = '' THEN ${param_num}{type_cast} ELSE {field} END"
                        )
                    else:
                        set_clauses.append(f"{field} = ${param_num}{type_cast}")

                    values.append(value)
                    param_num += 1

                if not set_clauses:
                    return True

                # Add contact_id as last param
                values.append(contact_id)

                query = f"""
                    UPDATE contacts
                    SET {', '.join(set_clauses)}, updated_at = NOW()
                    WHERE id = ${param_num}
                """

                result = await conn.execute(query, *values)
                return "UPDATE" in result

        except Exception as e:
            logger.error(f"Failed to update contact: {e}")
            raise

    @classmethod
    async def download_file_from_storage(
        cls,
        file_url: str
    ) -> Optional[bytes]:
        """
        Download a file from Supabase Storage

        Note: This uses HTTP request, not database connection
        Handles both public and private bucket URLs
        """
        import aiohttp
        from app.config import settings

        try:
            # Convert public URL to authenticated URL for private buckets
            # Public:  /storage/v1/object/public/bucket/path
            # Private: /storage/v1/object/bucket/path
            download_url = file_url.replace('/object/public/', '/object/')

            logger.info(f"Downloading file from: {download_url}")

            async with aiohttp.ClientSession() as session:
                # Add authorization header for private buckets
                headers = {
                    "Authorization": f"Bearer {settings.supabase_service_key}",
                    "apikey": settings.supabase_service_key or ""
                }

                async with session.get(download_url, headers=headers) as response:
                    if response.status == 200:
                        return await response.read()
                    else:
                        response_text = await response.text()
                        logger.error(f"Failed to download file: {response.status} - {response_text}")
                        return None

        except Exception as e:
            logger.error(f"Failed to download file from storage: {e}")
            return None
