import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { createClient } from '@/lib/supabase/server';
import { EncryptionService } from '@/lib/utils/encryption';

export class EmailSyncService {
    static async syncAccount(accountId: string) {
        const supabase = await createClient();

        // Fetch account details using Supabase
        const { data: account, error: accountError } = await supabase
            .from('kairo_email_accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (accountError || !account) {
            throw new Error(`Account not found: ${accountError?.message || 'Unknown error'}`);
        }

        if (!account.imap_host || !account.imap_user || !account.imap_password_encrypted) {
            throw new Error('Invalid account configuration');
        }

        const password = EncryptionService.decrypt(account.imap_password_encrypted);

        const config = {
            imap: {
                user: account.imap_user,
                password: password,
                host: account.imap_host,
                port: account.imap_port || 993,
                tls: true,
                tlsOptions: {
                    rejectUnauthorized: false, // Allow self-signed certificates
                    servername: account.imap_host, // SNI support
                },
                authTimeout: 10000,
            },
        };

        try {
            const connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            // Fetch emails since last sync or last 30 days
            const lastSync = account.last_synced_at
                ? new Date(account.last_synced_at)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
                const flags = message.attributes.flags || [];
                const isRead = flags.includes('\\Seen');

                // Parse email
                const parsed = await simpleParser(all.body);

                // Check if email already exists
                const { data: existing } = await supabase
                    .from('kairo_emails')
                    .select('id')
                    .eq('account_id', accountId)
                    .eq('uid', id)
                    .single();

                if (existing) continue; // Skip duplicates

                // Determine direction (inbound/outbound)
                // Simple logic: if from == account email, it's outbound (if syncing Sent folder)
                // But for INBOX it's usually inbound.
                const direction = 'inbound';

                // Extract clean email address from parsed.from
                const fromEmail = parsed.from?.text || '';
                const cleanFromEmail = fromEmail.match(/<(.+?)>/)
                    ? fromEmail.match(/<(.+?)>/)![1]
                    : fromEmail.split('<')[0].trim();

                // Try to link email to a contact based on from_email
                let contactId = null;
                if (cleanFromEmail) {
                    const { data: contact } = await supabase
                        .from('contacts')
                        .select('id')
                        .eq('user_id', account.user_id)
                        .ilike('email', cleanFromEmail)
                        .single();

                    if (contact) {
                        contactId = contact.id;
                    }
                }

                // Prepare email data
                const emailData = {
                    account_id: account.id,
                    user_id: account.user_id,
                    contact_id: contactId,  // Link to contact if found
                    uid: id,
                    folder: 'INBOX',
                    subject: parsed.subject || '',
                    body: parsed.text || parsed.html || '',
                    from_email: cleanFromEmail,
                    to_email: Array.isArray(parsed.to)
                        ? parsed.to.map((t: any) => t.text)
                        : parsed.to?.text ? [parsed.to.text] : [],
                    sent_at: parsed.date?.toISOString() || new Date().toISOString(),
                    message_id: parsed.messageId || null,
                    has_attachments: parsed.attachments && parsed.attachments.length > 0,
                    is_read: isRead,  // Sync read status from IMAP server
                    direction,
                    status: 'delivered',
                };

                // Insert email
                await supabase.from('kairo_emails').insert(emailData);
            }

            // Update account sync status
            await supabase
                .from('kairo_email_accounts')
                .update({
                    last_synced_at: new Date().toISOString(),
                    sync_status: 'active',
                    error_message: null
                })
                .eq('id', accountId);

            connection.end();
        } catch (error: any) {
            console.error('Sync error:', error);

            // Update account with error status
            await supabase
                .from('kairo_email_accounts')
                .update({
                    sync_status: 'error',
                    error_message: error.message
                })
                .eq('id', accountId);

            throw error;
        }
    }

    /**
     * Mark email as read or unread on IMAP server
     */
    static async updateReadStatus(accountId: string, uid: number, isRead: boolean) {
        const supabase = await createClient();

        // Fetch account details
        const { data: account, error: accountError } = await supabase
            .from('kairo_email_accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (accountError || !account) {
            throw new Error(`Account not found: ${accountError?.message || 'Unknown error'}`);
        }

        if (!account.imap_host || !account.imap_user || !account.imap_password_encrypted) {
            throw new Error('Invalid account configuration');
        }

        const password = EncryptionService.decrypt(account.imap_password_encrypted);

        const config = {
            imap: {
                user: account.imap_user,
                password: password,
                host: account.imap_host,
                port: account.imap_port || 993,
                tls: true,
                tlsOptions: {
                    rejectUnauthorized: false,
                    servername: account.imap_host,
                },
                authTimeout: 10000,
            },
        };

        try {
            const connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            // Add or remove \Seen flag
            if (isRead) {
                await connection.addFlags(uid, '\\Seen');
            } else {
                await connection.delFlags(uid, '\\Seen');
            }

            connection.end();
        } catch (error: any) {
            console.error('Failed to update read status on IMAP server:', error);
            throw error;
        }
    }
}
