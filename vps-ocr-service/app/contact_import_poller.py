"""
Contact Import Poller

Polls the database for pending contact import jobs and processes them.
Handles both analysis phase (CSV parsing, AI mapping, duplicate detection)
and execution phase (creating/updating contacts).
"""

import asyncio
from typing import Optional
from loguru import logger
from dataclasses import asdict

from app.config import settings
from app.database import Database
from app.contact_import_worker import ContactImportWorker, ImportRow


class ContactImportPoller:
    """
    Contact Import Poller

    Continuously polls the database for pending import jobs
    and processes them using the ContactImportWorker.

    Two phases:
    1. Analysis: Parse CSV, map columns, detect duplicates
    2. Execution: Create/update contacts based on decisions
    """

    def __init__(self, worker: ContactImportWorker):
        self.worker = worker
        self.is_running = False
        self.task: Optional[asyncio.Task] = None

    async def start(self):
        """Start polling for jobs"""
        if self.is_running:
            logger.warning("Contact import poller already running")
            return

        self.is_running = True
        self.task = asyncio.create_task(self._poll_loop())
        logger.info(f"Contact import poller started (instance: {settings.vps_instance_id})")

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

        logger.info("Contact import poller stopped")

    async def _poll_loop(self):
        """Main polling loop"""
        consecutive_errors = 0
        max_consecutive_errors = 5

        while self.is_running:
            try:
                # Get next job from database
                job_data = await Database.get_next_import_job(settings.vps_instance_id)

                if job_data:
                    # Reset error counter on successful job fetch
                    consecutive_errors = 0

                    # Process the job
                    await self._process_job(job_data)
                else:
                    # No jobs available, wait before polling again
                    await asyncio.sleep(settings.poll_interval_seconds)

            except asyncio.CancelledError:
                logger.info("Contact import poll loop cancelled")
                break

            except Exception as e:
                consecutive_errors += 1
                logger.error(
                    f"Error in contact import poll loop (#{consecutive_errors}): {e}",
                    exc_info=True
                )

                if consecutive_errors >= max_consecutive_errors:
                    logger.error(
                        f"Too many consecutive errors ({consecutive_errors}), backing off 60s"
                    )
                    await asyncio.sleep(60)
                    consecutive_errors = 0
                else:
                    await asyncio.sleep(10)

    async def _process_job(self, job_data: dict):
        """
        Process a single import job

        Routes to analysis or execution based on job status
        """
        job_id = str(job_data["job_id"])
        user_id = str(job_data["user_id"])
        mode = job_data["mode"]
        status = job_data["status"]
        file_url = job_data["file_url"]
        file_name = job_data["file_name"]

        logger.info(f"Processing import job {job_id} (status: {status}, mode: {mode})")

        try:
            if status == "analyzing":
                # Phase 1: Analysis
                await self._analyze_job(job_id, user_id, mode, file_url, file_name)

            elif status == "processing":
                # Phase 2: Execution
                await self._execute_job(job_id, user_id, mode)

            else:
                logger.warning(f"Unexpected job status: {status}")

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)
            await Database.update_import_job_status(
                job_id,
                "failed",
                error_message=str(e)
            )

    async def _analyze_job(
        self,
        job_id: str,
        user_id: str,
        mode: str,
        file_url: str,
        file_name: str
    ):
        """
        Phase 1: Analyze the CSV file

        Steps:
        1. Download CSV from storage
        2. Parse CSV to extract headers and rows
        3. Use AI to map columns to contact fields
        4. Analyze rows for duplicates and conflicts
        5. Save analysis results
        6. Update job status based on mode
        """
        logger.info(f"[1/6] Downloading file: {file_name}")

        # Step 1: Download file
        file_content = await Database.download_file_from_storage(file_url)
        if not file_content:
            raise Exception(f"Failed to download file from storage: {file_url}")

        logger.info(f"[2/6] Parsing CSV ({len(file_content)} bytes)")

        # Step 2: Parse CSV
        headers, rows = await self.worker.parse_csv(file_content, file_name)

        if not rows:
            raise Exception("CSV file is empty or could not be parsed")

        logger.info(f"[3/6] AI mapping columns ({len(headers)} headers)")

        # Step 3: AI column mapping
        sample_rows = rows[:5]  # Use first 5 rows as sample
        column_mapping = await self.worker.map_columns_with_ai(headers, sample_rows)

        # Save mapping to job
        await Database.save_import_job_mapping(job_id, column_mapping, headers)

        # Validate required fields are mapped
        if "first_name" not in column_mapping.values() or "last_name" not in column_mapping.values():
            raise Exception(
                "Could not map required fields (first_name, last_name). "
                "Please check your CSV has name columns."
            )

        logger.info(f"[4/6] Analyzing {len(rows)} rows for duplicates")

        # Step 4: Analyze rows
        analyzed_rows = await self.worker.analyze_rows(rows, column_mapping, user_id)

        logger.info(f"[5/6] Saving analysis results")

        # Step 5: Save rows to database
        rows_to_save = [
            {
                "row_number": row.row_number,
                "raw_data": row.raw_data,
                "mapped_data": row.mapped_data,
                "status": row.status,
                "matched_contact_id": row.matched_contact_id,
                "match_confidence": row.match_confidence,
                "conflicts": row.conflicts
            }
            for row in analyzed_rows
        ]

        await Database.save_import_rows(job_id, rows_to_save)

        # Calculate stats
        stats = {
            "total_rows": len(analyzed_rows),
            "new_count": sum(1 for r in analyzed_rows if r.status == "new"),
            "duplicate_count": sum(1 for r in analyzed_rows if r.status == "duplicate"),
            "conflict_count": sum(1 for r in analyzed_rows if r.status == "conflict")
        }

        logger.info(f"[6/6] Determining next step based on mode: {mode}")

        # Step 6: Update status based on mode
        if mode == "turbo":
            # Turbo mode: proceed directly to execution
            await Database.update_import_job_status(job_id, "processing", stats=stats)
            logger.info(f"Job {job_id}: Turbo mode - proceeding to execution")

        elif mode == "safe":
            # Safe mode: always require review
            await Database.update_import_job_status(job_id, "pending_review", stats=stats)
            logger.info(f"Job {job_id}: Safe mode - waiting for review")

        elif mode == "balanced":
            # Balanced mode: require review only if there are duplicates/conflicts
            if stats["duplicate_count"] > 0 or stats["conflict_count"] > 0:
                await Database.update_import_job_status(job_id, "pending_review", stats=stats)
                logger.info(f"Job {job_id}: Balanced mode - duplicates/conflicts found, waiting for review")
            else:
                await Database.update_import_job_status(job_id, "processing", stats=stats)
                logger.info(f"Job {job_id}: Balanced mode - no conflicts, proceeding to execution")

        logger.info(f"Analysis complete for job {job_id}: {stats}")

    async def _execute_job(
        self,
        job_id: str,
        user_id: str,
        mode: str
    ):
        """
        Phase 2: Execute the import

        Creates/updates contacts based on analysis and user decisions
        """
        logger.info(f"Executing import for job {job_id}")

        # Execute import
        result_stats = await self.worker.execute_import(job_id, user_id, mode)

        # Update job with final stats
        await Database.update_import_job_status(
            job_id,
            "completed",
            stats={
                "created_count": result_stats["created"],
                "updated_count": result_stats["updated"],
                "skipped_count": result_stats["skipped"]
            }
        )

        logger.info(f"Job {job_id} completed: created={result_stats['created']}, "
                   f"updated={result_stats['updated']}, skipped={result_stats['skipped']}")
