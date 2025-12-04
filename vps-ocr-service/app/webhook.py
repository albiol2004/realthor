"""Webhook notifier - Send results back to Realthor"""

import aiohttp
from typing import Optional
from loguru import logger
from app.config import settings
from app.models import WebhookPayload


class WebhookNotifier:
    """
    Webhook Notifier

    Sends OCR results back to Realthor main application
    """

    def __init__(self):
        self.enabled = settings.webhook_enabled
        self.url = settings.kairo_webhook_url
        self.secret = settings.webhook_secret

        if self.enabled and not self.url:
            logger.warning("⚠️ Webhook enabled but URL not configured")
            self.enabled = False

        if self.enabled and not self.secret:
            logger.warning("⚠️ Webhook enabled but secret not configured")

    async def notify_success(
        self, document_id: str, queue_id: str, ocr_text: str
    ) -> bool:
        """
        Notify Realthor that OCR processing completed successfully

        Args:
            document_id: Document UUID
            queue_id: Queue entry UUID
            ocr_text: Extracted text

        Returns:
            True if notification sent successfully
        """
        if not self.enabled:
            logger.debug("Webhook disabled, skipping notification")
            return False

        payload = WebhookPayload(
            document_id=document_id,
            queue_id=queue_id,
            status="completed",
            ocr_text=ocr_text,
            secret=self.secret or "",
        )

        return await self._send_webhook(payload)

    async def notify_failure(
        self, document_id: str, queue_id: str, error_message: str
    ) -> bool:
        """
        Notify Realthor that OCR processing failed

        Args:
            document_id: Document UUID
            queue_id: Queue entry UUID
            error_message: Error description

        Returns:
            True if notification sent successfully
        """
        if not self.enabled:
            logger.debug("Webhook disabled, skipping notification")
            return False

        payload = WebhookPayload(
            document_id=document_id,
            queue_id=queue_id,
            status="failed",
            error_message=error_message,
            secret=self.secret or "",
        )

        return await self._send_webhook(payload)

    async def _send_webhook(self, payload: WebhookPayload) -> bool:
        """Send webhook POST request"""
        try:
            logger.info(f"Sending webhook to {self.url}")

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.url,
                    json=payload.model_dump(),
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status == 200:
                        logger.info(f"✅ Webhook sent successfully")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"❌ Webhook failed: HTTP {response.status} - {error_text}"
                        )
                        return False

        except Exception as e:
            logger.error(f"❌ Failed to send webhook: {e}")
            return False
