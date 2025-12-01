"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Send, Loader2, Paperclip } from "lucide-react";

interface EmailComposerProps {
    contactEmails: string[];
    defaultTo?: string;
}

export function EmailComposer({ contactEmails, defaultTo }: EmailComposerProps) {
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [selectedFrom, setSelectedFrom] = useState("");
    const [selectedTo, setSelectedTo] = useState(defaultTo || contactEmails[0] || "");

    const { data: emailAccounts } = trpc.emailSettings.list.useQuery();

    const sendEmail = trpc.emailSettings.sendEmail.useMutation({
        onSuccess: () => {
            toast.success("Email sent successfully");
            setSubject("");
            setBody("");
        },
        onError: (error) => {
            toast.error(`Failed to send email: ${error.message}`);
        },
    });

    const handleSend = () => {
        if (!selectedFrom || !selectedTo || !subject || !body) {
            toast.error("Please fill in all fields");
            return;
        }

        sendEmail.mutate({
            accountId: selectedFrom,
            to: selectedTo,
            subject,
            body,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>New Email</CardTitle>
                <CardDescription>Compose and send an email to this contact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="from">From</Label>
                        <Select value={selectedFrom} onValueChange={setSelectedFrom}>
                            <SelectTrigger id="from">
                                <SelectValue placeholder="Select email account" />
                            </SelectTrigger>
                            <SelectContent>
                                {emailAccounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.emailAddress}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="to">To</Label>
                        <Select value={selectedTo} onValueChange={setSelectedTo}>
                            <SelectTrigger id="to">
                                <SelectValue placeholder="Select recipient" />
                            </SelectTrigger>
                            <SelectContent>
                                {contactEmails.map((email) => (
                                    <SelectItem key={email} value={email}>
                                        {email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                        id="subject"
                        placeholder="Email subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="body">Message</Label>
                    <Textarea
                        id="body"
                        placeholder="Type your message here..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={8}
                        className="resize-none"
                    />
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                    <Button variant="outline" size="sm">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach File
                    </Button>
                    <Button onClick={handleSend} disabled={sendEmail.isPending}>
                        {sendEmail.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Email
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
