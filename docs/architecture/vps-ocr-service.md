# VPS OCR Service Architecture

> **Lightweight document intelligence service for 8GB RAM / 2vCPU VPS**
> Spanish-first OCR + Local embeddings + Queue-based processing

## Overview

This document describes the VPS-based OCR and document intelligence service that runs independently from the main Kairo application. It provides:

1. **OCR Processing** - PaddleOCR + PP-Structure (Spanish + English)
2. **Embeddings Generation** - sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384d)
3. **Queue Management** - PostgreSQL-based job queue with retry logic
4. **Webhook Callbacks** - Results sent back to Kairo main app

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Framework | FastAPI (Python 3.10+) | Async, fast, great ML ecosystem |
| OCR Engine | PaddleOCR | Better Spanish support than Tesseract, open source |
| Layout Analysis | PP-Structure | Extract tables, titles, paragraphs from PDFs |
| Embeddings | sentence-transformers | Multilingual, 384d (lightweight), runs on CPU |
| Queue | PostgreSQL | Reuse Kairo database, no extra infra |
| Process Manager | Supervisor or systemd | Auto-restart on crash |
| Web Server | Uvicorn | ASGI server for FastAPI |

## VPS Requirements

**Minimum Specs:**
- 8GB RAM (current VPS ✅)
- 2 vCPU (current VPS ✅)
- 20GB storage (for models + temp files)
- Ubuntu 22.04 LTS

**Software Dependencies:**
```bash
# System packages
apt-get install python3.10 python3-pip libgl1 libglib2.0-0 poppler-utils

# Python packages (requirements.txt)
fastapi==0.109.0
uvicorn[standard]==0.27.0
paddleocr==2.7.0
paddlepaddle==2.6.0  # CPU version
sentence-transformers==2.3.1
torch==2.2.0+cpu     # CPU-only PyTorch
psycopg2-binary==2.9.9
pdf2image==1.17.0
Pillow==10.2.0
python-multipart==0.0.6
aiohttp==3.9.1
redis==5.0.1         # Optional: for future Redis queue
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Kairo Main App                        │
│  (Vercel + Supabase)                                        │
│                                                              │
│  1. User uploads document → Supabase Storage                │
│  2. Document record created → Triggers auto_queue_trigger    │
│  3. OCR queue entry created (status: queued)                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ PostgreSQL Connection
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                                                              │
│  Tables:                                                     │
│  - documents (file_url, ocr_text, ai_metadata)              │
│  - document_embeddings (embedding vector(384))              │
│  - ocr_queue (status, priority, attempts)                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Poll for jobs
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  VPS OCR Service (FastAPI)                   │
│  8GB RAM / 2 vCPU                                           │
│                                                              │
│  Components:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Job Poller (async background task)                   │   │
│  │ - Polls ocr_queue every 5 seconds                    │   │
│  │ - Calls get_next_ocr_job() function                  │   │
│  │ - Updates status to "processing"                     │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ OCR Worker (PaddleOCR + PP-Structure)               │   │
│  │ - Downloads file from Supabase Storage               │   │
│  │ - Extracts text (Spanish/English)                    │   │
│  │ - Analyzes layout (tables, paragraphs)              │   │
│  │ - ~30-60 seconds per document                        │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Embeddings Generator (sentence-transformers)        │   │
│  │ - Splits text into chunks (500 tokens)               │   │
│  │ - Generates 384d embeddings                          │   │
│  │ - ~5-10 seconds per document                         │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Database Writer                                      │   │
│  │ - Saves ocr_text to documents table                  │   │
│  │ - Saves embeddings to document_embeddings           │   │
│  │ - Updates ocr_queue status to "completed"           │   │
│  └─────────────────┬───────────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     │ Webhook (optional)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Kairo Main App Webhook                       │
│  /api/webhooks/ocr                                          │
│                                                              │
│  - Triggers AI metadata extraction (Deepseek)               │
│  - Updates document status in UI                            │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
vps-ocr-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Configuration
│   ├── database.py                # PostgreSQL connection
│   ├── models.py                  # Pydantic models
│   ├── ocr_worker.py              # PaddleOCR processing
│   ├── embeddings_worker.py       # Embeddings generation
│   ├── job_poller.py              # Background job poller
│   └── utils.py                   # Helper functions
├── tests/
│   ├── test_ocr.py
│   └── test_embeddings.py
├── models/                        # Downloaded ML models
│   ├── paddle_ocr/
│   └── sentence_transformers/
├── temp/                          # Temp file storage
├── requirements.txt
├── Dockerfile                     # For Docker deployment (optional)
├── supervisor.conf                # Process manager config
└── README.md
```

## API Endpoints

### Health Check
```
GET /health
Response: {"status": "ok", "models_loaded": true, "queue_size": 5}
```

### Manual Job Trigger (Admin Only)
```
POST /api/process-document
{
  "document_id": "uuid",
  "priority": 8  // 1-10 scale
}
Response: {"job_id": "uuid", "status": "queued"}
```

### Queue Status
```
GET /api/queue/stats
Response: {
  "queued": 3,
  "processing": 1,
  "completed_today": 42,
  "failed": 0
}
```

## Configuration

### Environment Variables (`/etc/ocr-service/.env`)

```bash
# Database
DATABASE_URL=postgresql://user:pass@supabase-db:5432/postgres
VPS_INSTANCE_ID=vps-01  # Unique identifier for this VPS

# OCR Settings
OCR_LANGUAGE=es,en  # Spanish, English
OCR_USE_GPU=false   # CPU only for 2vCPU VPS
OCR_BATCH_SIZE=1    # Process one document at a time
MAX_FILE_SIZE_MB=50 # Max file size to process

# Embeddings Settings
EMBEDDINGS_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDINGS_DEVICE=cpu
EMBEDDINGS_CHUNK_SIZE=500  # Tokens per chunk
EMBEDDINGS_CHUNK_OVERLAP=50

# Queue Settings
POLL_INTERVAL_SECONDS=5
MAX_RETRIES=3
JOB_TIMEOUT_MINUTES=15

# Webhook (optional)
KAIRO_WEBHOOK_URL=https://kairo.vercel.app/api/webhooks/ocr
WEBHOOK_SECRET=your-secret-key

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/ocr-service/app.log
```

## Code Examples

### Main FastAPI App (`app/main.py`)

```python
from fastapi import FastAPI, BackgroundTasks
from contextlib import asynccontextmanager
from app.job_poller import JobPoller
from app.ocr_worker import OCRWorker
from app.embeddings_worker import EmbeddingsWorker
from app.database import Database
import logging

# Global instances
ocr_worker = None
embeddings_worker = None
job_poller = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global ocr_worker, embeddings_worker, job_poller

    # Load models on startup
    logging.info("Loading OCR and embeddings models...")
    ocr_worker = OCRWorker()
    embeddings_worker = EmbeddingsWorker()

    # Start job poller
    job_poller = JobPoller(ocr_worker, embeddings_worker)
    await job_poller.start()

    logging.info("✅ OCR Service ready")
    yield

    # Shutdown
    await job_poller.stop()
    logging.info("OCR Service stopped")

app = FastAPI(
    title="Kairo OCR Service",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "models_loaded": ocr_worker is not None and embeddings_worker is not None,
        "queue_size": await Database.get_queue_size()
    }

@app.get("/api/queue/stats")
async def queue_stats():
    return await Database.get_queue_stats()
```

### Job Poller (`app/job_poller.py`)

```python
import asyncio
import logging
from app.database import Database
from app.config import settings

class JobPoller:
    def __init__(self, ocr_worker, embeddings_worker):
        self.ocr_worker = ocr_worker
        self.embeddings_worker = embeddings_worker
        self.is_running = False
        self.task = None

    async def start(self):
        """Start polling for jobs"""
        self.is_running = True
        self.task = asyncio.create_task(self._poll_loop())
        logging.info("Job poller started")

    async def stop(self):
        """Stop polling"""
        self.is_running = False
        if self.task:
            await self.task
        logging.info("Job poller stopped")

    async def _poll_loop(self):
        """Main polling loop"""
        while self.is_running:
            try:
                # Get next job from database
                job = await Database.get_next_ocr_job(settings.VPS_INSTANCE_ID)

                if job:
                    await self._process_job(job)
                else:
                    # No jobs available, wait before polling again
                    await asyncio.sleep(settings.POLL_INTERVAL_SECONDS)

            except Exception as e:
                logging.error(f"Error in poll loop: {e}")
                await asyncio.sleep(10)  # Back off on error

    async def _process_job(self, job):
        """Process a single OCR job"""
        try:
            logging.info(f"Processing document {job['document_id']}")

            # Step 1: OCR
            ocr_result = await self.ocr_worker.process(
                file_url=job['file_url'],
                file_type=job['file_type']
            )

            # Step 2: Generate embeddings
            embeddings = await self.embeddings_worker.generate(
                document_id=job['document_id'],
                text=ocr_result['text']
            )

            # Step 3: Save to database
            await Database.save_ocr_result(
                document_id=job['document_id'],
                ocr_text=ocr_result['text'],
                embeddings=embeddings
            )

            # Step 4: Update queue status
            await Database.update_ocr_job_status(
                queue_id=job['queue_id'],
                status='completed'
            )

            logging.info(f"✅ Completed document {job['document_id']}")

        except Exception as e:
            logging.error(f"❌ Failed to process document {job['document_id']}: {e}")
            await Database.update_ocr_job_status(
                queue_id=job['queue_id'],
                status='failed',
                error_message=str(e)
            )
```

### OCR Worker (`app/ocr_worker.py`)

```python
from paddleocr import PaddleOCR
from paddleocr import PPStructure
import aiohttp
import tempfile
import os
from pdf2image import convert_from_path
from PIL import Image

class OCRWorker:
    def __init__(self):
        # Initialize PaddleOCR (Spanish + English)
        self.ocr = PaddleOCR(
            lang='es',  # Spanish primary
            use_angle_cls=True,  # Detect text orientation
            use_gpu=False,  # CPU only
            show_log=False
        )

        # Initialize PP-Structure for layout analysis
        self.structure = PPStructure(
            lang='es',
            use_gpu=False,
            show_log=False
        )

    async def process(self, file_url: str, file_type: str) -> dict:
        """Process document with OCR"""

        # Download file
        file_path = await self._download_file(file_url)

        try:
            if file_type == 'application/pdf':
                text = await self._process_pdf(file_path)
            else:  # image
                text = await self._process_image(file_path)

            return {
                'text': text,
                'language': 'es',  # TODO: Detect language
                'page_count': 1    # TODO: Count pages for PDFs
            }
        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)

    async def _download_file(self, url: str) -> str:
        """Download file from Supabase Storage"""
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                content = await response.read()

                # Save to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    tmp.write(content)
                    return tmp.name

    async def _process_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF"""
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=200, fmt='jpeg')

        all_text = []
        for i, image in enumerate(images):
            # Save image temporarily
            img_path = f"/tmp/page_{i}.jpg"
            image.save(img_path, 'JPEG')

            # Run OCR on image
            result = self.ocr.ocr(img_path, cls=True)

            # Extract text
            page_text = self._extract_text_from_result(result)
            all_text.append(page_text)

            # Clean up
            os.remove(img_path)

        return '\n\n'.join(all_text)

    async def _process_image(self, image_path: str) -> str:
        """Extract text from image"""
        result = self.ocr.ocr(image_path, cls=True)
        return self._extract_text_from_result(result)

    def _extract_text_from_result(self, result) -> str:
        """Extract text from PaddleOCR result"""
        if not result or not result[0]:
            return ""

        lines = []
        for line in result[0]:
            text = line[1][0]  # [[[coords], (text, confidence)]]
            lines.append(text)

        return '\n'.join(lines)
```

### Embeddings Worker (`app/embeddings_worker.py`)

```python
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict
from app.database import Database

class EmbeddingsWorker:
    def __init__(self):
        # Load multilingual lightweight model (384 dimensions)
        self.model = SentenceTransformer(
            'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
            device='cpu'
        )

        self.chunk_size = 500  # characters per chunk
        self.chunk_overlap = 50

    async def generate(self, document_id: str, text: str) -> List[Dict]:
        """Generate embeddings for document text"""

        # Split text into chunks
        chunks = self._split_text(text)

        # Generate embeddings for all chunks
        embeddings = []
        for i, chunk in enumerate(chunks):
            # Generate embedding
            embedding_vector = self.model.encode(chunk['text'])

            embeddings.append({
                'document_id': document_id,
                'chunk_index': i,
                'chunk_text': chunk['text'],
                'chunk_length': len(chunk['text']),
                'embedding': embedding_vector.tolist(),
                'content_hash': self._hash_text(chunk['text'])
            })

        return embeddings

    def _split_text(self, text: str) -> List[Dict]:
        """Split text into overlapping chunks"""
        chunks = []
        start = 0

        while start < len(text):
            end = start + self.chunk_size
            chunk_text = text[start:end]

            chunks.append({
                'text': chunk_text,
                'start': start,
                'end': end
            })

            start += (self.chunk_size - self.chunk_overlap)

        return chunks

    def _hash_text(self, text: str) -> str:
        """Create hash of text for deduplication"""
        import hashlib
        return hashlib.sha256(text.encode()).hexdigest()[:16]
```

## Deployment

### Option 1: Systemd Service (Recommended)

```bash
# /etc/systemd/system/ocr-service.service
[Unit]
Description=Kairo OCR Service
After=network.target postgresql.service

[Service]
Type=simple
User=ocruser
WorkingDirectory=/opt/ocr-service
Environment="PATH=/opt/ocr-service/venv/bin"
EnvironmentFile=/etc/ocr-service/.env
ExecStart=/opt/ocr-service/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ocr-service
sudo systemctl start ocr-service
sudo systemctl status ocr-service
```

### Option 2: Docker (Alternative)

```dockerfile
FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Performance Optimization

### Memory Usage
- PaddleOCR models: ~1.5GB RAM
- sentence-transformers model: ~500MB RAM
- FastAPI + workers: ~500MB RAM
- **Total: ~2.5GB / 8GB available ✅**

### Processing Speed
- OCR per page: ~5-10 seconds (CPU)
- Embeddings generation: ~2-3 seconds
- **Total per document: ~30-60 seconds**

### Scalability
- Current setup: ~50-100 docs/day on single 2vCPU VPS
- Add more VPS instances: Just deploy with different VPS_INSTANCE_ID
- Queue automatically distributes jobs using row-level locking

## Cost Comparison

### VPS OCR Service (This Architecture)
- **VPS**: $5-10/month (8GB)
- **Models**: Free (open source)
- **Processing**: Free (no API calls)
- **Cost per 1000 docs**: ~$0.10 (electricity only)

### Third-Party OCR (e.g., Google Cloud Vision)
- **Cost per 1000 docs**: $1.50-$3.00 (OCR only, no embeddings)

### OpenAI Embeddings
- **Cost per 1000 docs**: $0.10-$0.20 (text-embedding-3-small)

### sentence-transformers (This Architecture)
- **Cost per 1000 docs**: $0 (runs locally)

**Total savings: ~95% compared to cloud services** 💰

## Monitoring

### Health Checks
```bash
curl http://localhost:8000/health
```

### Logs
```bash
sudo journalctl -u ocr-service -f
```

### Queue Status
```bash
curl http://localhost:8000/api/queue/stats
```

## Next Steps

1. **Apply the migration** - Run the SQL migration on Supabase
2. **Set up VPS** - Install dependencies, deploy FastAPI service
3. **Test locally** - Process a sample document
4. **Integrate with Kairo** - Add webhook handler for completed OCR jobs
5. **Build UI** - Document upload interface in Kairo frontend
6. **Add AI metadata** - Integrate Deepseek for smart extraction

---

**Questions?** This architecture is production-ready for MVP scale (100s of docs/month) and can scale to 1000s by adding more VPS instances.
