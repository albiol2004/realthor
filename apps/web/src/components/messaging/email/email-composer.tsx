"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Send, Loader2, Paperclip, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailComposerProps {
    defaultTo?: string;
    defaultSubject?: string;
    defaultBody?: string;
    onClose?: () => void;
}

interface FileAttachment {
    file: File;
    base64: string;
}

export function EmailComposer({
    defaultTo = "",
    defaultSubject = "",
    defaultBody = "",
    onClose,
}: EmailComposerProps) {
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [selectedFrom, setSelectedFrom] = useState("");

    // Recipients state
    const [toInput, setToInput] = useState(""); // Don't pre-fill input, only badges
    const [toEmails, setToEmails] = useState<string[]>(defaultTo ? [defaultTo] : []);
    const [ccInput, setCcInput] = useState("");
    const [ccEmails, setCcEmails] = useState<string[]>([]);
    const [bccInput, setBccInput] = useState("");
    const [bccEmails, setBccEmails] = useState<string[]>([]);
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);

    // Search state
    const [toSearchQuery, setToSearchQuery] = useState("");
    const [ccSearchQuery, setCcSearchQuery] = useState("");
    const [bccSearchQuery, setBccSearchQuery] = useState("");
    const [showToDropdown, setShowToDropdown] = useState(false);
    const [showCcDropdown, setShowCcDropdown] = useState(false);
    const [showBccDropdown, setShowBccDropdown] = useState(false);

    // Attachments
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Refs for dropdown containers (for click-outside detection)
    const toDropdownRef = useRef<HTMLDivElement>(null);
    const ccDropdownRef = useRef<HTMLDivElement>(null);
    const bccDropdownRef = useRef<HTMLDivElement>(null);

    const { data: emailAccounts } = trpc.emailSettings.list.useQuery();

    // Fetch all contacts for search
    const { data: contactsData } = trpc.contacts.list.useQuery({
        sortBy: 'firstName',
        sortOrder: 'asc',
        limit: 1000,
        offset: 0,
    });

    const contacts = contactsData?.contacts || [];

    // Click outside handler to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toDropdownRef.current && !toDropdownRef.current.contains(event.target as Node)) {
                setShowToDropdown(false);
            }
            if (ccDropdownRef.current && !ccDropdownRef.current.contains(event.target as Node)) {
                setShowCcDropdown(false);
            }
            if (bccDropdownRef.current && !bccDropdownRef.current.contains(event.target as Node)) {
                setShowBccDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fuzzy search function
    const fuzzySearch = (query: string, contacts: any[]) => {
        if (!query.trim()) return contacts;

        const lowerQuery = query.toLowerCase().trim();
        const terms = lowerQuery.split(/\s+/);

        return contacts.filter(contact => {
            const searchableText = [
                contact.firstName,
                contact.lastName,
                contact.email,
                contact.company,
            ].filter(Boolean).join(' ').toLowerCase();

            // All terms must match somewhere in the searchable text
            return terms.every(term => searchableText.includes(term));
        }).slice(0, 10); // Limit to 10 results
    };

    // Filtered contacts based on search
    const toSearchResults = useMemo(() =>
        fuzzySearch(toSearchQuery, contacts.filter(c => c.email))
    , [toSearchQuery, contacts]);

    const ccSearchResults = useMemo(() =>
        fuzzySearch(ccSearchQuery, contacts.filter(c => c.email))
    , [ccSearchQuery, contacts]);

    const bccSearchResults = useMemo(() =>
        fuzzySearch(bccSearchQuery, contacts.filter(c => c.email))
    , [bccSearchQuery, contacts]);

    // Add email to recipient list
    const addEmail = (email: string, type: 'to' | 'cc' | 'bcc') => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            toast.error("Invalid email address");
            return;
        }

        if (type === 'to') {
            if (!toEmails.includes(trimmedEmail)) {
                setToEmails([...toEmails, trimmedEmail]);
            }
            setToInput("");
            setToSearchQuery("");
            setShowToDropdown(false);
        } else if (type === 'cc') {
            if (!ccEmails.includes(trimmedEmail)) {
                setCcEmails([...ccEmails, trimmedEmail]);
            }
            setCcInput("");
            setCcSearchQuery("");
            setShowCcDropdown(false);
        } else {
            if (!bccEmails.includes(trimmedEmail)) {
                setBccEmails([...bccEmails, trimmedEmail]);
            }
            setBccInput("");
            setBccSearchQuery("");
            setShowBccDropdown(false);
        }
    };

    // Remove email from recipient list
    const removeEmail = (email: string, type: 'to' | 'cc' | 'bcc') => {
        if (type === 'to') {
            setToEmails(toEmails.filter(e => e !== email));
        } else if (type === 'cc') {
            setCcEmails(ccEmails.filter(e => e !== email));
        } else {
            setBccEmails(bccEmails.filter(e => e !== email));
        }
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: FileAttachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 10MB limit per file
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name} is too large (max 10MB)`);
                continue;
            }

            // Convert to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => {
                    const base64 = reader.result as string;
                    // Remove data:mime/type;base64, prefix
                    const base64Data = base64.split(',')[1];
                    resolve(base64Data);
                };
                reader.readAsDataURL(file);
            });

            const base64 = await base64Promise;
            newAttachments.push({ file, base64 });
        }

        setAttachments([...attachments, ...newAttachments]);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const sendEmail = trpc.emailSettings.sendEmail.useMutation({
        onSuccess: () => {
            toast.success("Email sent successfully");
            setSubject("");
            setBody("");
            setToEmails([]);
            setCcEmails([]);
            setBccEmails([]);
            setAttachments([]);
            if (onClose) onClose();
        },
        onError: (error) => {
            toast.error(`Failed to send email: ${error.message}`);
        },
    });

    const handleSend = () => {
        if (!selectedFrom) {
            toast.error("Please select an email account");
            return;
        }

        if (toEmails.length === 0) {
            toast.error("Please add at least one recipient");
            return;
        }

        if (!subject.trim()) {
            toast.error("Please enter a subject");
            return;
        }

        if (!body.trim()) {
            toast.error("Please enter a message");
            return;
        }

        sendEmail.mutate({
            accountId: selectedFrom,
            to: toEmails,
            cc: ccEmails.length > 0 ? ccEmails : undefined,
            bcc: bccEmails.length > 0 ? bccEmails : undefined,
            subject,
            body,
            attachments: attachments.length > 0 ? attachments.map(att => ({
                filename: att.file.name,
                content: att.base64,
                contentType: att.file.type,
            })) : undefined,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>New Email</CardTitle>
                <CardDescription>Compose and send an email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* From */}
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

                {/* To */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>To</Label>
                        <div className="flex gap-2">
                            {!showCc && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => setShowCc(true)}
                                >
                                    Cc
                                </Button>
                            )}
                            {!showBcc && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => setShowBcc(true)}
                                >
                                    Bcc
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[42px]">
                        {toEmails.map(email => (
                            <Badge key={email} variant="secondary" className="gap-1">
                                {email}
                                <button
                                    onClick={() => removeEmail(email, 'to')}
                                    className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                        <div ref={toDropdownRef} className="relative flex-1 min-w-[200px]">
                            <Input
                                value={toInput}
                                onChange={(e) => {
                                    setToInput(e.target.value);
                                    setToSearchQuery(e.target.value);
                                    setShowToDropdown(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        addEmail(toInput, 'to');
                                    }
                                }}
                                onFocus={() => setShowToDropdown(true)}
                                placeholder="Type email or search contacts..."
                                className="border-0 shadow-none focus-visible:ring-0 h-8 px-0"
                            />
                            {showToDropdown && toSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                                    {toSearchResults.map(contact => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col"
                                            onClick={() => addEmail(contact.email!, 'to')}
                                        >
                                            <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                                            <span className="text-sm text-gray-500">{contact.email}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Type an email and press Enter or comma to add. Search contacts by name or email.
                    </p>
                </div>

                {/* Cc */}
                {showCc && (
                    <div className="space-y-2">
                        <Label>Cc</Label>
                        <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[42px]">
                            {ccEmails.map(email => (
                                <Badge key={email} variant="secondary" className="gap-1">
                                    {email}
                                    <button
                                        onClick={() => removeEmail(email, 'cc')}
                                        className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            <div ref={ccDropdownRef} className="relative flex-1 min-w-[200px]">
                                <Input
                                    value={ccInput}
                                    onChange={(e) => {
                                        setCcInput(e.target.value);
                                        setCcSearchQuery(e.target.value);
                                        setShowCcDropdown(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            addEmail(ccInput, 'cc');
                                        }
                                    }}
                                    onFocus={() => setShowCcDropdown(true)}
                                    placeholder="Type email or search contacts..."
                                    className="border-0 shadow-none focus-visible:ring-0 h-8 px-0"
                                />
                                {showCcDropdown && ccSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                                        {ccSearchResults.map(contact => (
                                            <button
                                                key={contact.id}
                                                type="button"
                                                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col"
                                                onClick={() => addEmail(contact.email!, 'cc')}
                                            >
                                                <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                                                <span className="text-sm text-gray-500">{contact.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bcc */}
                {showBcc && (
                    <div className="space-y-2">
                        <Label>Bcc</Label>
                        <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[42px]">
                            {bccEmails.map(email => (
                                <Badge key={email} variant="secondary" className="gap-1">
                                    {email}
                                    <button
                                        onClick={() => removeEmail(email, 'bcc')}
                                        className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            <div ref={bccDropdownRef} className="relative flex-1 min-w-[200px]">
                                <Input
                                    value={bccInput}
                                    onChange={(e) => {
                                        setBccInput(e.target.value);
                                        setBccSearchQuery(e.target.value);
                                        setShowBccDropdown(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            addEmail(bccInput, 'bcc');
                                        }
                                    }}
                                    onFocus={() => setShowBccDropdown(true)}
                                    placeholder="Type email or search contacts..."
                                    className="border-0 shadow-none focus-visible:ring-0 h-8 px-0"
                                />
                                {showBccDropdown && bccSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                                        {bccSearchResults.map(contact => (
                                            <button
                                                key={contact.id}
                                                type="button"
                                                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col"
                                                onClick={() => addEmail(contact.email!, 'bcc')}
                                            >
                                                <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                                                <span className="text-sm text-gray-500">{contact.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Subject */}
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                        id="subject"
                        placeholder="Email subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>

                {/* Body */}
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

                {/* Attachments */}
                {attachments.length > 0 && (
                    <div className="space-y-2">
                        <Label>Attachments</Label>
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((att, index) => (
                                <Badge key={index} variant="outline" className="gap-2 pr-1">
                                    <Paperclip className="h-3 w-3" />
                                    <span className="text-xs">{att.file.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        ({(att.file.size / 1024).toFixed(1)}KB)
                                    </span>
                                    <button
                                        onClick={() => removeAttachment(index)}
                                        className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Paperclip className="h-4 w-4 mr-2" />
                            Attach File
                        </Button>
                    </div>
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
