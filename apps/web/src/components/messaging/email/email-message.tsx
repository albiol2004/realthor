"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";
import { Paperclip, Reply, ReplyAll, Forward } from "lucide-react";

interface EmailMessageProps {
    email: {
        id: string;
        fromEmail: string | null;
        toEmail: string[] | null;
        subject: string | null;
        body: string | null;
        sentAt: Date | null;
        hasAttachments: boolean | null;
        attachments: string | null; // JSON string
    };
}

export function EmailMessage({ email }: EmailMessageProps) {
    const initials = email.fromEmail ? email.fromEmail.substring(0, 2).toUpperCase() : "??";

    return (
        <Card className="mb-4">
            <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
                <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 grid gap-1">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold">{email.fromEmail}</div>
                        <div className="text-xs text-muted-foreground">
                            {email.sentAt ? format(new Date(email.sentAt), "PPp") : "Unknown date"}
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        To: {email.toEmail?.join(", ")}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: email.body || "" }} />
                </div>

                {email.hasAttachments && (
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                            <Paperclip className="h-4 w-4" />
                            Attachments
                        </div>
                        {/* Attachments rendering would go here. For MVP we just show the icon. */}
                        <div className="flex gap-2">
                            {/* Placeholder for attachments */}
                            <Button variant="outline" size="sm" className="h-8">
                                Download Attachments
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="ghost" size="sm">
                        <Reply className="mr-2 h-4 w-4" /> Reply
                    </Button>
                    <Button variant="ghost" size="sm">
                        <ReplyAll className="mr-2 h-4 w-4" /> Reply All
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Forward className="mr-2 h-4 w-4" /> Forward
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
