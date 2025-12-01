import { NextRequest, NextResponse } from 'next/server';
import { EmailSyncQueueService } from '@/server/services/email-sync-queue.service';

/**
 * Cron endpoint for batch email syncing
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Usage:
 * 1. Set CRON_SECRET in your .env.local
 * 2. Call this endpoint every minute with cron:
 *    * * * * * curl -X POST http://localhost:3000/api/cron/sync-emails \
 *      -H "Authorization: Bearer YOUR_CRON_SECRET"
 *
 * Or use system cron:
 *    * * * * * curl -X POST https://yourdomain.com/api/cron/sync-emails \
 *      -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/email-sync.log 2>&1
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get batch size from query params or env, default to 5
        const { searchParams } = new URL(request.url);
        const batchSize = searchParams.get('batchSize')
            ? parseInt(searchParams.get('batchSize')!)
            : parseInt(process.env.EMAIL_SYNC_BATCH_SIZE || '5');

        console.log(`[Email Sync Cron] Starting batch sync (size: ${batchSize})...`);

        // Process batch
        const results = await EmailSyncQueueService.processBatch(batchSize);

        console.log(`[Email Sync Cron] Completed:`, results);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results,
        });
    } catch (error: any) {
        console.error('[Email Sync Cron] Error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint for checking queue status
 * Useful for monitoring
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const stats = await EmailSyncQueueService.getQueueStats();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...stats,
        });
    } catch (error: any) {
        console.error('[Email Sync Cron] Error fetching stats:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error.message
            },
            { status: 500 }
        );
    }
}
