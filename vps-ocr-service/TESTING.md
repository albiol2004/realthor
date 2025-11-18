# VPS OCR Service - Testing Guide

> **Quick testing guide to verify everything works before going live**

## Prerequisites

- VPS with 8GB RAM / 2vCPU
- Ubuntu 22.04 LTS
- Root/sudo access
- Supabase database credentials

## Step-by-Step Testing

### 1. Install on VPS

```bash
# SSH into VPS
ssh user@your-vps-ip

# Clone repository
git clone https://github.com/your-username/kairo.git
cd kairo/vps-ocr-service

# Run setup (as root)
sudo bash setup.sh
```

**Expected output:**
```
✅ Setup Complete!
```

### 2. Configure Environment

```bash
# Edit configuration
sudo nano /opt/kairo/vps-ocr-service/.env
```

**Minimum required:**
```bash
VPS_INSTANCE_ID=vps-01
DATABASE_URL=postgresql://postgres:pass@host:6543/postgres
```

### 3. Test Database Connection

```bash
# Test connection (replace with your DATABASE_URL)
psql "postgresql://postgres:pass@host:6543/postgres" -c "SELECT 1;"
```

**Expected output:**
```
 ?column?
----------
        1
(1 row)
```

If this fails, check:
- Supabase is using **connection pooler** URL (port 6543, not 5432)
- Password is correct
- Firewall allows outbound connections

### 4. Start Service

```bash
# Start the service
sudo systemctl start ocr-service

# Check status
sudo systemctl status ocr-service
```

**Expected output:**
```
● ocr-service.service - Kairo VPS OCR Service
   Active: active (running)
```

### 5. Check Health Endpoint

```bash
curl http://localhost:8000/health
```

**Expected output:**
```json
{
  "status": "ok",
  "models_loaded": true,
  "queue_size": 0,
  "vps_instance_id": "vps-01",
  "version": "1.0.0"
}
```

### 6. Check Logs

```bash
# View service logs
sudo journalctl -u ocr-service -n 50
```

**Expected output (should see):**
```
✅ Database connection pool created
✅ PaddleOCR models loaded
✅ Embeddings model loaded
✅ Job poller started
✅ OCR Service is ready to process documents!
```

### 7. Test Queue Polling

The service should be polling the queue. Check logs:

```bash
# Watch logs in real-time
sudo journalctl -u ocr-service -f
```

You should NOT see errors. If queue is empty, you'll see periodic polls.

### 8. Test with Real Document

#### Option A: Upload via Kairo UI (when UI is ready)

1. Go to Kairo web app
2. Upload a document
3. Watch VPS logs: `sudo journalctl -u ocr-service -f`
4. Should see: "Processing job: [document-id]"

#### Option B: Manual Database Test

```bash
# Connect to database
psql "$DATABASE_URL"
```

```sql
-- Check if documents table exists
SELECT COUNT(*) FROM documents;

-- Check if ocr_queue table exists
SELECT COUNT(*) FROM ocr_queue;

-- Check queue status
SELECT status, COUNT(*) FROM ocr_queue GROUP BY status;
```

### 9. Check Queue Stats Endpoint

```bash
curl http://localhost:8000/api/queue/stats
```

**Expected output:**
```json
{
  "queued": 0,
  "processing": 0,
  "completed_today": 0,
  "failed": 0
}
```

### 10. Test OCR Models

```bash
curl http://localhost:8000/api/test/ocr
```

**Expected output:**
```json
{
  "ocr_loaded": true,
  "language": "es,en",
  "gpu_enabled": false,
  "model_info": "PaddleOCR"
}
```

### 11. Test Embeddings Models

```bash
curl http://localhost:8000/api/test/embeddings
```

**Expected output:**
```json
{
  "embeddings_loaded": true,
  "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  "device": "cpu",
  "dimensions": 384
}
```

## Common Issues & Solutions

### Issue: Service won't start

**Check:**
```bash
sudo systemctl status ocr-service
sudo journalctl -u ocr-service -n 100
```

**Common causes:**
- Database URL incorrect
- Python dependencies not installed
- Permission issues

**Solution:**
```bash
# Re-run setup
cd /home/your-user/kairo/vps-ocr-service
sudo bash setup.sh

# Check .env file
sudo cat /opt/kairo/vps-ocr-service/.env
```

### Issue: Models not loading

**Symptom:** Logs show "Failed to load models"

**Solution:**
Models are downloaded on first run (~700MB total). Ensure:
- Internet connection works
- Enough disk space (df -h)
- Wait 5-10 minutes for download

### Issue: Database connection timeout

**Symptom:** "Failed to connect to database"

**Check:**
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

**Solution:**
- Use **connection pooler** URL (port 6543)
- Check Supabase firewall settings
- Verify VPS has internet access

### Issue: Out of memory

**Symptom:** Service crashes, OOM in logs

**Solution:**
```bash
# Check memory
free -h

# If < 2GB available, reduce batch sizes in .env
nano /opt/kairo/vps-ocr-service/.env

# Set:
EMBEDDINGS_BATCH_SIZE=4
OCR_BATCH_SIZE=1

# Restart
sudo systemctl restart ocr-service
```

## Performance Checks

### Memory Usage

```bash
# Check while idle
ps aux | grep uvicorn

# Should be ~500MB idle, ~2.5GB peak during processing
```

### CPU Usage

```bash
# Monitor CPU
htop

# Should be low (~5%) when idle, spikes to 80-100% during OCR
```

### Disk Space

```bash
# Check disk
df -h

# Check temp directory
du -sh /tmp/ocr-service
```

## Verification Checklist

Before considering it "production ready":

- [ ] Service starts without errors
- [ ] Health endpoint returns 200
- [ ] Models loaded successfully (PaddleOCR + embeddings)
- [ ] Database connection works
- [ ] Job poller is running (check logs)
- [ ] Queue stats endpoint works
- [ ] Service survives restart (`sudo systemctl restart ocr-service`)
- [ ] Logs are readable (`sudo journalctl -u ocr-service`)
- [ ] Memory usage < 3GB
- [ ] CPU usage reasonable (<50% average)
- [ ] Auto-starts on boot (`sudo systemctl enable ocr-service`)

## Next Steps

Once all checks pass:

1. **Enable webhook** (optional):
   ```bash
   sudo nano /opt/kairo/vps-ocr-service/.env
   # Set WEBHOOK_ENABLED=true
   sudo systemctl restart ocr-service
   ```

2. **Monitor for 24 hours**:
   ```bash
   # Check periodically
   curl http://localhost:8000/health
   curl http://localhost:8000/api/queue/stats
   sudo journalctl -u ocr-service | grep ERROR
   ```

3. **Process first real document** from Kairo UI

4. **Check results** in database:
   ```sql
   SELECT id, filename, ocr_status,
          LENGTH(ocr_text) as text_length
   FROM documents
   WHERE ocr_status = 'completed'
   LIMIT 5;
   ```

## Success Criteria

You know it's working when:

✅ Service runs for 24+ hours without crashes
✅ Health endpoint always returns 200
✅ Documents process in 30-60 seconds
✅ OCR text is extracted correctly
✅ Embeddings are generated (384 dimensions)
✅ Queue stays empty (jobs processed immediately)
✅ No memory leaks (memory stable over time)
✅ Logs show no errors

## Support

If issues persist:

1. Share logs: `sudo journalctl -u ocr-service -n 200 > logs.txt`
2. Share config (remove passwords): `cat /opt/kairo/vps-ocr-service/.env | grep -v PASSWORD`
3. Share health check: `curl http://localhost:8000/health`
4. Share queue stats: `curl http://localhost:8000/api/queue/stats`

---

**Ready for production?** Proceed to document upload UI implementation in Kairo!
