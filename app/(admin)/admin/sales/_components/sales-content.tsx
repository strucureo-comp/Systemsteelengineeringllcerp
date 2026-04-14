"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getQuotes, createSalesOrder, getPriceLists, createPriceList } from "@/lib/api";
import { format } from "date-fns";
import { CheckCircle, FileText, ArrowRight, Tag, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

export function QuotesList() {
    const { baseCurrency } = useCompanySettings();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadQuotes();
    }, []);

    async function loadQuotes() {
        try {
            const data = await getQuotes();
            setQuotes(data || []);
        } catch (error) {
            toast.error("Failed to load quotes");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleConvertToOrder(quote: any) {
        try {
            await createSalesOrder({
                quote_id: quote.id,
                account_id: quote.account_id,
                project_id: quote.project_id,
                total_amount: quote.total_amount,
                lines: quote.lines
            });
            toast.success("Quote converted to Sales Order");
            loadQuotes();
        } catch (error) {
            toast.error("Failed to convert quote");
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const activeQuotes = quotes.filter(q => q.status === 'draft' || q.status === 'sent');
    const convertedQuotes = quotes.filter(q => q.status === 'converted');

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeQuotes.length}</div>
                        <p className="text-xs text-muted-foreground">Waiting for acceptance</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Converted</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{convertedQuotes.length}</div>
                        <p className="text-xs text-muted-foreground">To sales orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(quotes.reduce((sum, q) => sum + Number(q.total_amount || 0), 0), baseCurrency)}
                        </div>
                        <p className="text-xs text-muted-foreground">All quotes</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quotes Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Quotes</CardTitle>
                        <CardDescription>Manage customer estimates and convert to orders</CardDescription>
                    </div>
                    <Button onClick={() => router.push('/admin/sales/quotations')}>
                        <Plus className="h-4 w-4 mr-2" /> New Quote
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quote #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.map((quote) => (
                                <TableRow key={quote.id}>
                                    <TableCell className="font-medium">{quote.number}</TableCell>
                                    <TableCell>{quote.account?.name}</TableCell>
                                    <TableCell>{quote.project?.title || '-'}</TableCell>
                                    <TableCell>{format(new Date(quote.issue_date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell>{formatCurrency(Number(quote.total_amount), baseCurrency)}</TableCell>
                                    <TableCell>
                                        <Badge variant={quote.status === 'converted' ? 'default' : 'outline'}>
                                            {quote.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {quote.status !== 'converted' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleConvertToOrder(quote)}
                                            >
                                                Convert <ArrowRight className="ml-2 h-3 w-3" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {quotes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No quotes found. Create your first quote to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export function PriceListsContent() {
    const { baseCurrency } = useCompanySettings();
    const [lists, setLists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");

    useEffect(() => { loadLists(); }, []);

    async function loadLists() {
        try {
            setIsLoading(true);
            const data = await getPriceLists();
            setLists(data || []);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreate() {
        if (!newName) return;
        try {
            await createPriceList({ name: newName, currency: baseCurrency, items: [] });
            toast.success("Price List Created");
            setIsCreateOpen(false);
            setNewName("");
            loadLists();
        } catch (e) { toast.error("Failed to create price list"); }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Price Lists</CardTitle>
                    <CardDescription>Manage standard, VIP, and wholesale pricing strategies</CardDescription>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> New Price List</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Price List</DialogTitle>
                            <DialogDescription>Define a new pricing tier for your products</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label>Name</Label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. Wholesale 2025"
                                className="mt-1.5"
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lists.map((list) => (
                            <TableRow key={list.id}>
                                <TableCell className="font-medium">{list.name}</TableCell>
                                <TableCell>{list.currency}</TableCell>
                                <TableCell>{list.items?.length || 0} Products</TableCell>
                                <TableCell><Badge variant="outline">Active</Badge></TableCell>
                            </TableRow>
                        ))}
                        {lists.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No price lists found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
