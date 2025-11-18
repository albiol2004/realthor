"""Job Poller - Polls database for OCR jobs and processes them"""

import asyncio
from typing import Optional
from loguru import logger
from app.config import settings
from app.database import Database
from app.ocr_worker import OCRWorker
from app.embeddings_worker import EmbeddingsWorker
from app.webhook import WebhookNotifier
from app.models import OCRJob


class JobPoller:
    """
    Job Poller

    Continuously polls the database for pending OCR jobs
    and processes them using OCR and Embeddings workers
    """

    def __init__(
        self, ocr_worker: OCRWorker, embeddings_worker: EmbeddingsWorker
    ):
        self.ocr_worker = ocr_worker
        self.embeddings_worker = embeddings_worker
        self.webhook = WebhookNotifier()
        self.is_running = False
        self.task: Optional[asyncio.Task] = None

    async def start(self):
        """Start polling for jobs"""
        if self.is_running:
            logger.warning("Job poller already running")
            return

        self.is_running = True
        self.task = asyncio.create_task(self._poll_loop())
        logger.info(f"✅ Job poller started (instance: {settings.vps_instance_id})")

    async def stop(self):
        """Stop polling"""
        if not self.is_running:
            return

        self.is_running = False

        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

        logger.info("Job poller stopped")

    async def _poll_loop(self):
        """Main polling loop"""
        consecutive_errors = 0
        max_consecutive_errors = 5

        while self.is_running:
            try:
                # Get next job from database
                job_data = await Database.get_next_ocr_job(settings.vps_instance_id)

                if job_data:
                    # Reset error counter on successful job fetch
                    consecutive_errors = 0

                    # Process the job
                    await self._process_job(OCRJob(**job_data))

                else:
                    # No jobs available, wait before polling again
                    await asyncio.sleep(settings.poll_interval_seconds)

            except asyncio.CancelledError:
                logger.info("Poll loop cancelled")
                break

            except Exception as e:
                consecutive_errors += 1
                logger.error(
                    f"❌ Error in poll loop (#{consecutive_errors}): {e}",
                    exc_info=True,
                )

                # If too many consecutive errors, back off more
                if consecutive_errors >= max_consecutive_errors:
                    logger.error(
                        f"Too many consecutive errors ({consecutive_errors}), backing off 60s"
                    )
                    await asyncio.sleep(60)
                    consecutive_errors = 0  # Reset after backoff
                else:
                    await asyncio.sleep(10)  # Normal error backoff

    async def _process_job(self, job: OCRJob):
        """
        Process a single OCR job

        Steps:
        1. Extract text with OCR
        2. Generate embeddings
        3. Save to database
        4. Update queue status
        5. Send webhook notification (optional)
        """
        logger.info(f"📄 Processing job: {job.document_id}")

        try:
            # Step 1: OCR processing
            logger.info(f"[1/4] Running OCR on {job.file_type} file")
            ocr_result = await self.ocr_worker.process(job.file_url, job.file_type)

            if not ocr_result.text or not ocr_result.text.strip():
                raise Exception("OCR returned empty text")

            logger.info(
                f"✅ Extracted {len(ocr_result.text)} characters in {ocr_result.processing_time_seconds:.1f}s"
            )

            # Step 2: Get user_id for embeddings
            logger.info(f"[2/4] Getting user context")
            user_id = await Database.get_document_user_id(job.document_id)

            if not user_id:
                raise Exception("Document not found or user_id is null")

            # Step 3: Generate embeddings
            logger.info(f"[3/4] Generating embeddings")
            embedding_chunks = await self.embeddings_worker.generate(
                document_id=job.document_id,
                user_id=user_id,
                text=ocr_result.text,
            )

            logger.info(f"✅ Generated {len(embedding_chunks)} embedding chunks")

            # Step 4: Save to database
            logger.info(f"[4/4] Saving results to database")

            # Convert EmbeddingChunk objects to dicts for database
            embeddings_data = [
                {
                    "document_id": emb.document_id,
                    "user_id": emb.user_id,
                    "chunk_index": emb.chunk_index,
                    "chunk_text": emb.chunk_text,
                    "chunk_length": emb.chunk_length,
                    "embedding": emb.embedding,
                    "content_hash": emb.content_hash,
                }
                for emb in embedding_chunks
            ]

            await Database.save_ocr_result(
                document_id=job.document_id,
                ocr_text=ocr_result.text,
                embeddings=embeddings_data,
            )

            # Step 5: Update queue status to completed
            await Database.update_ocr_job_status(
                queue_id=job.queue_id, status="completed"
            )

            logger.info(f"✅ Job completed: {job.document_id}")

            # Step 6: Send webhook notification (optional)
            if self.webhook.enabled:
                await self.webhook.notify_success(
                    document_id=job.document_id,
                    queue_id=job.queue_id,
                    ocr_text=ocr_result.text,
                )

        except Exception as e:
            logger.error(f"❌ Job failed: {job.document_id} - {e}", exc_info=True)

            # Update queue status to failed
            try:
                await Database.update_ocr_job_status(
                    queue_id=job.queue_id, status="failed", error_message=str(e)
                )

                # Send webhook notification of failure
                if self.webhook.enabled:
                    await self.webhook.notify_failure(
                        document_id=job.document_id,
                        queue_id=job.queue_id,
                        error_message=str(e),
                    )

            except Exception as update_error:
                logger.error(f"Failed to update job status: {update_error}")
