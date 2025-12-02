"""
AI Labeling Worker

Uses Deepseek API to automatically label documents with metadata
"""

import json
from typing import Dict, Any, Optional
from loguru import logger
import httpx
from app.config import settings
from app.document_categories import SYSTEM_PROMPT, get_importance_score


class AILabelingWorker:
    """
    AI Labeling Worker

    Uses Deepseek API (OpenAI-compatible) to extract structured metadata from OCR text
    """

    def __init__(self):
        """Initialize AI labeling worker"""
        if not settings.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY is required for AI labeling")

        self.api_key = settings.deepseek_api_key
        self.api_base = "https://api.deepseek.com"
        self.model = "deepseek-chat"
        self.timeout = 60.0  # 60 seconds timeout

        logger.info(f"✅ AI Labeling Worker initialized (model: {self.model})")

    async def label_document(self, ocr_text: str, document_id: str) -> Dict[str, Any]:
        """
        Label a document using AI

        Args:
            ocr_text: Full OCR text from document
            document_id: Document UUID for logging

        Returns:
            Dictionary with extracted metadata

        Raises:
            Exception if API call fails or response is invalid
        """
        try:
            # Truncate OCR text if too long (cost optimization)
            truncated_text = self._truncate_ocr_text(ocr_text)

            logger.info(f"🤖 Labeling document {document_id} ({len(truncated_text)} chars)")

            # Call Deepseek API
            response = await self._call_deepseek_api(truncated_text)

            # Parse and validate response
            metadata = self._parse_response(response)

            # Add importance score based on category
            if metadata.get("category"):
                metadata["importance_score"] = get_importance_score(metadata["category"])

            logger.info(f"✅ Document labeled: {metadata.get('category', 'Unknown')}")

            return metadata

        except Exception as e:
            logger.error(f"❌ AI labeling failed for {document_id}: {e}", exc_info=True)
            raise

    def _truncate_ocr_text(self, text: str) -> str:
        """
        Truncate OCR text to reduce API costs

        Strategy:
        - If text <= 6000 chars: send everything
        - If text > 6000 chars: send first 4000 + last 2000 chars

        Most important info is usually at the beginning (document type, names, dates)
        and end (signatures)
        """
        if len(text) <= 6000:
            return text

        # Take first 4000 and last 2000 characters
        first_part = text[:4000]
        last_part = text[-2000:]

        truncated = f"{first_part}\n\n[... middle content truncated ...]\n\n{last_part}"

        logger.info(f"📏 OCR text truncated: {len(text)} → {len(truncated)} chars")

        return truncated

    async def _call_deepseek_api(self, ocr_text: str) -> str:
        """
        Call Deepseek API (OpenAI-compatible)

        Returns raw response text (should be JSON)
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Analyze this OCR text and extract metadata:\n\n{ocr_text}"
                }
            ],
            "temperature": 0.1,  # Low temperature for more deterministic outputs
            "max_tokens": 1000,  # Enough for our JSON response
            "response_format": {"type": "json_object"},  # Request JSON response
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.api_base}/v1/chat/completions",
                headers=headers,
                json=payload,
            )

            response.raise_for_status()

            data = response.json()

            # Extract response text
            if not data.get("choices") or len(data["choices"]) == 0:
                raise Exception("No choices in API response")

            content = data["choices"][0]["message"]["content"]

            return content

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse and validate AI response

        Expected format:
        {
          "category": "Document Type",
          "extracted_names": ["Name 1", "Name 2"],
          "extracted_addresses": ["Address 1"],
          "extracted_date_of_birth": "1990-05-15",
          "extracted_place_of_birth": "Madrid, Spain",
          "document_date": "2024-03-15",
          "due_date": null,
          "description": "Brief summary",
          "has_signature": true,
          "confidence": {
            "category": 0.95,
            "extracted_date_of_birth": 0.92,
            "extracted_place_of_birth": 0.85,
            "document_date": 0.88,
            ...
          }
        }
        """
        try:
            data = json.loads(response_text)

            # Validate required fields
            if "category" not in data:
                raise ValueError("Missing 'category' in AI response")

            # Build clean metadata object
            metadata = {
                "category": data.get("category"),
                "extracted_names": data.get("extracted_names", []),
                "extracted_addresses": data.get("extracted_addresses", []),
                "extracted_date_of_birth": data.get("extracted_date_of_birth"),  # NEW FIELD
                "extracted_place_of_birth": data.get("extracted_place_of_birth"),  # NEW FIELD
                "document_date": data.get("document_date"),
                "due_date": data.get("due_date"),
                "description": data.get("description"),
                "has_signature": data.get("has_signature", False),
                "ai_metadata": {
                    "confidence": data.get("confidence", {}),
                    "raw_response": data,  # Store full response for debugging
                },
            }

            # Calculate average confidence
            confidences = data.get("confidence", {})
            if confidences:
                avg_confidence = sum(confidences.values()) / len(confidences)
                metadata["ai_confidence"] = round(avg_confidence, 2)

            return metadata

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in AI response: {response_text}")
            raise ValueError(f"AI returned invalid JSON: {e}")
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            raise
