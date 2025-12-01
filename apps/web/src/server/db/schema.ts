import { sql } from "drizzle-orm";
import {
    boolean,
    index,
    integer,
    pgTableCreator,
    text,
    timestamp,
    uuid,
    vector,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `kairo_${name}`);

// Reference to Supabase Auth users table (in auth schema, not public)
// We don't create this table, just reference it for foreign keys
import { pgSchema } from "drizzle-orm/pg-core";
const authSchema = pgSchema("auth");

export const users = authSchema.table("users", {
    id: uuid("id").primaryKey(),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true }),
});

// Email Accounts
export const emailAccounts = createTable(
    "email_accounts",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        provider: text("provider").default("imap"),
        emailAddress: text("email_address").notNull(),
        imapHost: text("imap_host"),
        imapPort: integer("imap_port"),
        imapUser: text("imap_user"),
        imapPasswordEncrypted: text("imap_password_encrypted"),
        smtpHost: text("smtp_host"),
        smtpPort: integer("smtp_port"),
        smtpUser: text("smtp_user"),
        smtpPasswordEncrypted: text("smtp_password_encrypted"),
        lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
        syncStatus: text("sync_status").default("active"), // active, error, syncing
        errorMessage: text("error_message"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    },
    (table) => ({
        userIdIdx: index("email_accounts_user_id_idx").on(table.userId),
    })
);

// Emails
export const emails = createTable(
    "emails",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id").references(() => users.id),
        accountId: uuid("account_id").references(() => emailAccounts.id, {
            onDelete: "set null",
        }),
        contactId: uuid("contact_id"), // Assuming contacts table exists, but not defining it here yet to avoid conflicts if it's missing
        conversationId: uuid("conversation_id"),
        subject: text("subject"),
        body: text("body"),
        fromEmail: text("from_email"),
        toEmail: text("to_email").array(),
        ccEmail: text("cc_email").array(),
        bccEmail: text("bcc_email").array(),
        direction: text("direction"), // inbound, outbound
        status: text("status"), // draft, sent, delivered, failed
        messageId: text("message_id"),
        uid: integer("uid"),
        folder: text("folder"),
        references: text("references").array(),
        hasAttachments: boolean("has_attachments").default(false),
        attachments: text("attachments"), // JSONB in reality, but text for simplicity if jsonb not imported or using simple types
        sentAt: timestamp("sent_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    },
    (table) => ({
        accountIdIdx: index("emails_account_id_idx").on(table.accountId),
        messageIdIdx: index("emails_message_id_idx").on(table.messageId),
        uidIdx: index("emails_uid_idx").on(table.uid),
    })
);
