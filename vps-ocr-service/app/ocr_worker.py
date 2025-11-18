"""OCR Worker - PaddleOCR processing"""

from paddleocr import PaddleOCR
import aiohttp
import tempfile
import os
import time
from pdf2image import convert_from_path
from PIL import Image
from typing import Dict, Any
from loguru import logger
from app.config import settings
from app.models import OCRResult


class OCRWorker:
    """
    OCR Worker using PaddleOCR

    Supports:
    - Spanish and English text extraction
    - PDF and image files
    - Layout analysis
    """

    def __init__(self):
        logger.info("Loading PaddleOCR models...")

        # Initialize PaddleOCR with Spanish as primary language
        # PaddleOCR will download models on first run (~200MB)
        self.ocr = PaddleOCR(
            lang="es",  # Spanish primary
            use_angle_cls=True,  # Detect text orientation
            use_gpu=settings.ocr_use_gpu,  # CPU for 2vCPU VPS
            show_log=False,
            use_space_char=True,  # Better word spacing
        )

        logger.info("✅ PaddleOCR models loaded")

    async def process(self, file_url: str, file_type: str) -> OCRResult:
        """
        Process document with OCR

        Args:
            file_url: URL to download file from (Supabase Storage)
            file_type: MIME type (application/pdf, image/jpeg, etc.)

        Returns:
            OCRResult with extracted text
        """
        start_time = time.time()

        # Download file
        file_path = await self._download_file(file_url)

        try:
            if file_type == "application/pdf":
                text, page_count = await self._process_pdf(file_path)
            else:  # Image files
                text = await self._process_image(file_path)
                page_count = 1

            processing_time = time.time() - start_time

            logger.info(f"✅ OCR completed in {processing_time:.2f}s ({page_count} pages)")

            return OCRResult(
                text=text,
                language="es",  # TODO: Detect language
                page_count=page_count,
                processing_time_seconds=processing_time,
            )

        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.debug(f"Cleaned up temp file: {file_path}")

    async def _download_file(self, url: str) -> str:
        """Download file from URL to temp directory"""
        try:
            logger.info(f"Downloading file from: {url[:50]}...")

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, timeout=aiohttp.ClientTimeout(total=settings.download_timeout_seconds)
                ) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to download file: HTTP {response.status}")

                    content = await response.read()

                    # Check file size
                    size_mb = len(content) / (1024 * 1024)
                    if size_mb > settings.max_file_size_mb:
                        raise Exception(
                            f"File too large: {size_mb:.1f}MB (max: {settings.max_file_size_mb}MB)"
                        )

                    # Save to temp file
                    suffix = ".pdf" if "pdf" in url.lower() else ".jpg"
                    with tempfile.NamedTemporaryFile(
                        delete=False, suffix=suffix, dir=settings.temp_dir
                    ) as tmp:
                        tmp.write(content)
                        logger.info(f"Downloaded {size_mb:.1f}MB to {tmp.name}")
                        return tmp.name

        except Exception as e:
            logger.error(f"Failed to download file: {e}")
            raise

    async def _process_pdf(self, pdf_path: str) -> tuple[str, int]:
        """
        Extract text from PDF

        Converts PDF pages to images and runs OCR on each
        """
        logger.info(f"Converting PDF to images: {pdf_path}")

        try:
            # Convert PDF to images (200 DPI is good balance for OCR)
            images = convert_from_path(
                pdf_path,
                dpi=200,
                fmt="jpeg",
                thread_count=settings.worker_threads,
            )

            page_count = len(images)
            logger.info(f"PDF has {page_count} page(s)")

            all_text = []

            for i, image in enumerate(images):
                logger.info(f"Processing page {i + 1}/{page_count}")

                # Save image temporarily
                img_path = os.path.join(settings.temp_dir, f"page_{i}_{os.getpid()}.jpg")
                image.save(img_path, "JPEG", quality=85)

                try:
                    # Run OCR on image
                    result = self.ocr.ocr(img_path, cls=True)

                    # Extract text
                    page_text = self._extract_text_from_result(result)

                    if page_text.strip():
                        all_text.append(f"=== Página {i + 1} ===\n{page_text}")
                    else:
                        logger.warning(f"No text found on page {i + 1}")

                finally:
                    # Clean up temp image
                    if os.path.exists(img_path):
                        os.remove(img_path)

            full_text = "\n\n".join(all_text)
            return full_text, page_count

        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            raise

    async def _process_image(self, image_path: str) -> str:
        """Extract text from image file"""
        logger.info(f"Processing image: {image_path}")

        try:
            # Run OCR
            result = self.ocr.ocr(image_path, cls=True)

            # Extract text
            text = self._extract_text_from_result(result)

            if not text.strip():
                logger.warning("No text found in image")

            return text

        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise

    def _extract_text_from_result(self, result) -> str:
        """
        Extract text from PaddleOCR result

        PaddleOCR returns: [[[coords], (text, confidence)], ...]
        """
        if not result or not result[0]:
            return ""

        lines = []

        for line in result[0]:
            try:
                # Extract text and confidence
                text = line[1][0]  # Text string
                confidence = line[1][1]  # Confidence score

                # Only include text with reasonable confidence
                if confidence > 0.5:
                    lines.append(text)
                else:
                    logger.debug(f"Low confidence text skipped: '{text}' ({confidence:.2f})")

            except (IndexError, TypeError) as e:
                logger.warning(f"Failed to extract text from line: {e}")
                continue

        return "\n".join(lines)
