# VPS Setup Documentation

**Last Updated:** 2025-11-19
**Status:** Production - OCR Service Running ✅

---

## Overview

This project uses a **dedicated VPS server** to handle computationally expensive OCR processing with PaddleOCR and semantic embeddings generation. This architecture keeps the main Kairo application lightweight and scalable.

**Why VPS?**
- PaddleOCR + sentence-transformers require ~2-3GB RAM and GPU/CPU intensive processing
- Separating OCR from web server allows independent scaling
- Cost-effective: Single VPS can process OCR for thousands of users
- Supabase database is shared between web app and VPS

---

## VPS Details

**Provider:** [Your VPS Provider]
**Location:** [VPS Location]
**Specs:**
- OS: Debian 12
- RAM: [RAM amount]
- CPU: [CPU specs]
- Storage: [Storage]

**Access:**
```bash
ssh root@[VPS_IP]
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kairo Web App (Vercel)                       │
│  - Next.js 14 App Router                                        │
│  - Document upload UI                                           │
│  - tRPC API                                                     │
└────────────────┬────────────────────────────┬───────────────────┘
                 │                            │
                 ▼                            ▼
┌────────────────────────────────┐  ┌─────────────────────────────┐
│    Supabase PostgreSQL         │  │   Supabase Storage          │
│  - Documents metadata          │  │  - PDF/Image files          │
│  - OCR queue (job table)       │  │  - Private bucket (RLS)     │
│  - OCR text + embeddings       │  │  - Signed URLs              │
│  - pgvector (384d)             │  └─────────────────────────────┘
└────────────┬───────────────────┘
             │ ▲
             │ │ (Polls queue + Saves results)
             ▼ │
┌─────────────────────────────────────────────────────────────────┐
│                    VPS OCR Service (Debian)                     │
│  - PaddleOCR 2.7.3 (text extraction)                            │
│  - PaddlePaddle 2.6.1 (OCR engine)                              │
│  - sentence-transformers (embeddings)                           │
│  - FastAPI (health checks, stats)                               │
│  - Job poller (background worker)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Deployment Process

### 1. Code Syncing with Syncthing

**Local → VPS Sync:**
- **Source:** `/home/blac3k/pruebas/Kairo/vps-ocr-service/` (local machine)
- **Destination:** `/root/Kairo/vps-ocr-service/` (VPS)
- **Method:** Syncthing (automatic, real-time)
- **Sync Time:** ~30 seconds

Syncthing keeps the code synchronized automatically. No manual file transfer needed!

### 2. Deployment to Production

After Syncthing syncs the code, you need to **manually deploy** to the production directory:

```bash
# SSH to VPS
ssh root@[VPS_IP]

# Copy updated code to production directory
cp -r /root/Kairo/vps-ocr-service/* /opt/kairo/vps-ocr-service/

# If service file changed, update it
cp /root/Kairo/vps-ocr-service/ocr-service.service /etc/systemd/system/
systemctl daemon-reload

# Restart the service
systemctl restart ocr-service

# Check status
systemctl status ocr-service

# Watch logs in real-time
journalctl -u ocr-service -f
```

**Why the manual copy?**
- `/root/Kairo/` is the sync directory (owned by root)
- `/opt/kairo/` is the production directory (owned by `ocruser`)
- This separation prevents accidental production changes from Syncthing

### 3. Quick Deployment Script

Save this as `/root/deploy-ocr.sh` for faster deployments:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying OCR service..."

# Copy code
cp -r /root/Kairo/vps-ocr-service/* /opt/kairo/vps-ocr-service/

# Copy service file if changed
if [ -f "/root/Kairo/vps-ocr-service/ocr-service.service" ]; then
    cp /root/Kairo/vps-ocr-service/ocr-service.service /etc/systemd/system/
    systemctl daemon-reload
fi

# Restart service
systemctl restart ocr-service

echo "✅ Deployment complete!"
echo "📊 Service status:"
systemctl status ocr-service --no-pager

echo ""
echo "📝 View logs with: journalctl -u ocr-service -f"
```

Then:
```bash
chmod +x /root/deploy-ocr.sh
/root/deploy-ocr.sh
```

---

## Service Management

### Start/Stop/Restart

```bash
# Start service
systemctl start ocr-service

# Stop service
systemctl stop ocr-service

# Restart service (after code changes)
systemctl restart ocr-service

# Check status
systemctl status ocr-service

# Enable auto-start on boot
systemctl enable ocr-service
```

### View Logs

```bash
# Real-time logs (follow mode)
journalctl -u ocr-service -f

# Last 100 lines
journalctl -u ocr-service -n 100

# Logs from last hour
journalctl -u ocr-service --since "1 hour ago"

# Logs with specific priority (errors only)
journalctl -u ocr-service -p err

# Export logs to file
journalctl -u ocr-service --since today > ocr-service.log
```

### Check Service Health

```bash
# HTTP health check
curl http://localhost:8000/health

# Queue statistics
curl http://localhost:8000/stats

# Test from outside VPS
curl http://[VPS_IP]:8000/health
```

---

## Configuration

### Environment Variables

Located at: `/opt/kairo/vps-ocr-service/.env`

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres

# VPS Instance ID (for multi-VPS deployments)
VPS_INSTANCE_ID=vps-001

# Polling interval (seconds)
POLL_INTERVAL_SECONDS=5

# Worker threads (CPU cores to use)
WORKER_THREADS=2

# Temp directory
TEMP_DIR=/tmp/ocr-service

# Webhook (optional - for notifications back to Kairo)
WEBHOOK_URL=https://your-app.com/api/webhooks/ocr
WEBHOOK_SECRET=your-secret-key
WEBHOOK_ENABLED=false
```

**Important Notes:**
- Use **port 6543** for Supabase (pgbouncer transaction pooling)
- `statement_cache_size=0` required in code for pgbouncer compatibility
- Never commit `.env` to git (use `.env.example` instead)

---

## Database Considerations

### Supabase + pgbouncer

Supabase uses **pgbouncer** for connection pooling, which requires special handling:

**Connection String Format:**
```
postgresql://postgres:PASSWORD@HOST:6543/postgres?pgbouncer=true
```

**Code Requirements:**
```python
# asyncpg connection pool MUST disable statement caching
pool = await asyncpg.create_pool(
    database_url,
    statement_cache_size=0,  # CRITICAL for pgbouncer!
)
```

**Why?** pgbouncer's transaction pooling doesn't support prepared statements.

### Vector Dimensions

- **Model:** `paraphrase-multilingual-MiniLM-L12-v2`
- **Dimensions:** 384
- **Database column:** `embedding vector(384)`

If you ever see "expected 1536 dimensions" errors, the database schema doesn't match. Run:
```sql
ALTER TABLE document_embeddings DROP COLUMN embedding;
ALTER TABLE document_embeddings ADD COLUMN embedding vector(384);
```

---

## Troubleshooting

### Issue: Service won't start

**Check logs:**
```bash
journalctl -u ocr-service -n 50
```

**Common causes:**
- Missing `.env` file → Copy from `.env.example`
- Wrong DATABASE_URL → Check Supabase connection string
- Permission issues → Ensure `/opt/kairo/vps-ocr-service` owned by `ocruser`

### Issue: "poppler not found" error

```bash
apt-get update
apt-get install -y poppler-utils
systemctl restart ocr-service
```

### Issue: "prepared statement already exists"

**Cause:** `statement_cache_size` not set to 0

**Fix:** Update `app/database.py`:
```python
cls._pool = await asyncpg.create_pool(
    settings.database_url,
    statement_cache_size=0,  # Add this line
)
```

### Issue: "expected 1536 dimensions, not 384"

**Cause:** Database schema has wrong vector dimensions

**Fix:** See "Vector Dimensions" section above

### Issue: Jobs stay in "queued" status

**Check:**
1. Is service running? `systemctl status ocr-service`
2. Can service connect to database? Check logs
3. Is polling enabled? Check `POLL_INTERVAL_SECONDS` in `.env`

### Issue: High CPU/Memory usage

**Check current usage:**
```bash
htop  # or top
```

**Tune worker threads:**
- Edit `/opt/kairo/vps-ocr-service/.env`
- Set `WORKER_THREADS=1` (reduce from 2)
- Restart service

---

## Performance & Monitoring

### Expected Performance

- **OCR Speed:** ~2-3 seconds per page
- **Embeddings:** ~1 second for 10 chunks
- **Total time:** 3-page PDF ≈ 8-10 seconds

### Resource Usage

- **Idle:** ~200MB RAM
- **Processing:** ~800MB-1.5GB RAM (per job)
- **CPU:** Spikes to 100% during OCR, then idles

### Monitoring Commands

```bash
# Check memory
free -h

# Check disk space
df -h

# Check CPU load
uptime

# Watch resources in real-time
htop

# Check systemd service limits
systemctl show ocr-service | grep -i limit
```

---

## Scaling & Future Improvements

### Multi-VPS Setup

The queue system supports multiple VPS instances:

1. Deploy service to multiple VPS servers
2. Give each a unique `VPS_INSTANCE_ID` in `.env`
3. All point to same Supabase database
4. Row-level locking prevents duplicate processing

**Example:**
- VPS 1: `VPS_INSTANCE_ID=vps-eu-001`
- VPS 2: `VPS_INSTANCE_ID=vps-us-001`

### GPU Acceleration (Future)

PaddleOCR supports GPU acceleration:

1. Get VPS with NVIDIA GPU
2. Install CUDA toolkit
3. Install `paddlepaddle-gpu` instead of CPU version
4. 5-10x speed improvement

### Alternative: Serverless OCR

Consider migrating to:
- AWS Lambda with EFS for models
- Google Cloud Run with custom containers
- Modal.com (serverless GPU)

**Pros:** Auto-scaling, pay-per-use
**Cons:** Cold starts, more complex setup

---

## Security Checklist

- [x] SSH key-only access (disable password auth)
- [x] UFW firewall enabled (allow only 22, 8000)
- [x] Service runs as non-root user (`ocruser`)
- [x] Supabase Storage uses RLS policies (private files)
- [x] Database credentials in `.env` (not in code)
- [ ] Set up fail2ban (recommended)
- [ ] Enable automatic security updates (recommended)

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy code | `cp -r /root/Kairo/vps-ocr-service/* /opt/kairo/vps-ocr-service/ && systemctl restart ocr-service` |
| View logs | `journalctl -u ocr-service -f` |
| Check status | `systemctl status ocr-service` |
| Edit config | `nano /opt/kairo/vps-ocr-service/.env` |
| Restart | `systemctl restart ocr-service` |
| Health check | `curl http://localhost:8000/health` |
| Queue stats | `curl http://localhost:8000/stats` |

---

## Support & Contact

**Documentation:** See `vps-ocr-service/README.md` for technical details
**Testing Guide:** See `vps-ocr-service/TESTING.md` for testing procedures
**Issues:** Check logs first, then troubleshooting section above

---

**Note to Future AI Assistants:**

This VPS setup uses **Syncthing for code sync** and **manual deployment** to production. Always remember:
1. Code changes sync automatically via Syncthing
2. Deployment requires manual `cp` command to `/opt/kairo/`
3. Supabase uses pgbouncer - requires `statement_cache_size=0`
4. Vector embeddings are 384 dimensions (sentence-transformers MiniLM)
5. Service runs as `ocruser`, not root
