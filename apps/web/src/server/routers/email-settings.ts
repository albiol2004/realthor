import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { emailAccounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { EncryptionService } from "@/lib/utils/encryption";
import imaps from "imap-simple";

export const emailSettingsRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return await db.query.emailAccounts.findMany({
            where: eq(emailAccounts.userId, ctx.user.id),
            orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
        });
    }),

    create: protectedProcedure
        .input(
            z.object({
                emailAddress: z.string().email(),
                imapHost: z.string(),
                imapPort: z.number(),
                imapUser: z.string(),
                imapPassword: z.string(),
                smtpHost: z.string(),
                smtpPort: z.number(),
                smtpUser: z.string(),
                smtpPassword: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Encrypt passwords
            const imapPasswordEncrypted = EncryptionService.encrypt(input.imapPassword);
            const smtpPasswordEncrypted = EncryptionService.encrypt(input.smtpPassword);

            await db.insert(emailAccounts).values({
                userId: ctx.user.id,
                emailAddress: input.emailAddress,
                imapHost: input.imapHost,
                imapPort: input.imapPort,
                imapUser: input.imapUser,
                imapPasswordEncrypted,
                smtpHost: input.smtpHost,
                smtpPort: input.smtpPort,
                smtpUser: input.smtpUser,
                smtpPasswordEncrypted,
            });

            return { success: true };
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await db.delete(emailAccounts).where(eq(emailAccounts.id, input.id));
            return { success: true };
        }),

    testConnection: protectedProcedure
        .input(
            z.object({
                imapHost: z.string(),
                imapPort: z.number(),
                imapUser: z.string(),
                imapPassword: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            const config = {
                imap: {
                    user: input.imapUser,
                    password: input.imapPassword,
                    host: input.imapHost,
                    port: input.imapPort,
                    tls: true,
                    authTimeout: 3000,
                },
            };

            try {
                const connection = await imaps.connect(config);
                await connection.end();
                return { success: true };
            } catch (error: any) {
                throw new Error(`Connection failed: ${error.message}`);
            }
        }),
});
