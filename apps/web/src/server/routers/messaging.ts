import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createClient } from "@/lib/supabase/server";

export const messagingRouter = router({
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
                query = query.or(input.contactEmails.map(email => `from_email.eq.${email}`).join(','));
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
                sentAt: email.sent_at,
                createdAt: email.created_at,
            }));

            return mappedEmails;
        }),
});
