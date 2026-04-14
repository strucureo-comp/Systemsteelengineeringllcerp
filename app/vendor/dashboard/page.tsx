'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';
import {
    ShoppingCart,
    Receipt,
    Clock,
    CheckCircle2,
    AlertCircle,
    Download,
    Eye,
    Plus,
    BarChart3,
    Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VendorDashboard() {
    const { baseCurrency } = useCompanySettings();
    const [orders, setOrders] = useState([
        { id: '1', po_number: 'PO-2024-001', date: '2024-03-10', amount: 15400, status: 'issued' },
        { id: '2', po_number: 'PO-2024-005', date: '2024-03-12', amount: 8200, status: 'partially_received' },
    ]);

    const [bills, setBills] = useState([
        { id: '1', bill_number: 'INV-9982', date: '2024-03-11', amount: 15400, status: 'pending' },
    ]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none">Global Trading Co.</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Vendor ID: VEN-1004 • Dubai, UAE</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9 font-bold text-[10px] uppercase">Profile Settings</Button>
                    <Button variant="ghost" size="sm" className="h-9 font-bold text-[10px] uppercase text-rose-600">Logout</Button>
                </div>
            </header>

            <main className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <SummaryCard title="Pending POs" value="2" icon={ShoppingCart} color="primary" />
                    <SummaryCard title="Unpaid Invoices" value={formatCurrency(15400, baseCurrency)} icon={Receipt} color="amber" />
                    <SummaryCard title="Total Sales (YTD)" value={formatCurrency(142000, baseCurrency)} icon={BarChart3} color="emerald" />
                    <SummaryCard title="Delivery Rating" value="98.4%" icon={CheckCircle2} color="slate" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Active Orders */}
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" /> Active Purchase Orders
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="text-[10px] font-black text-primary uppercase p-0">View All</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {orders.map(o => (
                                    <div key={o.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase text-slate-900">{o.po_number}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">{o.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-6">
                                            <div>
                                                <p className="text-xs font-black text-slate-900">AED {o.amount.toLocaleString()}</p>
                                                <Badge variant="outline" className="text-[8px] font-black uppercase border-none bg-blue-50 text-blue-600 px-1.5">{o.status}</Badge>
                                            </div>
                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                                                <Eye size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Invoice */}
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white border-b px-6 py-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-primary" /> Self-Service Billing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                <Plus className="h-8 w-8 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase">Submit New Invoice</h3>
                                <p className="text-[10px] text-slate-500 font-medium max-w-[240px] mt-2 leading-relaxed">
                                    Upload your signed invoice and matching GRN receipt to trigger automatic 3-way matching.
                                </p>
                            </div>
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] px-8 rounded-xl h-11">
                                Launch Upload Wizard
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
    return (
        <Card className="border-none shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
                <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    color === 'primary' ? "bg-primary/10 text-primary" :
                    color === 'amber' ? "bg-amber-100 text-amber-600" :
                    color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                    "bg-slate-100 text-slate-600"
                )}>
                    <Icon size={16} />
                </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-4">{value}</h3>
        </Card>
    );
}
