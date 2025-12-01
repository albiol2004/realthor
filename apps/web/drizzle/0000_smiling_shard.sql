CREATE TABLE "kairo_email_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'imap',
	"email_address" text NOT NULL,
	"imap_host" text,
	"imap_port" integer,
	"imap_user" text,
	"imap_password_encrypted" text,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_user" text,
	"smtp_password_encrypted" text,
	"last_synced_at" timestamp with time zone,
	"sync_status" text DEFAULT 'active',
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kairo_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"account_id" uuid,
	"contact_id" uuid,
	"conversation_id" uuid,
	"subject" text,
	"body" text,
	"from_email" text,
	"to_email" text[],
	"cc_email" text[],
	"bcc_email" text[],
	"direction" text,
	"status" text,
	"message_id" text,
	"uid" integer,
	"folder" text,
	"references" text[],
	"has_attachments" boolean DEFAULT false,
	"attachments" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kairo_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "kairo_email_accounts" ADD CONSTRAINT "kairo_email_accounts_user_id_kairo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."kairo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kairo_emails" ADD CONSTRAINT "kairo_emails_user_id_kairo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."kairo_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kairo_emails" ADD CONSTRAINT "kairo_emails_account_id_kairo_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."kairo_email_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_accounts_user_id_idx" ON "kairo_email_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emails_account_id_idx" ON "kairo_emails" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "emails_message_id_idx" ON "kairo_emails" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "emails_uid_idx" ON "kairo_emails" USING btree ("uid");