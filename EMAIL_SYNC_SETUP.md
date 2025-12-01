# Email Sync Setup Guide

This document explains how to set up the server-side email sync system for Kairo.

## Overview

The email sync system uses a **staggered polling approach** to efficiently sync email accounts:

- Processes 5-10 accounts per minute (configurable)
- Each account is synced every 15 minutes
- Spreads load evenly across time
- Predictable resource usage

## Architecture

```
System Cron (every 1 minute)
    ↓
POST /api/cron/sync-emails
    ↓
EmailSyncQueueService.processBatch()
    ↓
Sync 5 accounts concurrently
    ↓
Update database + IMAP flags
```

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` or `.env.local`:

```bash
# Required: Secret token for cron authentication
CRON_SECRET=your-random-secret-token-here

# Optional: Number of accounts to sync per batch (default: 5)
EMAIL_SYNC_BATCH_SIZE=5

# Required: Encryption key for email passwords (32+ characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Generate secure tokens:**

```bash
# Generate CRON_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

### 2. System Cron Setup

Create a cron job that calls the sync endpoint every minute.

#### Option A: crontab (Linux/Mac)

1. Open crontab editor:

```bash
crontab -e
```

2. Add this line (replace with your actual URL and secret):

```cron
* * * * * curl -X POST http://localhost:3000/api/cron/sync-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  >> /var/log/kairo-email-sync.log 2>&1
```

For production (HTTPS):

```cron
* * * * * curl -X POST https://yourdomain.com/api/cron/sync-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  >> /var/log/kairo-email-sync.log 2>&1
```

#### Option B: systemd timer (Linux, recommended for VPS)

1. Create service file `/etc/systemd/system/kairo-email-sync.service`:

```ini
[Unit]
Description=Kairo Email Sync
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST http://localhost:3000/api/cron/sync-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

2. Create timer file `/etc/systemd/system/kairo-email-sync.timer`:

```ini
[Unit]
Description=Run Kairo Email Sync every minute
Requires=kairo-email-sync.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
AccuracySec=1s

[Install]
WantedBy=timers.target
```

3. Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kairo-email-sync.timer
sudo systemctl start kairo-email-sync.timer
```

4. Check status:

```bash
sudo systemctl status kairo-email-sync.timer
journalctl -u kairo-email-sync.service -f
```

## Monitoring

### Check Queue Status

```bash
curl -X GET http://localhost:3000/api/cron/sync-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response:

```json
{
  "success": true,
  "timestamp": "2025-12-01T10:30:00.000Z",
  "totalAccounts": 50,
  "pendingSync": 12,
  "errorAccounts": 2,
  "syncInterval": 15
}
```

### Manual Trigger

Force an immediate sync:

```bash
curl -X POST http://localhost:3000/api/cron/sync-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Custom Batch Size

Override default batch size:

```bash
curl -X POST "http://localhost:3000/api/cron/sync-emails?batchSize=10" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Performance Tuning

### For 2vCPU / 8GB RAM VPS

| Customers | Accounts | Batch Size | CPU Usage | Notes |
|-----------|----------|------------|-----------|-------|
| 10-30     | 10-30    | 5          | ~5%       | Default, safe |
| 30-50     | 30-50    | 5-7        | ~8%       | Recommended |
| 50-100    | 50-100   | 8-10       | ~12%      | Monitor closely |
| 100+      | 100+     | 10-15      | ~15-20%   | Consider scaling |

**Calculation:**

- Each account takes ~2-5 seconds to sync
- Batch of 5 = ~10-25 seconds total per minute
- 100 accounts = checked every 10-20 minutes

### Adjust Sync Interval

Edit `/apps/web/src/server/services/email-sync-queue.service.ts`:

```typescript
private static readonly SYNC_INTERVAL_MINUTES = 15; // Change this
```

Options:

- **5 minutes**: More frequent, higher load
- **15 minutes**: Balanced (recommended)
- **30 minutes**: Lower load, delayed emails

## Troubleshooting

### No accounts are syncing

1. Check cron is running:

```bash
# For crontab
tail -f /var/log/kairo-email-sync.log

# For systemd
journalctl -u kairo-email-sync.service -f
```

2. Verify CRON_SECRET matches:

```bash
echo $CRON_SECRET
```

3. Check endpoint manually:

```bash
curl -v -X POST http://localhost:3000/api/cron/sync-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Sync failing for specific accounts

Check account sync status in database:

```sql
SELECT
  email_address,
  sync_status,
  error_message,
  last_synced_at
FROM kairo_email_accounts
WHERE sync_status = 'error';
```

### High CPU usage

1. Reduce `EMAIL_SYNC_BATCH_SIZE` to 3-5
2. Increase `SYNC_INTERVAL_MINUTES` to 20-30
3. Check IMAP server response times
4. Consider implementing IMAP IDLE (Phase 2)

## Security Notes

- **CRON_SECRET**: Keep secret, rotate periodically
- **ENCRYPTION_KEY**: Never commit to git, backup securely
- **HTTPS**: Use HTTPS in production for cron calls
- **Firewall**: Restrict /api/cron/* to localhost if possible

## Next Steps

This setup provides:

- ✅ Staggered server-side syncing
- ✅ Predictable resource usage
- ✅ Read/unread sync with IMAP
- ✅ Manual sync button for immediate needs

**Future enhancements:**

- Implement IMAP IDLE for real-time push
- Add email deletion sync
- Support for multiple folders (Sent, Drafts, etc.)
- WebSocket notifications to clients when new emails arrive
