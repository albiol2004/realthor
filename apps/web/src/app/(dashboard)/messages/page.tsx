"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Loader2, RefreshCw, Link } from "lucide-react";
import { EmailMessage } from "@/components/messaging/email/email-message";
import { toast } from "sonner";

export default function MessagesPage() {
    const [activeTab, setActiveTab] = useState("email");
    const utils = trpc.useUtils();

    const { data: emailAccounts } = trpc.emailSettings.list.useQuery();

    // Get all emails from all accounts
    const { data: allEmails, isLoading } = trpc.messaging.getContactEmails.useQuery({
        contactEmails: [], // Empty to get all emails
    });

    // Sync all email accounts
    const syncAllAccounts = trpc.emailSettings.syncNow.useMutation({
        onSuccess: () => {
            toast.success("Email sync started");
            utils.messaging.getContactEmails.invalidate();
        },
        onError: (error) => {
            toast.error(`Sync failed: ${error.message}`);
        },
    });

    // Link existing emails to contacts
    const linkEmails = trpc.messaging.linkEmailsToContacts.useMutation({
        onSuccess: (data) => {
            toast.success(`Linked ${data.linked} contacts to emails`);
            utils.messaging.getContactEmails.invalidate();
        },
        onError: (error) => {
            toast.error(`Link failed: ${error.message}`);
        },
    });

    // Auto-sync emails every 5 minutes (optional - can be disabled if not needed)
    useEffect(() => {
        if (!emailAccounts || emailAccounts.length === 0) return;

        // Sync on mount
        const initialSync = () => {
            emailAccounts.forEach(account => {
                syncAllAccounts.mutate({ id: account.id });
            });
        };

        // Set up interval for periodic sync (5 minutes)
        const intervalId = setInterval(() => {
            initialSync();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(intervalId);
    }, [emailAccounts]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <h1 className="text-3xl font-bold text-black dark:text-white">
                    Messages
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    All your conversations in one place
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6">
                    <TabsList className="bg-transparent">
                        <TabsTrigger value="email" className="gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                        </TabsTrigger>
                        <TabsTrigger value="whatsapp" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Email Tab */}
                <TabsContent value="email" className="flex-1 m-0">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            {/* Sync Button Header */}
                            {emailAccounts && emailAccounts.length > 0 && (
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-semibold">All Emails</h2>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => linkEmails.mutate()}
                                            variant="outline"
                                            size="sm"
                                            disabled={linkEmails.isPending}
                                            title="Link existing emails to contacts"
                                        >
                                            <Link className={`h-4 w-4 mr-2 ${linkEmails.isPending ? 'animate-spin' : ''}`} />
                                            Link to Contacts
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                // Sync all accounts
                                                emailAccounts.forEach(account => {
                                                    syncAllAccounts.mutate({ id: account.id });
                                                });
                                            }}
                                            variant="outline"
                                            size="sm"
                                            disabled={syncAllAccounts.isPending}
                                        >
                                            <RefreshCw className={`h-4 w-4 mr-2 ${syncAllAccounts.isPending ? 'animate-spin' : ''}`} />
                                            Sync Emails
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!emailAccounts || emailAccounts.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Mail className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No email accounts connected</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Connect your email accounts to start seeing messages here.
                                        </p>
                                        <a href="/settings/integrations/email" className="text-primary hover:underline">
                                            Go to Email Settings →
                                        </a>
                                    </CardContent>
                                </Card>
                            ) : isLoading ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : !allEmails || allEmails.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Mail className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No emails yet</h3>
                                        <p className="text-muted-foreground">
                                            Email messages will appear here once they're synced.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {allEmails.map((email: any) => (
                                        <EmailMessage key={email.id} email={email} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* WhatsApp Tab */}
                <TabsContent value="whatsapp" className="flex-1 m-0">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">WhatsApp coming soon</h3>
                                    <p className="text-muted-foreground">
                                        WhatsApp integration is planned for a future release.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
