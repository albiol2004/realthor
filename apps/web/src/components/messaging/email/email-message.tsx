"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Paperclip, Reply, ReplyAll, Forward, Mail, Send, Circle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { EmailComposer } from "./email-composer";

interface EmailMessageProps {
    email: {
        id: string;
        fromEmail: string | null;
        toEmail: string[] | null;
        subject: string | null;
        body: string | null;
        sentAt: Date | null;
        hasAttachments: boolean | null;
        attachments: string | null;
        direction?: string | null;
        isRead?: boolean | null;
    };
}

export function EmailMessage({ email }: EmailMessageProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [composeMode, setComposeMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);
    const utils = trpc.useUtils();

    const initials = email.fromEmail ? email.fromEmail.substring(0, 2).toUpperCase() : "??";
    const isInbound = email.direction === 'inbound';
    const isUnread = !email.isRead && isInbound;

    // Mark as read when opening
    const markAsReadMutation = trpc.messaging.markAsRead.useMutation({
        onSuccess: () => {
            utils.messaging.getContactEmails.invalidate();
            utils.messaging.getUnreadCount.invalidate();
        },
    });

    const handleOpen = () => {
        setIsExpanded(true);
        if (isUnread) {
            markAsReadMutation.mutate({ emailId: email.id });
        }
    };

    // Reply/Forward handlers
    const handleReply = () => {
        setComposeMode('reply');
    };

    const handleReplyAll = () => {
        setComposeMode('replyAll');
    };

    const handleForward = () => {
        setComposeMode('forward');
    };

    // Prepare compose data based on mode
    const getComposeData = () => {
        const originalBody = email.body || "";
        const quotedBody = `\n\n------- Original Message -------\nFrom: ${email.fromEmail}\nDate: ${email.sentAt ? format(new Date(email.sentAt), "PPp") : "Unknown"}\nSubject: ${email.subject || "(No Subject)"}\n\n${originalBody}`;

        switch (composeMode) {
            case 'reply':
                return {
                    to: email.fromEmail || "",
                    subject: email.subject?.startsWith('Re: ') ? email.subject : `Re: ${email.subject || "(No Subject)"}`,
                    body: quotedBody,
                };
            case 'replyAll':
                return {
                    to: email.fromEmail || "",
                    subject: email.subject?.startsWith('Re: ') ? email.subject : `Re: ${email.subject || "(No Subject)"}`,
                    body: quotedBody,
                };
            case 'forward':
                return {
                    to: "", // Empty for forward - user can search any contact
                    subject: email.subject?.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject || "(No Subject)"}`,
                    body: quotedBody,
                };
            default:
                return { to: "", subject: "", body: "" };
        }
    };

    const composeData = getComposeData();

    // Render email body (handles both plain text and HTML)
    const renderEmailBody = (body: string | null) => {
        if (!body) return "No content"

        // Detect if email is HTML (contains HTML tags)
        const isHTML = /<[a-z][\s\S]*>/i.test(body)

        if (isHTML) {
            // Already HTML, render as-is
            return body
        } else {
            // Plain text: Convert newlines to <br> tags
            return body
                .replace(/\r\n/g, '\n')  // Normalize Windows line endings
                .replace(/\n/g, '<br>')  // Convert \n to <br>
        }
    }

    // Extract text preview (first 150 chars, flattened)
    const getTextPreview = (body: string | null) => {
        if (!body) return "No content"
        // Strip HTML tags
        const text = body.replace(/<[^>]*>/g, '')
        // Flatten newlines for preview (single line)
        const normalized = text.replace(/\r\n/g, '\n').replace(/\n/g, ' ')
        return normalized.length > 150 ? normalized.substring(0, 150) + '...' : normalized
    };

    return (
        <>
            {/* Compact Email Card */}
            <Card
                className={cn(
                    "mb-3 cursor-pointer hover:shadow-md transition-shadow",
                    isUnread && "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                )}
                onClick={handleOpen}
            >
                <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
                    {/* Direction Indicator */}
                    <div className="flex-shrink-0 mt-1">
                        {isInbound ? (
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30" title="Received">
                                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                        ) : (
                            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30" title="Sent">
                                <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="flex-shrink-0">
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    {/* Email Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                {isUnread && (
                                    <Circle className="h-2 w-2 fill-blue-500 text-blue-500 flex-shrink-0" />
                                )}
                                <div className="font-semibold truncate">{email.fromEmail}</div>
                            </div>
                            <div className="text-xs text-muted-foreground flex-shrink-0">
                                {email.sentAt ? format(new Date(email.sentAt), "MMM d, h:mm a") : "Unknown"}
                            </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 truncate">
                            {email.subject || "(No Subject)"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {getTextPreview(email.body)}
                        </div>
                        {email.hasAttachments && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                                <Paperclip className="h-3 w-3" />
                                Has attachments
                            </div>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* Full Screen Email Dialog */}
            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-xl">{email.subject || "(No Subject)"}</DialogTitle>
                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        {isInbound ? (
                                            <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                                                <Mail className="h-3 w-3 text-green-600 dark:text-green-400" />
                                            </div>
                                        ) : (
                                            <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                                                <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                            </div>
                                        )}
                                        <span className="font-medium">{email.fromEmail}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{email.sentAt ? format(new Date(email.sentAt), "PPp") : "Unknown date"}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    To: {email.toEmail?.join(", ")}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Email Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 border rounded-md bg-gray-50 dark:bg-gray-900">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <div dangerouslySetInnerHTML={{ __html: renderEmailBody(email.body) }} />
                        </div>
                    </div>

                    {/* Attachments Section */}
                    {email.hasAttachments && (
                        <div className="pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <Paperclip className="h-4 w-4" />
                                Attachments
                            </div>
                            <Button variant="outline" size="sm" className="h-8">
                                Download Attachments
                            </Button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                        <Button variant="outline" size="sm" onClick={handleReply}>
                            <Reply className="mr-2 h-4 w-4" /> Reply
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleReplyAll}>
                            <ReplyAll className="mr-2 h-4 w-4" /> Reply All
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleForward}>
                            <Forward className="mr-2 h-4 w-4" /> Forward
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Compose Dialog */}
            <Dialog open={composeMode !== null} onOpenChange={(open) => !open && setComposeMode(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {composeMode === 'reply' && 'Reply to Email'}
                            {composeMode === 'replyAll' && 'Reply All'}
                            {composeMode === 'forward' && 'Forward Email'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto">
                        <EmailComposer
                            defaultTo={composeData.to}
                            defaultSubject={composeData.subject}
                            defaultBody={composeData.body}
                            onClose={() => setComposeMode(null)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
