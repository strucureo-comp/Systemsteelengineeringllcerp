'use client';

import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings-context';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency as formatCurrencyValue } from '@/lib/utils/currency';

interface DocumentLine {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    total?: number;
}

interface BrandedDocumentPreviewProps {
    type: 'invoice' | 'quotation' | 'po';
    number: string;
    date?: string;
    issueDate?: string;
    dueDate?: string;
    validUntil?: string;
    
    // Client/Entity Details
    entityName?: string;
    entityAddress?: string;
    entityTaxId?: string;
    entityEmail?: string;
    
    // Company Details (can override from settings)
    companyName?: string;
    companyAddress?: string;
    companyTaxId?: string;
    companyPhone?: string;
    companyEmail?: string;
    
    // Line items
    lines: DocumentLine[];
    
    // Financial
    totals: {
        subtotal: number;
        discount?: number;
        tax: number;
        additionalCharges?: number;
        total: number;
    };
    
    // Additional info
    currency?: string;
    paymentTerms?: string;
    paymentMethod?: string;
    notes?: string;
    termsConditions?: string;
    additionalChargesDescription?: string;
}

export function BrandedDocumentPreview({ 
    type, 
    number, 
    date = new Date().toISOString(),
    issueDate,
    dueDate,
    validUntil,
    entityName,
    entityAddress,
    entityTaxId,
    entityEmail,
    companyName: overrideCompanyName,
    companyAddress: overrideCompanyAddress,
    companyTaxId: overrideCompanyTaxId,
    companyPhone: overrideCompanyPhone,
    companyEmail: overrideCompanyEmail,
    lines, 
    totals, 
    currency: overrideCurrency,
    paymentTerms,
    paymentMethod,
    notes,
    termsConditions,
    additionalChargesDescription,
}: BrandedDocumentPreviewProps) {
    const { settings: pdfSettings } = useSettings();
    const {
        companyName: settingsCompanyName,
        address,
        phone,
        email,
        taxId,
        baseCurrency,
        logo,
        footerText,
    } = useCompanySettings();

    // Use override values or fall back to settings
    const companyName = overrideCompanyName || settingsCompanyName;
    const companyAddress = overrideCompanyAddress || address;
    const companyTaxId = overrideCompanyTaxId || taxId;
    const companyPhone = overrideCompanyPhone || phone;
    const companyEmail = overrideCompanyEmail || email;
    const currency = overrideCurrency || baseCurrency;

    const titles = {
        invoice: 'TAX INVOICE',
        quotation: 'QUOTATION',
        po: 'PURCHASE ORDER'
    };

    const paymentTermsLabels: Record<string, string> = {
        'immediate': 'Due on Receipt',
        'net_7': 'Net 7 Days',
        'net_15': 'Net 15 Days',
        'net_30': 'Net 30 Days',
        'net_60': 'Net 60 Days',
        'net_90': 'Net 90 Days',
    };

    const paymentMethodLabels: Record<string, string> = {
        'bank_transfer': 'Bank Transfer',
        'credit_card': 'Credit Card',
        'cash': 'Cash',
        'cheque': 'Cheque',
        'online': 'Online Payment',
    };

    const formatCurrency = (amount: number) => {
        return formatCurrencyValue(amount, currency);
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
                        {logo || pdfSettings.logoUrl ? (
                            <img src={logo || pdfSettings.logoUrl} alt={companyName} className="h-full w-full object-contain" />
                        ) : (
                            <div className="flex h-16 w-24 items-center justify-center rounded-md bg-muted px-2 text-center text-xs font-medium text-muted-foreground">
                                {companyName}
                            </div>
                        )}
                    </div>
                    <div className={cn(
                        "space-y-0.5 text-left"
                    )}>
                        <h1 className="text-xl font-black tracking-tighter uppercase">{companyName}</h1>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Global Engineering Solutions</p>
                        <p className="text-[8px] text-muted-foreground uppercase">{companyAddress}</p>
                        {companyTaxId && <p className="text-[8px] font-black text-foreground">TRN: {companyTaxId}</p>}
                        {companyPhone && <p className="text-[8px] text-muted-foreground">Tel: {companyPhone}</p>}
                        {companyEmail && <p className="text-[8px] text-muted-foreground">{companyEmail}</p>}
                    </div>
                </div>
                <div className={cn(
                    "space-y-1 text-right"
                )}>
                    <h2 className="text-4xl font-black text-foreground tracking-tighter mb-2">{titles[type]}</h2>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Document No</p>
                        <p className="text-sm font-black font-mono" style={{ color: pdfSettings.accentColor || '#ef4444' }}>{number}</p>
                        {issueDate && (
                            <>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Issue Date</p>
                                <p className="text-xs font-bold">{format(new Date(issueDate), 'dd MMMM yyyy')}</p>
                            </>
                        )}
                        {dueDate && (
                            <>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Due Date</p>
                                <p className="text-xs font-bold">{format(new Date(dueDate), 'dd MMMM yyyy')}</p>
                            </>
                        )}
                        {validUntil && (
                            <>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Valid Until</p>
                                <p className="text-xs font-bold">{format(new Date(validUntil), 'dd MMMM yyyy')}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Entities */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] border-b pb-1">
                        {type === 'po' ? 'Supplier Entity' : 'Bill To'}
                    </h3>
                    <div className="space-y-1">
                        <p className="text-sm font-black uppercase">{entityName || 'TARGET-ENTITY-NOT-SELECTED'}</p>
                        {entityAddress && <p className="text-[10px] text-muted-foreground whitespace-pre-line">{entityAddress}</p>}
                        {entityEmail && <p className="text-[10px] text-muted-foreground">{entityEmail}</p>}
                        {entityTaxId && (
                            <p className="text-[10px] font-bold text-foreground mt-2">TRN: {entityTaxId}</p>
                        )}
                    </div>
                </div>
                <div className="space-y-4 text-right">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] border-b pb-1">
                        Payment Details
                    </h3>
                    <div className="space-y-1">
                        {paymentTerms && (
                            <>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Terms</p>
                                <p className="text-sm font-black uppercase">{paymentTermsLabels[paymentTerms] || paymentTerms}</p>
                            </>
                        )}
                        {paymentMethod && (
                            <>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-2">Method</p>
                                <p className="text-xs font-bold">{paymentMethodLabels[paymentMethod] || paymentMethod}</p>
                            </>
                        )}
                        {dueDate && (
                            <>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-2">Payment Due</p>
                                <p className="text-xs font-bold text-rose-600">{format(new Date(dueDate), 'dd MMM yyyy')}</p>
                            </>
                        )}
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
                            {lines.some(l => l.tax_rate) && (
                                <th className="py-2.5 px-4 text-center text-[9px] font-black uppercase tracking-widest">Tax %</th>
                            )}
                            <th className="py-2.5 px-4 text-right text-[9px] font-black uppercase tracking-widest rounded-tr-sm">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border border-b-2 border-zinc-900">
                        {lines.map((line, index) => (
                            <tr key={index}>
                                <td className="py-4 px-4 text-xs font-bold uppercase">{line.description || 'Service/Material Specification'}</td>
                                <td className="py-4 px-4 text-center text-xs font-medium">{line.quantity}</td>
                                <td className="py-4 px-4 text-right text-xs font-medium">{formatCurrency(line.unit_price)}</td>
                                {lines.some(l => l.tax_rate) && (
                                    <td className="py-4 px-4 text-center text-xs font-medium">{line.tax_rate || 0}%</td>
                                )}
                                <td className="py-4 px-4 text-right text-xs font-black">{formatCurrency(line.total || (line.quantity * line.unit_price))}</td>
                            </tr>
                        ))}
                        {lines.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">
                                    No items specified in draft
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Financial Summary */}
            <div className="mt-8 flex justify-end">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span className="text-foreground">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    {totals.discount && totals.discount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                            <span>Discount</span>
                            <span>-{formatCurrency(totals.discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Tax / VAT</span>
                        <span className="text-foreground">{formatCurrency(totals.tax)}</span>
                    </div>
                    {totals.additionalCharges && totals.additionalCharges > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <span>{additionalChargesDescription || 'Additional Charges'}</span>
                            <span className="text-foreground">{formatCurrency(totals.additionalCharges)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center bg-foreground text-card-foreground p-4 rounded-sm mt-4">
                        <span className="text-[10px] font-black uppercase tracking-widest">Total Amount Due</span>
                        <span className="text-lg font-black">{formatCurrency(totals.total)}</span>
                    </div>
                </div>
            </div>

            {/* Legal / Notes */}
            <div className="mt-12 grid grid-cols-2 gap-12 pt-8 border-t border-border">
                <div className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        {termsConditions ? 'Terms & Conditions' : 'Notes & Policy'}
                    </h4>
                    <p className="text-[8px] text-muted-foreground leading-relaxed uppercase font-medium whitespace-pre-line">
                        {termsConditions || notes || 'Standard terms and conditions apply to all transactions.'}
                    </p>
                </div>
                <div className="flex flex-col items-end justify-end space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-6 w-6 opacity-50" style={{ color: pdfSettings.accentColor || '#ef4444' }} />
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Verification ID</span>
                    </div>
                    <div className="h-px w-32 bg-zinc-200"></div>
                    <p className="text-[9px] font-black uppercase">{companyName}</p>
                    <p className="text-[8px] text-muted-foreground uppercase">Authorized Signatory</p>
                </div>
            </div>

            <div className="mt-8 border-t border-border pt-4 text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                {footerText || `${companyName} | This is a computer-generated document`}
            </div>
        </div>
    );
}
