"""Embeddings Worker - sentence-transformers processing"""

from sentence_transformers import SentenceTransformer
import hashlib
from typing import List, Dict, Any
from loguru import logger
from app.config import settings
from app.models import EmbeddingChunk


class EmbeddingsWorker:
    """
    Embeddings Worker using sentence-transformers

    Model: paraphrase-multilingual-MiniLM-L12-v2
    - 384 dimensions (lightweight)
    - Multilingual (50+ languages including Spanish/English)
    - Runs efficiently on CPU
    - ~500MB RAM usage
    """

    def __init__(self):
        logger.info(f"Loading embeddings model: {settings.embeddings_model}")

        # Load multilingual model
        # Model will be downloaded on first run (~500MB)
        self.model = SentenceTransformer(
            settings.embeddings_model, device=settings.embeddings_device
        )

        # Set batch size for encoding
        self.batch_size = settings.embeddings_batch_size

        logger.info("✅ Embeddings model loaded")

    async def generate(
        self, document_id: str, user_id: str, text: str
    ) -> List[EmbeddingChunk]:
        """
        Generate embeddings for document text

        Args:
            document_id: Document UUID
            user_id: User UUID
            text: Extracted OCR text

        Returns:
            List of EmbeddingChunk objects
        """
        if not text or not text.strip():
            logger.warning(f"No text provided for document {document_id}")
            return []

        # Split text into chunks
        chunks = self._split_text(text)

        if not chunks:
            logger.warning(f"No chunks generated for document {document_id}")
            return []

        logger.info(
            f"Generating embeddings for {len(chunks)} chunks (document {document_id})"
        )

        # Extract text from chunks
        chunk_texts = [chunk["text"] for chunk in chunks]

        # Generate embeddings in batches
        embeddings = self.model.encode(
            chunk_texts,
            batch_size=self.batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
        )

        # Create EmbeddingChunk objects
        embedding_chunks = []

        for i, (chunk, embedding_vector) in enumerate(zip(chunks, embeddings)):
            chunk_obj = EmbeddingChunk(
                document_id=document_id,
                user_id=user_id,
                chunk_index=i,
                chunk_text=chunk["text"],
                chunk_length=len(chunk["text"]),
                embedding=embedding_vector.tolist(),  # Convert numpy array to list
                content_hash=self._hash_text(chunk["text"]),
            )
            embedding_chunks.append(chunk_obj)

        logger.info(f"✅ Generated {len(embedding_chunks)} embeddings")

        return embedding_chunks

    def _split_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks

        Uses character-based chunking with overlap to preserve context
        """
        chunks = []
        chunk_size = settings.embeddings_chunk_size
        chunk_overlap = settings.embeddings_chunk_overlap

        # Clean text
        text = text.strip()

        if len(text) <= chunk_size:
            # Text is small enough, return as single chunk
            return [{"text": text, "start": 0, "end": len(text)}]

        start = 0

        while start < len(text):
            end = start + chunk_size

            # Don't create tiny chunks at the end
            if end >= len(text):
                end = len(text)
            elif len(text) - end < chunk_overlap:
                # If remaining text is smaller than overlap, include it all
                end = len(text)

            chunk_text = text[start:end].strip()

            if chunk_text:  # Only add non-empty chunks
                chunks.append({"text": chunk_text, "start": start, "end": end})

            # Move start position with overlap
            start += chunk_size - chunk_overlap

            # Prevent infinite loop
            if start >= len(text):
                break

        return chunks

    def _hash_text(self, text: str) -> str:
        """
        Create hash of text for deduplication

        Uses SHA256 hash truncated to 16 characters
        """
        return hashlib.sha256(text.encode()).hexdigest()[:16]
