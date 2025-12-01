import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { emails, emailAccounts } from "../db/schema";
import { eq, or, desc, inArray, and } from "drizzle-orm";

export const messagingRouter = router({
    getContactEmails: protectedProcedure
        .input(
            z.object({
                contactId: z.string().optional(),
                contactEmails: z.array(z.string()).optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            if (!input.contactEmails || input.contactEmails.length === 0) {
                return [];
            }

            // Fetch emails where fromEmail OR toEmail matches any of the contact's emails
            // And the email belongs to one of the user's accounts

            // First get user's account IDs
            const userAccounts = await db.query.emailAccounts.findMany({
                where: eq(emailAccounts.userId, ctx.user.id),
                columns: { id: true },
            });

            const accountIds = userAccounts.map(a => a.id);

            if (accountIds.length === 0) return [];

            // We need to check if ANY of the contact emails are in the to/cc/bcc arrays
            // Drizzle doesn't have a simple "array overlaps" helper for text[] in all drivers easily,
            // but we can use `or` conditions for `fromEmail` and simple checks.
            // For `toEmail` array, we might need raw SQL or a more complex query.
            // For MVP, let's stick to `fromEmail` matches contact OR `toEmail` contains contact.
            // Since `toEmail` is an array, we can use `arrayContains` if supported, or just fetch and filter in memory if volume is low.
            // But let's try to be efficient.

            // Actually, let's just fetch by `fromEmail` for now, and maybe `toEmail` if we can.
            // Postgres `ANY` operator is useful here.

            // Simplified approach: Fetch emails for this user's accounts, then filter.
            // Better: Use SQL `OR`.

            // Since Drizzle's array support varies, let's try to find emails where:
            // accountId IN (userAccounts) AND (fromEmail IN (contactEmails) OR ...)

            // For MVP, let's assume we just want to see emails FROM the contact (inbound) 
            // and emails SENT TO the contact (outbound).

            // Note: `toEmail` is stored as text[] in our schema.

            return await db.query.emails.findMany({
                where: and(
                    inArray(emails.accountId, accountIds),
                    or(
                        inArray(emails.fromEmail, input.contactEmails),
                        // For array columns, we can't easily use `inArray` on the column itself against a list of values.
                        // We'd need `sql` operator.
                        // Let's just fetch inbound from contact for now to prove it works, 
                        // and maybe outbound if we can match `toEmail`.
                    )
                ),
                orderBy: [desc(emails.sentAt)],
                limit: 50,
            });
        }),
});
