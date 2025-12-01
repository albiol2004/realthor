import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createClient } from "@/lib/supabase/server";
import { EmailSyncService } from "../services/email-sync.service";

export const messagingRouter = router({
    // Retroactively link existing emails to contacts
    linkEmailsToContacts: protectedProcedure.mutation(async ({ ctx }) => {
        const supabase = await createClient();

        // Get all user's contacts with emails
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id, email')
            .eq('user_id', ctx.user.id)
            .not('email', 'is', null);

        if (!contacts || contacts.length === 0) {
            return { linked: 0 };
        }

        let linkedCount = 0;

        // For each contact, link unlinked emails
        for (const contact of contacts) {
            const cleanEmail = contact.email?.toLowerCase().trim();
            if (!cleanEmail) continue;

            // Update emails where contact_id is null and from_email matches
            const { error } = await supabase
                .from('kairo_emails')
                .update({ contact_id: contact.id })
                .eq('user_id', ctx.user.id)
                .is('contact_id', null)
                .ilike('from_email', `%${cleanEmail}%`);

            if (!error) linkedCount++;
        }

        return { linked: linkedCount };
    }),

    // Mark email as read
    markAsRead: protectedProcedure
        .input(z.object({ emailId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const supabase = await createClient();

            // First, get the email details to sync with IMAP
            const { data: email } = await supabase
                .from('kairo_emails')
                .select('account_id, uid')
                .eq('id', input.emailId)
                .eq('user_id', ctx.user.id)
                .single();

            if (!email) {
                throw new Error('Email not found');
            }

            // Update database
            const { error } = await supabase
                .from('kairo_emails')
                .update({ is_read: true })
                .eq('id', input.emailId)
                .eq('user_id', ctx.user.id);

            if (error) {
                throw new Error(`Failed to mark as read: ${error.message}`);
            }

            // Sync with IMAP server (don't block on this)
            if (email.account_id && email.uid) {
                EmailSyncService.updateReadStatus(email.account_id, email.uid, true)
                    .catch(err => {
                        console.error('Failed to sync read status with IMAP:', err);
                        // Don't throw - database is updated, IMAP sync is best-effort
                    });
            }

            return { success: true };
        }),

    // Get unread count
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
        const supabase = await createClient();

        const { count, error } = await supabase
            .from('kairo_emails')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', ctx.user.id)
            .eq('is_read', false)
            .eq('direction', 'inbound');

        if (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }

        return count || 0;
    }),

    getContactEmails: protectedProcedure
        .input(
            z.object({
                contactId: z.string().optional(),
                contactEmails: z.array(z.string()).optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const supabase = await createClient();

            // First get user's email accounts
            const { data: accounts } = await supabase
                .from('kairo_email_accounts')
                .select('id')
                .eq('user_id', ctx.user.id);

            if (!accounts || accounts.length === 0) {
                return [];
            }

            const accountIds = accounts.map(a => a.id);

            // Build query
            let query = supabase
                .from('kairo_emails')
                .select('*')
                .in('account_id', accountIds);

            // If contact emails are provided, filter by them
            if (input.contactEmails && input.contactEmails.length > 0) {
                // Fetch emails where fromEmail matches any contact email
                // OR where toEmail array contains any contact email
                const orConditions = input.contactEmails.flatMap(email => [
                    `from_email.eq.${email}`,  // Emails FROM the contact
                    `to_email.cs.{${email}}`    // Emails TO the contact (array contains)
                ]);
                query = query.or(orConditions.join(','));
            }

            // Otherwise, fetch all emails for the user (no filter)
            const { data: emails, error } = await query
                .order('sent_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching emails:', error);
                return [];
            }

            // Map snake_case to camelCase for frontend
            const mappedEmails = (emails || []).map(email => ({
                id: email.id,
                userId: email.user_id,
                accountId: email.account_id,
                contactId: email.contact_id,
                conversationId: email.conversation_id,
                subject: email.subject,
                body: email.body,
                fromEmail: email.from_email,
                toEmail: email.to_email,
                ccEmail: email.cc_email,
                bccEmail: email.bcc_email,
                direction: email.direction,
                status: email.status,
                messageId: email.message_id,
                uid: email.uid,
                folder: email.folder,
                references: email.references,
                hasAttachments: email.has_attachments,
                attachments: email.attachments,
                isRead: email.is_read,
                sentAt: email.sent_at,
                createdAt: email.created_at,
                updatedAt: email.updated_at,
            }));

            return mappedEmails;
        }),
});
