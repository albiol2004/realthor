import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createClient } from "@/lib/supabase/server";
import { EncryptionService } from "@/lib/utils/encryption";
import imaps from "imap-simple";
import nodemailer from "nodemailer";
import { EmailSyncService } from "../services/email-sync.service";

export const emailSettingsRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('kairo_email_accounts')
            .select('*')
            .eq('user_id', ctx.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch email accounts: ${error.message}`);
        }

        // Map snake_case to camelCase for frontend
        const mappedAccounts = (data || []).map(account => ({
            id: account.id,
            userId: account.user_id,
            provider: account.provider,
            emailAddress: account.email_address,
            imapHost: account.imap_host,
            imapPort: account.imap_port,
            imapUser: account.imap_user,
            smtpHost: account.smtp_host,
            smtpPort: account.smtp_port,
            smtpUser: account.smtp_user,
            lastSyncedAt: account.last_synced_at,
            syncStatus: account.sync_status,
            errorMessage: account.error_message,
            createdAt: account.created_at,
            updatedAt: account.updated_at,
        }));

        return mappedAccounts;
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
            const supabase = await createClient();

            // Encrypt passwords
            const imapPasswordEncrypted = EncryptionService.encrypt(input.imapPassword);
            const smtpPasswordEncrypted = EncryptionService.encrypt(input.smtpPassword);

            const { data, error } = await supabase
                .from('kairo_email_accounts')
                .insert({
                    user_id: ctx.user.id,
                    email_address: input.emailAddress,
                    imap_host: input.imapHost,
                    imap_port: input.imapPort,
                    imap_user: input.imapUser,
                    imap_password_encrypted: imapPasswordEncrypted,
                    smtp_host: input.smtpHost,
                    smtp_port: input.smtpPort,
                    smtp_user: input.smtpUser,
                    smtp_password_encrypted: smtpPasswordEncrypted,
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create email account: ${error.message}`);
            }

            return { success: true, account: data };
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const supabase = await createClient();

            const { error } = await supabase
                .from('kairo_email_accounts')
                .delete()
                .eq('id', input.id)
                .eq('user_id', ctx.user.id);

            if (error) {
                throw new Error(`Failed to delete email account: ${error.message}`);
            }

            return { success: true };
        }),

    syncNow: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                await EmailSyncService.syncAccount(input.id);
                return { success: true };
            } catch (error: any) {
                throw new Error(`Sync failed: ${error.message}`);
            }
        }),

    sendEmail: protectedProcedure
        .input(
            z.object({
                accountId: z.string(),
                to: z.string().email(),
                subject: z.string(),
                body: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const supabase = await createClient();

            // Get account details
            const { data: account, error: fetchError } = await supabase
                .from('kairo_email_accounts')
                .select('*')
                .eq('id', input.accountId)
                .eq('user_id', ctx.user.id)
                .single();

            if (fetchError || !account) {
                throw new Error('Email account not found');
            }

            // Decrypt SMTP password
            const smtpPassword = EncryptionService.decrypt(account.smtp_password_encrypted);

            // Create transporter
            const transporter = nodemailer.createTransport({
                host: account.smtp_host,
                port: account.smtp_port,
                secure: account.smtp_port === 465,
                auth: {
                    user: account.smtp_user,
                    pass: smtpPassword,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });

            // Send email
            await transporter.sendMail({
                from: account.email_address,
                to: input.to,
                subject: input.subject,
                html: input.body,
            });

            // Store sent email in database
            await supabase.from('kairo_emails').insert({
                user_id: ctx.user.id,
                account_id: account.id,
                from_email: account.email_address,
                to_email: [input.to],
                subject: input.subject,
                body: input.body,
                direction: 'outbound',
                status: 'sent',
                sent_at: new Date().toISOString(),
            });

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
                    tlsOptions: {
                        rejectUnauthorized: false,
                        servername: input.imapHost,
                    },
                    authTimeout: 10000,
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
