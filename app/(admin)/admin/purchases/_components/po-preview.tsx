'use client';

import { format } from 'date-fns';
import { useTenant } from '@/lib/tenant-context';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency';
import { useEffect } from 'react';

interface POPreviewProps {
    data: any;
}

export function POPreview({ data }: POPreviewProps) {
    const { baseCurrency, companyName, address, phone, email, logo, taxName, taxRate, footerText } = useCompanySettings();
    const { companyProfile } = useTenant();
    const branding = companyProfile?.branding;

    useEffect(() => {
        const handler = () => window.location.reload();
        window.addEventListener('erp_company_settings_changed', handler);
        return () => window.removeEventListener('erp_company_settings_changed', handler);
    }, []);

    const companyAddress = address;
    const companyPhone = phone;
    const companyEmail = email;
    const currency = baseCurrency;

    const formatCurrency = (amount: number) => {
        return formatCurrencyUtil(amount, currency);
    };

    return (
        <div className={cn(
            "bg-card text-foreground p-12 shadow-2xl border border-border aspect-[1/1.414] w-full max-w-[800px] mx-auto flex flex-col relative overflow-hidden font-sans"
        )}>
            {/* Header Area */}
            <div className={cn(
                "flex border-b-2 border-zinc-900 pb-8 mb-10 flex-row justify-between items-start"
            )}>
                <div className="space-y-2">
                    <div className={cn(
                        "h-16 w-32 flex items-center mb-4 overflow-hidden justify-start"
                    )}>
                        {logo ? (
                            <img src={logo} alt={companyName} className="h-full w-full object-contain" />
                        ) : (
                            <div className="h-16 w-16 bg-foreground flex items-center justify-center rounded-md">
                                <img src={logo || "/logo_trans_(4884x4884)px_for_white_bg.png"} alt={companyName} className="invert" />
                            </div>
                        )}
                    </div>
                    <div className={cn(
                        "space-y-0.5 text-left"
                    )}>
                        <h1 className="text-xl font-black tracking-tighter uppercase">{companyName}</h1>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Global Engineering Solutions</p>
                        <p className="text-[8px] text-muted-foreground uppercase">{companyAddress}</p>
                        {companyPhone && <p className="text-[8px] text-muted-foreground">Tel: {companyPhone}</p>}
                        {companyEmail && <p className="text-[8px] text-muted-foreground">{companyEmail}</p>}
                    </div>
                </div>
                <div className={cn(
                    "space-y-1 text-right"
                )}>
                    <h2 className="text-4xl font-black text-foreground tracking-tighter mb-2">PURCHASE ORDER</h2>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">PO Number</p>
                        <p className="text-sm font-black font-mono text-red-600">{data.po_number || 'DRAFT'}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Date</p>
                        <p className="text-xs font-bold">{format(new Date(), 'dd MMMM yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* Entities */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] border-b pb-1">Supplier Entity</h3>
                    <div className="space-y-1">
                        <p className="text-sm font-black uppercase">{data.vendor_name || 'TARGET-VENDOR-NOT-SELECTED'}</p>
                        {data.vendor_address && <p className="text-[10px] text-muted-foreground whitespace-pre-line">{data.vendor_address}</p>}
                        {data.vendor_email && <p className="text-[10px] text-muted-foreground">{data.vendor_email}</p>}
                    </div>
                </div>
                <div className="space-y-4 text-right">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] border-b pb-1">Ship To</h3>
                    <div className="space-y-1 text-[10px]">
                        <p className="font-black uppercase">{companyName}</p>
                        <p className="text-muted-foreground whitespace-pre-line">{companyAddress}</p>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
                <table className="w-full">
                    <thead>
                        <tr className="bg-foreground text-card-foreground">
                            <th className="py-2.5 px-4 text-left text-[9px] font-black uppercase tracking-widest rounded-tl-sm">Description</th>
                            <th className="py-2.5 px-4 text-center text-[9px] font-black uppercase tracking-widest">Qty</th>
                            <th className="py-2.5 px-4 text-right text-[9px] font-black uppercase tracking-widest">Unit Price</th>
                            <th className="py-2.5 px-4 text-right text-[9px] font-black uppercase tracking-widest rounded-tr-sm">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border border-b-2 border-zinc-900">
                        {data.items?.map((item: any, index: number) => (
                            <tr key={index}>
                                <td className="py-4 px-4 text-xs font-bold uppercase">{item.description}</td>
                                <td className="py-4 px-4 text-center text-xs font-medium">{item.quantity}</td>
                                <td className="py-4 px-4 text-right text-xs font-medium">{formatCurrency(item.unit_price)}</td>
                                <td className="py-4 px-4 text-right text-xs font-black">{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Financial Summary */}
            <div className="mt-8 flex justify-end">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span className="text-foreground">{formatCurrency(data.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Tax / VAT</span>
                        <span className="text-foreground">{formatCurrency(data.tax_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-foreground text-card-foreground p-4 rounded-sm mt-4">
                        <span className="text-[10px] font-black uppercase tracking-widest">Total PO Amount</span>
                        <span className="text-lg font-black">{formatCurrency(data.total_amount || 0)}</span>
                    </div>
                </div>
            </div>

            {/* Footer Bar */}
            <div className="mt-12 pt-8 border-t border-border flex justify-between items-center text-xs font-semibold tracking-widest text-muted-foreground">
                <div>{companyName}</div>
                <div>{footerText || `${companyName} | This is a computer-generated document`}</div>
            </div>
        </div>
    );
}
