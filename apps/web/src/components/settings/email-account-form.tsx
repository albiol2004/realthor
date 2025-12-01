"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    emailAddress: z.string().email(),
    imapHost: z.string().min(1, "IMAP Host is required"),
    imapPort: z.number().int().positive(),
    imapUser: z.string().min(1, "IMAP User is required"),
    imapPassword: z.string().min(1, "IMAP Password is required"),
    smtpHost: z.string().min(1, "SMTP Host is required"),
    smtpPort: z.number().int().positive(),
    smtpUser: z.string().min(1, "SMTP User is required"),
    smtpPassword: z.string().min(1, "SMTP Password is required"),
});

export function EmailAccountForm({ onSuccess }: { onSuccess: () => void }) {
    const [isTesting, setIsTesting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            emailAddress: "",
            imapHost: "imap.gmail.com",
            imapPort: 993,
            imapUser: "",
            imapPassword: "",
            smtpHost: "smtp.gmail.com",
            smtpPort: 465,
            smtpUser: "",
            smtpPassword: "",
        },
    });

    const createAccount = trpc.emailSettings.create.useMutation({
        onSuccess: () => {
            toast.success("Email account connected successfully");
            form.reset();
            onSuccess();
        },
        onError: (error) => {
            toast.error(`Failed to connect account: ${error.message}`);
        },
    });

    const testConnection = trpc.emailSettings.testConnection.useMutation({
        onSuccess: () => {
            toast.success("Connection successful!");
        },
        onError: (error) => {
            toast.error(`Connection failed: ${error.message}`);
        },
    });

    async function onTestConnection() {
        const values = form.getValues();
        if (!values.imapHost || !values.imapUser || !values.imapPassword) {
            toast.error("Please fill in IMAP details to test connection");
            return;
        }

        setIsTesting(true);
        try {
            await testConnection.mutateAsync({
                imapHost: values.imapHost,
                imapPort: values.imapPort,
                imapUser: values.imapUser,
                imapPassword: values.imapPassword,
            });
        } finally {
            setIsTesting(false);
        }
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        createAccount.mutate(values);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">IMAP Settings (Incoming)</h3>
                        <FormField
                            control={form.control}
                            name="emailAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="you@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="imapHost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IMAP Host</FormLabel>
                                        <FormControl>
                                            <Input placeholder="imap.gmail.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="imapPort"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Port</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 993)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="imapUser"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="imapPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Use App Password if 2FA is enabled.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">SMTP Settings (Outgoing)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="smtpHost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Host</FormLabel>
                                        <FormControl>
                                            <Input placeholder="smtp.gmail.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="smtpPort"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Port</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 465)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="smtpUser"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="smtpPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onTestConnection}
                        disabled={isTesting || createAccount.isPending}
                    >
                        {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Test Connection
                    </Button>
                    <Button type="submit" disabled={createAccount.isPending}>
                        {createAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect Account
                    </Button>
                </div>
            </form>
        </Form>
    );
}
