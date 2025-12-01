# Contact-Based Email Integration Requirements & Architecture

## 1. Overview
The goal is to integrate a full email client capability directly into the **Contact Detail** view. Unlike a traditional inbox, this view is **contact-centric**: it shows only the conversation history relevant to the specific contact being viewed.

## 2. Requirements

### 2.1 Functional Requirements
1.  **Contact-Centric Interface**:
    *   Located within the Contact Detail tab (e.g., `/contacts/[id]?tab=email`).
    *   Display past conversations linked to the contact's email address(es).
    *   **Layout**: Grouped by Subject (Thread).
        *   Header: Subject.
        *   Body: List of messages (content + attachments).
    *   **Attachments**: Displayed at the bottom of messages with a paperclip icon for download/view.
2.  **Multiple Emails per Contact**:
    *   Support multiple email addresses for a single contact.
    *   Allow selecting which email address to send *to* when composing.
    *   Aggregate history from all of the contact's known email addresses.
3.  **Email Account Settings**:
    *   New Settings section for configuring email accounts.
    *   Support **IMAP/SMTP** configuration (Host, Port, User, Password, SSL/TLS).
    *   (Future) Support OAuth for Gmail/Outlook.
4.  **Background Synchronization**:
    *   Periodic background polling of configured IMAP accounts.
    *   Process *all* emails to ensure history is available even for new contacts.
    *   **No Caching limitation**: All emails must be processed and stored/indexed to link them to current or future contacts.
5.  **Notifications (Future)**:
    *   Visual indicator (red dot) for unread messages.

### 2.2 Non-Functional Requirements
*   **Security**: Email credentials (passwords) must be stored securely (encrypted at rest).
*   **Performance**: The frontend should not fetch *all* emails and filter; the backend must efficiently query emails relevant to the contact.

## 3. Architecture Design

### 3.1 Database Schema Updates

We need to store email account credentials and ensure our `emails` table supports IMAP syncing.

#### New Table: `email_accounts`
Stores the user's connected email accounts.

```sql
create table email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  provider text, -- 'imap', 'gmail', 'outlook'
  email_address text not null,
  
  -- IMAP Settings (Encrypted)
  imap_host text,
  imap_port integer,
  imap_user text,
  imap_password_encrypted text, -- AES-256 encrypted
  
  -- SMTP Settings (Encrypted)
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password_encrypted text, -- AES-256 encrypted
  
  last_synced_at timestamptz,
  sync_status text, -- 'active', 'error', 'syncing'
  error_message text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### Updates to `emails` Table
Ensure we capture necessary metadata for threading and syncing.

*   `account_id`: FK to `email_accounts`.
*   `message_id`: The global unique Message-ID header.
*   `uid`: The IMAP UID (specific to the folder).
*   `folder`: e.g., 'INBOX', 'Sent'.
*   `references`: Array of Message-IDs for threading.
*   `has_attachments`: Boolean for quick UI rendering.

### 3.2 Backend Services

#### A. Email Sync Service (Background Worker)
Since we cannot rely on on-demand fetching for "past conversations" (too slow) and need to link new contacts to old emails, we must sync emails to our database.

*   **Trigger**: Cron job (e.g., every 5-10 minutes) or triggered via UI "Sync Now".
*   **Logic**:
    1.  Iterate through active `email_accounts`.
    2.  Connect via IMAP.
    3.  Fetch emails since `last_synced_at`.
    4.  **Processing**:
        *   Parse email (Subject, Body, From, To, Date, Message-ID).
        *   **Contact Linking**: Check if `from_email` or `to_email` matches an existing Contact.
            *   If yes -> Link `contact_id`.
            *   If no -> Store email anyway (for future linking or "Unknown" inbox).
        *   **Attachment Handling**: Upload attachments to Storage (Supabase Storage) and save reference in DB.
    5.  Update `last_synced_at`.

#### B. Encryption Helper
*   Utility to encrypt/decrypt passwords using a server-side secret key (never exposed to client).

### 3.3 Frontend Architecture

#### A. Settings > Email Integrations
*   Form to input IMAP/SMTP details.
*   "Test Connection" button to verify credentials before saving.

#### B. Contact Detail > Email Tab
*   **Data Fetching**:
    *   Query `emails` table where `contact_id = [current_contact_id]`.
    *   OR `from_email IN [contact_emails] OR to_email IN [contact_emails]`.
    *   Order by `sent_at` DESC.
*   **Grouping Logic (Frontend or Backend)**:
    *   Group emails by `subject` (normalized) or `thread_id`.
    *   *Recommendation*: Perform grouping on the backend (via a View or query) if pagination is needed. For MVP, fetching flat list and grouping on frontend is acceptable if volume is low (< 1000 emails per contact).
*   **UI Components**:
    *   `EmailThreadList`: Accordion or list of subjects.
    *   `EmailMessage`: The individual message bubble.
    *   `AttachmentPreview`: Thumbnail + Download link.
    *   `EmailComposer`: Rich text editor.
        *   `From`: Select from `email_accounts`.
        *   `To`: Select from Contact's emails.

## 4. Decision Concerns & Trade-offs

### 4.1 "Frontend Processing" vs Backend
*   **User Question**: "The frontend processess and shows only the past conversation with the contact, the server shouldn't be responsible for that processing right?"
*   **Clarification**:
    *   **Filtering**: The **Server** MUST be responsible for *filtering* (retrieving only this contact's emails from the DB). Sending *all* user emails to the frontend to be filtered is a security risk and performance bottleneck.
    *   **Formatting/Grouping**: The **Frontend** CAN handle the *visual grouping* (threading) of the retrieved messages. This allows for a snappy UI.

### 4.2 Storage & Attachments
*   Emails can be large. Storing bodies in Postgres is fine, but attachments should go to Object Storage (Supabase Storage).
*   **Cost**: Storing *every* email attachment might get expensive.
*   **Mitigation**: Limit sync to last X months initially, or only download attachments on demand (though IMAP fetch on demand is slower). *Decision: Download and store is best for user experience.*

### 4.3 Security
*   Storing plain text passwords is a major risk.
*   **Requirement**: Use AES-256 encryption for `imap_password` and `smtp_password`. The key should be in environment variables (`EMAIL_ENCRYPTION_KEY`).

### 4.4 Polling vs Real-time
*   IMAP IDLE allows real-time push, but requires a persistent connection (stateful server).
*   Since we are likely on a serverless/stateless environment (Next.js/Vercel), persistent connections are hard.
*   **Decision**: Periodic Polling (Cron) is the standard approach for this stack.

## 5. Setup Requirements

1.  **Environment Variables**:
    *   `EMAIL_ENCRYPTION_KEY`: A 32-byte random string for encrypting credentials.
    *   `CRON_SECRET`: To secure the sync endpoint.
2.  **Dependencies**:
    *   `imap-simple` or `node-imap`: For IMAP connection.
    *   `nodemailer`: For SMTP sending.
    *   `mailparser`: To parse raw email data.
    *   `crypto`: Node.js built-in for encryption.
