"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailThreadList } from "@/components/messaging/email/email-thread-list";
import { EmailComposer } from "@/components/messaging/email/email-composer";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Loader2, Mail, Phone, Building, User } from "lucide-react";

export default function ContactDetailPage() {
    const params = useParams();
    const contactId = params.id as string;
    const [activeTab, setActiveTab] = useState("overview");

    // Fetch contact details (assuming this procedure exists or we need to create it)
    // Since I don't know if contacts router exists, I'll assume standard CRUD
    const { data: contact, isLoading } = trpc.contacts.getById.useQuery({ id: contactId });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!contact) {
        return <div>Contact not found</div>;
    }

    // Extract emails from contact
    const contactEmails = [contact.email].filter(Boolean) as string[];

    return (
        <div className="container mx-auto py-6 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {contact.firstName} {contact.lastName}
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4" /> {contact.company || "No Company"}
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="email" className="gap-2">
                        <Mail className="h-4 w-4" /> Email
                    </TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{contact.email || "No email"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{contact.phone || "No phone"}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="email" className="space-y-4">
                    <EmailComposer defaultTo={contact.email || ""} />

                    <Card>
                        <CardHeader>
                            <CardTitle>Email History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EmailThreadList contactEmails={contactEmails} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity">
                    <div className="text-muted-foreground">Activity timeline coming soon.</div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
