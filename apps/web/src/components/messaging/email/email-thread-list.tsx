"use client";

import { EmailMessage } from "./email-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc/client";
import { Loader2 } from "lucide-react";

interface EmailThreadListProps {
    contactEmails: string[];
}

export function EmailThreadList({ contactEmails }: EmailThreadListProps) {
    const { data: emails, isLoading } = trpc.messaging.getContactEmails.useQuery({
        contactEmails,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!emails || emails.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                No emails found for this contact.
            </div>
        );
    }

    // Group by subject (simple threading)
    // Note: In a real app, use `threadId` or `references`
    const threads = emails.reduce((acc, email) => {
        const subject = email.subject || "(No Subject)";
        if (!acc[subject]) {
            acc[subject] = [];
        }
        acc[subject].push(email);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-8">
                {Object.entries(threads).map(([subject, threadEmails]) => (
                    <div key={subject} className="space-y-4">
                        <div className="sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b mb-4">
                            <h3 className="font-semibold text-lg">{subject}</h3>
                        </div>
                        {(threadEmails as any[]).map((email: any) => (
                            <EmailMessage key={email.id} email={email} />
                        ))}
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
