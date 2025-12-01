import { createClient } from '@/lib/supabase/server';
import { EmailSyncService } from './email-sync.service';

/**
 * Staggered email sync service
 * Processes accounts in batches to avoid overwhelming the server
 */
export class EmailSyncQueueService {
    private static readonly DEFAULT_BATCH_SIZE = 5;
    private static readonly SYNC_INTERVAL_MINUTES = 5; // Sync each account every 15 minutes

    /**
     * Get accounts that need syncing
     * Priority: accounts that haven't been synced in longest time
     */
    static async getAccountsToSync(batchSize: number = this.DEFAULT_BATCH_SIZE) {
        const supabase = await createClient();

        // Calculate cutoff time (accounts not synced in last X minutes)
        const cutoffTime = new Date(Date.now() - this.SYNC_INTERVAL_MINUTES * 60 * 1000);

        const { data: accounts, error } = await supabase
            .from('kairo_email_accounts')
            .select('id, user_id, email_address, last_synced_at, sync_status')
            .or(`last_synced_at.is.null,last_synced_at.lt.${cutoffTime.toISOString()}`)
            .eq('sync_status', 'active')
            .order('last_synced_at', { ascending: true, nullsFirst: true })
            .limit(batchSize);

        if (error) {
            console.error('Failed to fetch accounts for sync:', error);
            return [];
        }

        return accounts || [];
    }

    /**
     * Process a batch of accounts
     * Returns summary of sync results
     */
    static async processBatch(batchSize?: number) {
        const accounts = await this.getAccountsToSync(batchSize);

        if (accounts.length === 0) {
            return {
                processed: 0,
                succeeded: 0,
                failed: 0,
                message: 'No accounts need syncing at this time',
            };
        }

        const results = {
            processed: accounts.length,
            succeeded: 0,
            failed: 0,
            errors: [] as { accountId: string; email: string; error: string }[],
        };

        // Process accounts concurrently (but limited batch size prevents overload)
        await Promise.allSettled(
            accounts.map(async (account) => {
                try {
                    await EmailSyncService.syncAccount(account.id);
                    results.succeeded++;
                    console.log(`✓ Synced account: ${account.email_address}`);
                } catch (error: any) {
                    results.failed++;
                    results.errors.push({
                        accountId: account.id,
                        email: account.email_address,
                        error: error.message,
                    });
                    console.error(`✗ Failed to sync account ${account.email_address}:`, error.message);
                }
            })
        );

        return results;
    }

    /**
     * Get sync queue statistics
     * Useful for monitoring dashboard
     */
    static async getQueueStats() {
        const supabase = await createClient();

        const cutoffTime = new Date(Date.now() - this.SYNC_INTERVAL_MINUTES * 60 * 1000);

        // Count accounts by status
        const [totalResult, pendingResult, errorResult] = await Promise.all([
            supabase
                .from('kairo_email_accounts')
                .select('*', { count: 'exact', head: true }),
            supabase
                .from('kairo_email_accounts')
                .select('*', { count: 'exact', head: true })
                .or(`last_synced_at.is.null,last_synced_at.lt.${cutoffTime.toISOString()}`)
                .eq('sync_status', 'active'),
            supabase
                .from('kairo_email_accounts')
                .select('*', { count: 'exact', head: true })
                .eq('sync_status', 'error'),
        ]);

        return {
            totalAccounts: totalResult.count || 0,
            pendingSync: pendingResult.count || 0,
            errorAccounts: errorResult.count || 0,
            syncInterval: this.SYNC_INTERVAL_MINUTES,
        };
    }
}
