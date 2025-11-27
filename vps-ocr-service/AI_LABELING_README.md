# AI Labeling System - Implementation Guide

**Version:** 1.0
**Last Updated:** 2025-11-27
**Status:** ✅ VPS Service Complete | ⏳ Backend Integration Pending

---

## Overview

The AI Labeling system automatically extracts structured metadata from documents using Deepseek API. It runs as part of the VPS OCR service and processes documents after OCR completion.

### Key Features

✅ **Automatic Labeling**: Triggers after OCR completes
✅ **Manual Labeling**: Users can re-label documents on demand
✅ **Spanish Real Estate Focus**: Trained on Spanish real estate compliance documents
✅ **Cost-Efficient**: OCR text truncation + Deepseek's low pricing
✅ **Scalable**: Queue-based architecture supports multiple VPS instances

---

## Architecture

```
Document Upload (Web App)
   ↓
OCR Queue (Supabase)
   ↓
VPS OCR Service (PaddleOCR)
   ↓
AI Labeling Queue (Supabase) ← Triggers automatically
   ↓
VPS AI Labeling Service (Deepseek API)
   ↓
Document Metadata Saved (Supabase)
   ↓
[Future] Contact/Property Matching
```

---

## VPS Service Components

### Files Created

1. **`app/document_categories.py`** - Document classification system
   - 40+ Spanish real estate document types
   - Importance scoring (1-10)
   - System prompt for Deepseek AI

2. **`app/ai_labeling_worker.py`** - Deepseek API integration
   - OCR text truncation (first 4000 + last 2000 chars)
   - Structured JSON output
   - Confidence scoring

3. **`app/ai_labeling_poller.py`** - Job polling service
   - Polls `ai_labeling_queue` table
   - Processes jobs with row-level locking
   - Error handling and retry logic

4. **Database methods in `app/database.py`**:
   - `get_next_ai_labeling_job()` - Fetch pending jobs
   - `save_ai_labeling_result()` - Update document metadata
   - `create_ai_labeling_job()` - Queue new jobs
   - `update_ai_labeling_job_status()` - Track job status

5. **Config updates in `app/config.py`**:
   - `DEEPSEEK_API_KEY` - Deepseek API key
   - `AI_LABELING_ENABLED` - Feature flag

### Integration with OCR Service

In `app/job_poller.py`, after OCR completes:
```python
# Automatically trigger AI labeling
await Database.create_ai_labeling_job(
    document_id=job.document_id,
    user_id=user_id,
    trigger_type="auto"
)
```

---

## Database Schema

### `ai_labeling_queue` Table

```sql
CREATE TABLE ai_labeling_queue (
  id uuid PRIMARY KEY,
  document_id uuid REFERENCES documents(id),
  user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending',  -- pending, processing, completed, failed
  trigger_type text,  -- 'auto' or 'manual'
  retry_count integer DEFAULT 0,
  error_message text,
  processing_started_at timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

### Document Fields Updated

The AI labeling service updates these fields in the `documents` table:

| Field | Type | Description |
|-------|------|-------------|
| `category` | text | Document type (e.g., "DNI", "Property Title Deed") |
| `extracted_names` | text[] | Person names found in document |
| `document_date` | date | Primary document date |
| `due_date` | date | Expiration/deadline date |
| `description` | text | AI-generated summary (1-2 sentences) |
| `has_signature` | boolean | Whether document appears signed |
| `importance_score` | integer | Urgency score (1-10) |
| `ai_metadata` | jsonb | Full AI response + confidence scores |
| `ai_confidence` | numeric(3,2) | Average confidence (0.0-1.0) |
| `ai_processed_at` | timestamptz | When AI labeling completed |

**Important**: Only non-null fields are updated. Null values from AI are skipped.

---

## Deployment

### 1. Add Environment Variables

Edit `/opt/kairo/vps-ocr-service/.env`:

```bash
# AI Labeling Settings
DEEPSEEK_API_KEY=your-deepseek-api-key-here
AI_LABELING_ENABLED=true
```

Get your Deepseek API key from: https://platform.deepseek.com

### 2. Run Database Migration

```bash
# From your local machine (with Supabase CLI)
cd /path/to/Kairo
supabase db push

# Or manually run the migration
psql $DATABASE_URL < supabase/migrations/20251127_ai_labeling_queue.sql
```

### 3. Deploy to VPS

```bash
# SSH to VPS
ssh root@[VPS_IP]

# Syncthing will have synced the code automatically
# Copy to production directory
cp -r /root/Kairo/vps-ocr-service/* /opt/kairo/vps-ocr-service/

# Restart service
systemctl restart ocr-service

# Check logs
journalctl -u ocr-service -f
```

**Expected logs:**
```
🚀 Starting Kairo VPS OCR + AI Labeling Service v1.0.0
Instance ID: vps-001
AI Labeling Enabled: True
✅ AI Labeling Worker initialized (model: deepseek-chat)
✅ AI labeling poller started
```

### 4. Verify Service

```bash
# Health check
curl http://localhost:8000/

# Expected response:
{
  "service": "Kairo VPS OCR + AI Labeling Service",
  "version": "1.0.0",
  "status": "running",
  "features": {
    "ocr": true,
    "ai_labeling": true
  }
}
```

---

## How It Works

### Automatic Labeling Flow

1. **User uploads document** → Document queued for OCR
2. **OCR service processes** → Extracts text with PaddleOCR
3. **OCR completes** → Automatically creates AI labeling job
4. **AI labeling poller picks up job**:
   - Truncates OCR text (first 4000 + last 2000 chars)
   - Sends to Deepseek API with system prompt
   - Receives structured JSON response
5. **Metadata saved to database**:
   - `category`, `extracted_names`, `description`, etc.
   - Only non-null fields are updated
6. **[Future] Contact/property matching**:
   - Match `extracted_names` → `contacts` table
   - Match extracted addresses → `properties` table
   - Update `related_contact_ids` and `related_property_ids`

### Manual Labeling Flow

1. **User clicks "Label with AI" button** (document detail page)
2. **Frontend calls tRPC endpoint**: `documents.labelWithAI`
3. **Backend creates AI labeling job** with `trigger_type='manual'`
4. **Same processing as automatic** (steps 4-6 above)
5. **Frontend shows success message**: "Document labeled successfully!"

---

## Document Categories

Based on Spanish real estate compliance requirements:

### Critical (Importance: 8-10)
- **Identification**: DNI, NIE, Passport, Power of Attorney
- **AML/KYC**: KYC Form, Proof of Funds
- **Deeds**: Property Title Deed, Nota Simple
- **Certificates**: Energy Certificate, Community Debt Certificate, Habitability Certificate
- **Tax**: IBI Receipt
- **Contracts**: Sales Listing Agreement, Seguro Decenal

### Recommended (Importance: 5-7)
- Certificate of No Urban Infraction
- Earnest Money Contract
- Technical Building Inspection
- Electrical Bulletin
- Plusvalía Municipal

### Advised (Importance: 2-4)
- Community Meeting Minutes
- Floor Plans, Cadastral Plans
- Utility Bills
- Home Insurance
- Photos

---

## Cost Estimation

### Deepseek API Pricing (as of 2025-11)
- **Input**: $0.27 per 1M tokens
- **Output**: $1.10 per 1M tokens

### Per Document Cost
- **OCR text**: ~2000 tokens (truncated)
- **System prompt**: ~800 tokens
- **AI response**: ~200 tokens
- **Total cost**: **~$0.001 per document** (0.1¢)

### Monthly Costs
- **100 documents/month**: $0.10
- **1,000 documents/month**: $1.00
- **10,000 documents/month**: $10.00

**Conclusion**: Extremely cost-effective! 🎉

---

## Monitoring & Debugging

### Check Queue Status

```bash
# From VPS
psql $DATABASE_URL

# Check pending jobs
SELECT COUNT(*) FROM ai_labeling_queue WHERE status = 'pending';

# Check recent completed jobs
SELECT document_id, status, completed_at
FROM ai_labeling_queue
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;

# Check failures
SELECT document_id, error_message, created_at
FROM ai_labeling_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### View Service Logs

```bash
# Real-time logs
journalctl -u ocr-service -f

# Search for AI labeling logs
journalctl -u ocr-service | grep "AI labeling"

# Last hour
journalctl -u ocr-service --since "1 hour ago"
```

### Test AI Labeling Manually

```python
# On VPS (Python)
import asyncio
from app.ai_labeling_worker import AILabelingWorker
from app.config import settings

async def test():
    worker = AILabelingWorker()

    sample_text = """
    DOCUMENTO NACIONAL DE IDENTIDAD

    Nombre: Juan García López
    DNI: 12345678A
    Fecha de Nacimiento: 15/03/1985
    Dirección: Calle Mayor 123, Madrid

    Firmado en Madrid, 10 de enero de 2024
    """

    result = await worker.label_document(sample_text, "test-doc-id")
    print(result)

asyncio.run(test())
```

---

## Troubleshooting

### Issue: "AI labeling disabled (missing DEEPSEEK_API_KEY)"

**Solution:**
1. Add `DEEPSEEK_API_KEY` to `/opt/kairo/vps-ocr-service/.env`
2. Restart service: `systemctl restart ocr-service`

### Issue: Jobs stay in "pending" status

**Checks:**
1. Is service running? `systemctl status ocr-service`
2. Is AI labeling enabled? Check logs for "AI labeling poller started"
3. Check errors: `journalctl -u ocr-service | grep ERROR`

### Issue: "AI labeling failed: 401 Unauthorized"

**Solution:** Invalid Deepseek API key
1. Verify key at https://platform.deepseek.com
2. Update `.env` file
3. Restart service

### Issue: High API costs

**Solutions:**
1. Check if OCR text truncation is working (should be ≤6000 chars)
2. Disable AI labeling for large documents: `AI_LABELING_ENABLED=false`
3. Review Deepseek usage dashboard

---

## TODO / Future Enhancements

### Phase 1 (Current)
- [x] VPS AI labeling service
- [x] Automatic labeling after OCR
- [x] Database schema and queue
- [ ] Backend tRPC endpoint for manual labeling
- [ ] Frontend "Label with AI" button
- [ ] Contact/property matching service

### Phase 2 (Future)
- [ ] Multi-language support (English, French, etc.)
- [ ] Custom document categories per user
- [ ] AI-powered suggestions for linking contacts/properties
- [ ] Confidence threshold filtering (e.g., only apply if confidence > 0.8)
- [ ] Human-in-the-loop corrections (learn from user edits)
- [ ] Batch re-labeling (re-label all documents when categories change)

---

## Support

**Documentation:**
- Main: `/home/blac3k/pruebas/Kairo/vps-ocr-service/README.md`
- VPS Setup: `/home/blac3k/pruebas/Kairo/VPS-SETUP.md`
- This file: `/home/blac3k/pruebas/Kairo/vps-ocr-service/AI_LABELING_README.md`

**Contact:**
- Check GitHub issues
- Review service logs first
- Test with sample documents

---

**Note to Future AI Assistants:**

This AI labeling system is designed to be:
1. **Cost-efficient**: OCR text truncation + cheap Deepseek API
2. **Scalable**: Queue-based, supports multiple VPS instances
3. **Safe**: Only non-null fields are updated (preserves manual edits)
4. **Flexible**: Easy to add new document categories or change AI models

Key integration points:
- **VPS**: AI labeling happens here (this codebase)
- **Backend**: tRPC endpoint for manual trigger (TODO)
- **Frontend**: "Label with AI" button (TODO)
- **Matching Service**: Link contacts/properties from extracted data (TODO)
