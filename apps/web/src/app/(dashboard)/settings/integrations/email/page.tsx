"use client";

import { EmailAccountForm } from "@/components/settings/email-account-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Loader2, Trash2, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function EmailIntegrationsPage() {
    const [showForm, setShowForm] = useState(false);
    const utils = trpc.useUtils();

    const { data: accounts, isLoading } = trpc.emailSettings.list.useQuery();

    const deleteAccount = trpc.emailSettings.delete.useMutation({
        onSuccess: () => {
            toast.success("Account removed");
            utils.emailSettings.list.invalidate();
        },
    });

    const syncAccount = trpc.emailSettings.syncNow.useMutation({
        onSuccess: () => {
            toast.success("Email sync started");
            utils.emailSettings.list.invalidate();
        },
        onError: (error) => {
            toast.error(`Sync failed: ${error.message}`);
        },
    });

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Email Integrations</h1>
                    <p className="text-muted-foreground">
                        Connect your email accounts to sync conversations with contacts.
                    </p>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Connect New Account
                    </Button>
                )}
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Connect Email Account</CardTitle>
                        <CardDescription>
                            Enter your IMAP and SMTP settings. For Gmail, use an App Password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EmailAccountForm onSuccess={() => {
                            setShowForm(false);
                            utils.emailSettings.list.invalidate();
                        }} />
                        <Button variant="ghost" className="mt-4" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                <h2 className="text-xl font-semibold">Connected Accounts</h2>
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : accounts?.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <Mail className="h-10 w-10 mb-4 opacity-50" />
                            <p>No email accounts connected yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {accounts?.map((account: any) => (
                            <Card key={account.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {account.provider?.toUpperCase() || 'IMAP'}
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => syncAccount.mutate({ id: account.id })}
                                            disabled={syncAccount.isPending}
                                            title="Sync emails now"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${syncAccount.isPending ? 'animate-spin' : ''}`} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive/90"
                                            onClick={() => deleteAccount.mutate({ id: account.id })}
                                            disabled={deleteAccount.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold truncate" title={account.email_address}>
                                        {account.email_address}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        IMAP: {account.imap_host}:{account.imap_port}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Status: <span className={account.sync_status === 'error' ? 'text-red-500' : 'text-green-500'}>
                                            {account.sync_status || 'active'}
                                        </span>
                                    </p>
                                    {account.error_message && (
                                        <p className="text-xs text-red-500 mt-1 truncate" title={account.error_message}>
                                            {account.error_message}
                                        </p>
                                    )}
                                    {account.last_synced_at && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Last synced: {new Date(account.last_synced_at).toLocaleString()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
