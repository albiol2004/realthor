"""AI Labeling Job Poller - Polls database for AI labeling jobs and processes them"""

import asyncio
from typing import Optional, Dict, Any
from loguru import logger
from app.config import settings
from app.database import Database
from app.ai_labeling_worker import AILabelingWorker
from app.contact_matching_worker import ContactMatchingWorker
from app.models import AILabelingJob


class AILabelingPoller:
    """
    AI Labeling Job Poller

    Continuously polls the database for pending AI labeling jobs
    and processes them using AI Labeling worker
    """

    def __init__(self, ai_worker: AILabelingWorker):
        self.ai_worker = ai_worker
        self.contact_matcher = ContactMatchingWorker()  # AI-powered contact matching
        self.is_running = False
        self.task: Optional[asyncio.Task] = None

    async def start(self):
        """Start polling for AI labeling jobs"""
        if self.is_running:
            logger.warning("AI labeling poller already running")
            return

        self.is_running = True
        self.task = asyncio.create_task(self._poll_loop())
        logger.info(f"✅ AI labeling poller started (instance: {settings.vps_instance_id})")

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

        logger.info("AI labeling poller stopped")

    async def _poll_loop(self):
        """Main polling loop"""
        consecutive_errors = 0
        max_consecutive_errors = 5

        while self.is_running:
            try:
                # Get next AI labeling job from database
                job_data = await Database.get_next_ai_labeling_job(settings.vps_instance_id)

                if job_data:
                    # Reset error counter on successful job fetch
                    consecutive_errors = 0

                    # Process the job
                    await self._process_job(AILabelingJob(**job_data))

                else:
                    # No jobs available, wait before polling again
                    await asyncio.sleep(settings.poll_interval_seconds)

            except asyncio.CancelledError:
                logger.info("AI labeling poll loop cancelled")
                break

            except Exception as e:
                consecutive_errors += 1
                logger.error(
                    f"❌ Error in AI labeling poll loop (#{consecutive_errors}): {e}",
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

    async def _process_job(self, job: AILabelingJob):
        """
        Process a single AI labeling job

        Steps:
        1. Call AI worker to label document
        2. Save metadata to database
        3. Match contacts/properties from extracted names/addresses
        4. Update queue status
        """
        logger.info(f"🤖 Processing AI labeling job: {job.document_id} (trigger: {job.trigger_type})")

        try:
            # Validate OCR text exists
            if not job.ocr_text or not job.ocr_text.strip():
                raise Exception("No OCR text available for AI labeling")

            # Step 1: AI labeling
            logger.info(f"[1/3] Running AI labeling")
            metadata = await self.ai_worker.label_document(job.ocr_text, job.document_id)

            logger.info(
                f"✅ AI labeled: category={metadata.get('category', 'Unknown')}, "
                f"confidence={metadata.get('ai_confidence', 0)}"
            )

            # Step 2: Save AI labeling result to database
            logger.info(f"[2/3] Saving AI labels to database")
            await Database.save_ai_labeling_result(job.document_id, metadata)

            # Step 3: Match contacts/properties (TODO: implement matching service)
            logger.info(f"[3/3] Matching contacts/properties")
            await self._match_entities(job.document_id, job.user_id, metadata)

            # Step 4: Update queue status to completed
            await Database.update_ai_labeling_job_status(
                queue_id=job.queue_id, status="completed"
            )

            logger.info(f"✅ AI labeling job completed: {job.document_id}")

        except Exception as e:
            logger.error(f"❌ AI labeling job failed: {job.document_id} - {e}", exc_info=True)

            # Update queue status to failed
            try:
                await Database.update_ai_labeling_job_status(
                    queue_id=job.queue_id, status="failed", error_message=str(e)
                )
            except Exception as update_error:
                logger.error(f"Failed to update AI labeling job status: {update_error}")

    async def _match_entities(
        self, document_id: str, user_id: str, metadata: Dict[str, Any]
    ):
        """
        Match extracted names and addresses to contacts and properties

        Uses AI-powered matching to intelligently link documents to contacts
        """
        extracted_names = metadata.get("extracted_names", [])
        extracted_addresses = metadata.get("extracted_addresses", [])
        extracted_date_of_birth = metadata.get("extracted_date_of_birth")  # NEW: For ID documents
        extracted_place_of_birth = metadata.get("extracted_place_of_birth")  # NEW: For ID documents

        matched_contacts = []

        # Build document context for AI matching
        # These fields help the AI matcher make better decisions, especially for ID documents
        document_context = {
            "extracted_addresses": extracted_addresses,
            "extracted_date_of_birth": extracted_date_of_birth,  # CRITICAL for ID matching
            "extracted_place_of_birth": extracted_place_of_birth,  # CRITICAL for ID matching
        }

        # Match contacts from extracted names
        if extracted_names:
            logger.info(f"📝 Extracted names: {', '.join(extracted_names)}")
            if extracted_addresses:
                logger.info(f"📍 Extracted addresses: {', '.join(extracted_addresses)}")
            if extracted_date_of_birth:
                logger.info(f"🎂 Extracted date of birth: {extracted_date_of_birth}")
            if extracted_place_of_birth:
                logger.info(f"🌍 Extracted place of birth: {extracted_place_of_birth}")

            for name in extracted_names:
                try:
                    # Step 1: Search for candidate contacts
                    logger.info(f"🔍 Searching for contact: '{name}' (user_id: {user_id[:8]}...)")
                    candidates = await Database.search_contacts_by_name(
                        user_id=user_id,
                        name=name,
                        limit=5  # Top 5 candidates
                    )

                    if not candidates:
                        logger.info(f"❌ No contact candidates found for '{name}'")
                        continue

                    logger.info(f"✅ Found {len(candidates)} contact candidate(s) for '{name}'")

                    # Step 2: Use AI to choose the best match (with document context)
                    matched_contact_id = await self.contact_matcher.match_contact(
                        extracted_name=name,
                        candidates=candidates,
                        document_context=document_context
                    )

                    # Step 3: Link if confident match found
                    if matched_contact_id:
                        success = await Database.link_contact_to_document(
                            document_id=document_id,
                            contact_id=matched_contact_id
                        )
                        if success:
                            matched_contacts.append(matched_contact_id)
                            logger.info(f"🔗 Linked contact {matched_contact_id} to document")
                        else:
                            logger.warning(f"⚠️ Failed to link contact {matched_contact_id} to document")
                    else:
                        logger.info(f"⚠️ No confident match for '{name}', skipping auto-link")

                except Exception as e:
                    logger.error(f"Failed to match contact for name '{name}': {e}")
                    continue

        # Log matching summary
        if matched_contacts:
            logger.info(
                f"✅ Auto-linked {len(matched_contacts)} contact(s) to document {document_id}"
            )
        elif extracted_names:
            logger.info(f"⚠️ No contacts auto-linked for document {document_id} (had {len(extracted_names)} extracted name(s))")
        else:
            logger.info(f"ℹ️ No names extracted from document {document_id}, skipping contact matching")

        # TODO: Property matching from extracted_addresses
        # Similar logic to contact matching, but searching properties table
        if extracted_addresses:
            logger.info(f"🏠 Extracted addresses: {', '.join(extracted_addresses)}")
            # Placeholder for future property matching implementation
            pass
