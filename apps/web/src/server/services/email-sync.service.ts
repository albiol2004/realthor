import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { db } from '../db';
import { emailAccounts, emails, users } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { EncryptionService } from '@/lib/utils/encryption';

export class EmailSyncService {
    static async syncAccount(accountId: string) {
        const account = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, accountId),
        });

        if (!account || !account.imapHost || !account.imapUser || !account.imapPasswordEncrypted) {
            throw new Error('Invalid account configuration');
        }

        const password = EncryptionService.decrypt(account.imapPasswordEncrypted);

        const config = {
            imap: {
                user: account.imapUser,
                password: password,
                host: account.imapHost,
                port: account.imapPort || 993,
                tls: true,
                authTimeout: 3000,
            },
        };

        try {
            const connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            // Fetch emails since last sync or last 30 days
            const lastSync = account.lastSyncedAt ? new Date(account.lastSyncedAt) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const searchCriteria = [['SINCE', lastSync.toISOString()]];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: false,
                struct: true,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            for (const message of messages) {
                const all = message.parts.find((part: any) => part.which === '');
                if (!all) continue; // Skip if we can't find the full message body

                const id = message.attributes.uid;
                const idHeader = message.parts.find((part: any) => part.which === 'HEADER');

                // Parse email
                const parsed = await simpleParser(all.body);

                // Check if email already exists
                const existing = await db.query.emails.findFirst({
                    where: and(
                        eq(emails.accountId, accountId),
                        eq(emails.uid, id)
                    )
                });

                if (existing) continue;

                // Determine direction (inbound/outbound)
                // Simple logic: if from == account email, it's outbound (if syncing Sent folder)
                // But for INBOX it's usually inbound.
                const direction = 'inbound';

                await db.insert(emails).values({
                    accountId: account.id,
                    userId: account.userId,
                    uid: id,
                    folder: 'INBOX',
                    subject: parsed.subject,
                    body: parsed.text || parsed.html || '', // Prefer text for now, or store HTML
                    fromEmail: parsed.from?.text,
                    toEmail: Array.isArray(parsed.to) ? parsed.to.map(t => t.text) : [parsed.to?.text || ''],
                    sentAt: parsed.date,
                    messageId: parsed.messageId,
                    hasAttachments: parsed.attachments.length > 0,
                    direction,
                    status: 'delivered',
                });
            }

            await db.update(emailAccounts)
                .set({ lastSyncedAt: new Date(), syncStatus: 'active', errorMessage: null })
                .where(eq(emailAccounts.id, accountId));

            connection.end();
        } catch (error: any) {
            console.error('Sync error:', error);
            await db.update(emailAccounts)
                .set({ syncStatus: 'error', errorMessage: error.message })
                .where(eq(emailAccounts.id, accountId));
            throw error;
        }
    }
}
