# Kairo VPS OCR Service

> **Lightweight document OCR processing with embeddings generation**
> Optimized for 8GB RAM / 2vCPU VPS running Spanish/English documents

## Overview

This service provides:
- **OCR Processing** - PaddleOCR for Spanish and English text extraction
- **Embeddings Generation** - sentence-transformers for 384d semantic vectors
- **Queue Management** - PostgreSQL-based job queue with retry logic
- **Webhook Notifications** - Optional callbacks to Kairo main application

**Processing Time:** ~30-60 seconds per document
**Cost:** Just the VPS ($5-10/month) - no API costs!

## Architecture

```
┌─────────────────────────────────────────┐
│  FastAPI Application (port 8000)        │
│  ├── Health check endpoints             │
│  ├── Queue stats endpoint               │
│  └── Test endpoints                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Job Poller (Background Task)           │
│  - Polls PostgreSQL every 5s            │
│  - Gets next job with row locking       │
│  - Processes job                        │
└────────────┬────────────────────────────┘
             │
             ├─► OCR Worker (PaddleOCR)
             │   - Downloads file from Supabase
             │   - Extracts text (Spanish/English)
             │   - ~5-10s per page
             │
             ├─► Embeddings Worker (sentence-transformers)
             │   - Splits text into chunks
             │   - Generates 384d vectors
             │   - ~2-3s per document
             │
             └─► Database Writer
                 - Saves OCR text
                 - Saves embeddings
                 - Updates queue status
                 - Sends webhook (optional)
```

## Requirements

### VPS Specs
- **RAM:** 8GB minimum (service uses ~2.5GB)
- **CPU:** 2 vCPU minimum
- **Storage:** 20GB (for models + temp files)
- **OS:** Ubuntu 22.04 LTS recommended

### Software
- Python 3.10+
- PostgreSQL access (Supabase connection)
- Internet connection (to download files)

## Quick Start

### 1. Clone Repository (on VPS)

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Clone the Kairo repository
git clone https://github.com/your-username/kairo.git
cd kairo/vps-ocr-service
```

### 2. Run Setup Script

```bash
# Run as root (installs system packages)
sudo bash setup.sh
```

This script will:
- Install system dependencies (Python, poppler-utils, etc.)
- Create service user (`ocruser`)
- Set up Python virtual environment
- Install Python packages (~5-10 minutes)
- Create systemd service
- Set up directories and permissions

### 3. Configure Environment

```bash
# Edit configuration file
sudo nano /opt/kairo/vps-ocr-service/.env
```

**Required settings:**

```bash
# VPS Instance ID (unique identifier)
VPS_INSTANCE_ID=vps-01

# PostgreSQL Connection (use Supabase connection pooler)
DATABASE_URL=postgresql://postgres.xxxxx:password@xxxxx.pooler.supabase.com:6543/postgres

# Webhook (optional - for notifying Kairo)
KAIRO_WEBHOOK_URL=https://your-kairo-domain.vercel.app/api/webhooks/ocr
WEBHOOK_SECRET=your-secret-here
WEBHOOK_ENABLED=false  # Set to true when ready
```

**Where to get DATABASE_URL:**
1. Go to Supabase Dashboard → Settings → Database
2. Copy "Connection Pooling" string (NOT "Connection String")
3. Use Transaction mode (port 6543)

### 4. Start Service

```bash
# Start the service
sudo systemctl start ocr-service

# Enable auto-start on boot
sudo systemctl enable ocr-service

# Check status
sudo systemctl status ocr-service
```

### 5. Verify It's Working

```bash
# Check health
curl http://localhost:8000/health

# Should return:
# {
#   "status": "ok",
#   "models_loaded": true,
#   "queue_size": 0,
#   "vps_instance_id": "vps-01",
#   "version": "1.0.0"
# }

# Check queue stats
curl http://localhost:8000/api/queue/stats

# View logs
sudo journalctl -u ocr-service -f
```

## Directory Structure

```
vps-ocr-service/
├── app/
│   ├── __init__.py           # Package initialization
│   ├── config.py             # Configuration management
│   ├── database.py           # PostgreSQL operations
│   ├── embeddings_worker.py  # Embeddings generation
│   ├── job_poller.py         # Background job processor
│   ├── main.py               # FastAPI application
│   ├── models.py             # Pydantic models
│   ├── ocr_worker.py         # OCR processing
│   └── webhook.py            # Webhook notifications
├── temp/                     # Temporary file storage
├── logs/                     # Log files
├── .env.example              # Configuration template
├── .env                      # Your configuration (created by setup)
├── requirements.txt          # Python dependencies
├── setup.sh                  # Installation script
├── ocr-service.service       # Systemd service file
└── README.md                 # This file
```

## Configuration Reference

All settings in `.env`:

### Instance
```bash
VPS_INSTANCE_ID=vps-01  # Unique ID for this VPS
```

### Database
```bash
DATABASE_URL=postgresql://user:pass@host:6543/postgres
```

### OCR Settings
```bash
OCR_LANGUAGE=es,en       # Comma-separated language codes
OCR_USE_GPU=false        # true if GPU available
OCR_BATCH_SIZE=1         # Parallel processing (1 for 2vCPU)
MAX_FILE_SIZE_MB=50      # Max file size to process
```

### Embeddings Settings
```bash
EMBEDDINGS_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDINGS_DEVICE=cpu    # or "cuda" for GPU
EMBEDDINGS_CHUNK_SIZE=500
EMBEDDINGS_CHUNK_OVERLAP=50
EMBEDDINGS_BATCH_SIZE=8
```

### Queue Settings
```bash
POLL_INTERVAL_SECONDS=5  # How often to check for jobs
MAX_RETRIES=3           # Max retry attempts
JOB_TIMEOUT_MINUTES=15  # Timeout for long jobs
```

### Webhook Settings
```bash
KAIRO_WEBHOOK_URL=https://your-domain.com/api/webhooks/ocr
WEBHOOK_SECRET=your-secret
WEBHOOK_ENABLED=false   # Enable when ready
```

### Logging
```bash
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR
LOG_FILE=/var/log/ocr-service/app.log
LOG_ROTATION=100 MB
LOG_RETENTION=10 days
```

## Usage

### Processing Flow

1. **Upload Document** (in Kairo)
   - User uploads PDF/image to Kairo
   - Document record created in database
   - Auto-queued in `ocr_queue` table (status: queued)

2. **Job Pickup** (VPS)
   - VPS polls database every 5 seconds
   - Gets next job with `get_next_ocr_job()` function
   - Status updated to "processing"

3. **OCR Processing** (VPS)
   - Downloads file from Supabase Storage
   - Runs PaddleOCR (Spanish/English)
   - Extracts text (~5-10s per page)

4. **Embeddings Generation** (VPS)
   - Splits text into chunks (500 chars each)
   - Generates 384d vectors
   - ~2-3 seconds per document

5. **Save Results** (VPS)
   - Updates `documents.ocr_text`
   - Inserts into `document_embeddings`
   - Updates queue status to "completed"

6. **Webhook Notification** (Optional)
   - Sends POST to Kairo webhook
   - Triggers AI metadata extraction
   - Document ready for semantic search!

### API Endpoints

**Health Check**
```bash
GET http://localhost:8000/health
```

**Queue Statistics**
```bash
GET http://localhost:8000/api/queue/stats
```

**Test OCR**
```bash
GET http://localhost:8000/api/test/ocr
```

**Test Embeddings**
```bash
GET http://localhost:8000/api/test/embeddings
```

## Monitoring

### Service Status

```bash
# Check if running
sudo systemctl status ocr-service

# View logs (live)
sudo journalctl -u ocr-service -f

# View recent logs
sudo journalctl -u ocr-service -n 100

# Restart service
sudo systemctl restart ocr-service
```

### Queue Monitoring

```bash
# Check queue from PostgreSQL
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM ocr_queue GROUP BY status;"

# Check for failed jobs
psql $DATABASE_URL -c "SELECT * FROM ocr_queue WHERE status = 'failed' LIMIT 10;"
```

### Performance Metrics

```bash
# CPU and memory usage
top -p $(pgrep -f "uvicorn app.main:app")

# Disk space
df -h /tmp/ocr-service

# Service logs size
du -sh /var/log/ocr-service
```

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
sudo journalctl -u ocr-service -n 50
```

**Common issues:**
- Database connection failed → Check DATABASE_URL
- Models not downloading → Check internet connection
- Permission errors → Check file ownership (`chown ocruser:ocruser`)
- Port 8000 in use → Change port in systemd service

### OCR Not Processing Jobs

**Check queue:**
```bash
curl http://localhost:8000/api/queue/stats
```

**Check database connection:**
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

**Check logs for errors:**
```bash
sudo journalctl -u ocr-service -f | grep ERROR
```

### Out of Memory

If service crashes with OOM:

```bash
# Check memory usage
free -h

# Reduce batch size in .env
EMBEDDINGS_BATCH_SIZE=4  # Instead of 8
OCR_BATCH_SIZE=1

# Restart service
sudo systemctl restart ocr-service
```

### Slow Processing

**Check CPU usage:**
```bash
htop
```

**Reduce image DPI (in ocr_worker.py):**
```python
images = convert_from_path(pdf_path, dpi=150)  # Instead of 200
```

### Clean Up Temp Files

```bash
# Manual cleanup
sudo rm -rf /tmp/ocr-service/*

# Enable auto-cleanup in .env
CLEANUP_TEMP_FILES=true
TEMP_FILE_MAX_AGE_HOURS=24
```

## Scaling

### Adding More VPS Instances

To scale horizontally:

1. **Set up new VPS** with same setup script
2. **Use different instance ID:**
   ```bash
   VPS_INSTANCE_ID=vps-02  # Different from vps-01
   ```
3. **Use same DATABASE_URL** (same Supabase)
4. **Start service** - Jobs automatically distributed!

Queue uses row-level locking, so multiple VPS instances can safely poll the same queue.

### Monitoring Multiple Instances

```sql
-- Check which instances are active
SELECT vps_instance_id, COUNT(*) as jobs, MAX(started_at) as last_active
FROM ocr_queue
WHERE status = 'processing'
GROUP BY vps_instance_id;
```

## Maintenance

### Update Service

```bash
# Pull latest code
cd /home/your-user/kairo
git pull origin main

# Copy to service directory
sudo -u ocruser cp -r vps-ocr-service/* /opt/kairo/vps-ocr-service/

# Update dependencies
sudo -u ocruser /opt/kairo/vps-ocr-service/venv/bin/pip install -r /opt/kairo/vps-ocr-service/requirements.txt

# Restart service
sudo systemctl restart ocr-service
```

### Backup

**Important files to backup:**
- `/opt/kairo/vps-ocr-service/.env` - Configuration
- `/var/log/ocr-service/` - Logs (optional)

Database is in Supabase (already backed up).

## Performance

### Expected Metrics

| Operation | Time | RAM Usage |
|-----------|------|-----------|
| OCR per page | 5-10s | ~500MB |
| Embeddings | 2-3s | ~800MB |
| Total per doc | 30-60s | ~2.5GB peak |

### Capacity

- **1 VPS (2vCPU):** ~50-100 docs/day
- **2 VPS:** ~100-200 docs/day
- **5 VPS:** ~500+ docs/day

### Cost

- **VPS:** $5-10/month
- **Models:** Free (open source)
- **Processing:** $0 per document

**Total: ~$0.10 per 1000 docs** (vs $3+ for cloud services)

## Security

- ✅ Service runs as non-root user (`ocruser`)
- ✅ Environment file permissions: 600
- ✅ Database connection encrypted (SSL)
- ✅ Webhook secret validation
- ✅ Temp files auto-cleaned
- ✅ Resource limits in systemd

## Support

### Logs Location
- Service logs: `sudo journalctl -u ocr-service`
- Application logs: `/var/log/ocr-service/app.log`

### Common Commands
```bash
# Start service
sudo systemctl start ocr-service

# Stop service
sudo systemctl stop ocr-service

# Restart service
sudo systemctl restart ocr-service

# View logs
sudo journalctl -u ocr-service -f

# Check health
curl http://localhost:8000/health
```

## License

Same as Kairo project.

---

**Questions?** Check the main project documentation at `/docs/architecture/vps-ocr-service.md`
