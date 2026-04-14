import { format } from 'date-fns';
import { Quote, AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import type { Quotation, QuotationItem, User } from '@/lib/db/types';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency';
import { useEffect } from 'react';

interface QuotationPreviewProps {
    data: Partial<Quotation>;
    client?: User | null;
}

export function QuotationPreview({ data, client }: QuotationPreviewProps) {
    const { baseCurrency, taxRate: settingsTaxRate, taxName, logo, companyName, footerText } = useCompanySettings();

    useEffect(() => {
        const handler = () => window.location.reload();
        window.addEventListener('erp_company_settings_changed', handler);
        return () => window.removeEventListener('erp_company_settings_changed', handler);
    }, []);

    const {
        quotation_number = 'DRAFT',
        rev_no,
        rev_date,
        created_at = new Date().toISOString(),
        valid_until,
        items = [],
        notes,
        terms_and_conditions,
        tax_mode = 'auto',
        tax_rate = settingsTaxRate,
        manual_tax_adjustment,
    } = data;

    const subtotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
    const taxAmount = tax_mode === 'manual' && manual_tax_adjustment !== undefined
        ? manual_tax_adjustment
        : subtotal * (tax_rate / 100);
    const totalAmount = subtotal + taxAmount;

    const formatCurrency = (amount: number) => {
        return formatCurrencyUtil(amount, baseCurrency);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            return format(new Date(dateStr), 'MM/dd/yyyy');
        } catch (e) {
            return dateStr;
        }
    };

    // Get T&C from form data
    const termsList = terms_and_conditions
        ? terms_and_conditions.split('\n').filter(t => t.trim())
        : [];

    return (
        <div className="bg-white text-black p-10 rounded-lg shadow-sm border h-full overflow-y-auto min-h-[842px] text-[11px] font-sans relative" id="quotation-preview">
            {/* Header */}
            <div className="flex justify-between items-start mb-10 pb-6 border-b border-gray-100">
                <div className="w-40 h-20 relative">
                    <img
                        src={logo || "/logo_trans_(4884x4884)px_for_white_bg.png"}
                        alt={companyName}
                        className="object-contain w-full h-full object-left"
                    />
                </div>
                <div className="text-right">
                    <h1 className="text-4xl font-black text-black mb-4 tracking-tighter">QUOTATION</h1>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                        <span className="font-bold uppercase text-[9px] text-gray-500">Quotation No:</span>
                        <span className="font-bold">{quotation_number}</span>

                        <span className="font-bold uppercase text-[9px] text-gray-500">Date:</span>
                        <span>{formatDate(created_at)}</span>

                        <span className="font-bold uppercase text-[9px] text-gray-500">Rev No:</span>
                        <span>{rev_no || '00'}</span>

                        <span className="font-bold uppercase text-[9px] text-gray-500">Rev Date:</span>
                        <span>{formatDate(rev_date)}</span>

                        <span className="font-bold uppercase text-[9px] text-gray-500">Valid Until:</span>
                        <span className="font-bold text-rose-600">{formatDate(valid_until)}</span>
                    </div>
                </div>
            </div>

            {/* Entity Boxes */}
            <div className="grid grid-cols-2 gap-10 mb-10">
                <div className="bg-gray-50/50 p-4 rounded-md border border-gray-100">
                    <h3 className="font-black text-[9px] uppercase tracking-widest text-gray-400 mb-3 border-b pb-1">Bill To</h3>
                    <div className="text-black space-y-0.5">
                        {data.client_is_company ? (
                            <>
                                <p className="font-bold text-sm text-primary">{data.client_company || 'Company Name'}</p>
                                {data.client_name && <p className="font-medium text-[10px]">Attn: {data.client_name}</p>}
                            </>
                        ) : (
                            <>
                                <p className="font-bold text-sm text-primary">{data.client_name || client?.full_name || 'Client Name'}</p>
                                {data.client_company && <p className="font-medium text-[10px]">{data.client_company}</p>}
                            </>
                        )}
                        <p className="whitespace-pre-wrap mt-2">{data.client_address || 'Address not specified'}</p>
                        {data.client_email && <p className="text-gray-600">{data.client_email}</p>}
                        {data.client_phone && <p className="text-gray-600">{data.client_phone}</p>}
                        {data.client_tax_id && <p className="text-[9px] font-mono mt-1">TRN: {data.client_tax_id}</p>}
                    </div>
                </div>
                <div className="bg-gray-50/50 p-4 rounded-md border border-gray-100">
                    <h3 className="font-black text-[9px] uppercase tracking-widest text-gray-400 mb-3 border-b pb-1">Ship To</h3>
                    <div className="text-black space-y-0.5">
                        {data.use_custom_ship_to ? (
                            <p className="whitespace-pre-wrap">{data.ship_to_address}</p>
                        ) : (
                            <div className="opacity-70">
                                <p className="font-bold text-[10px] mb-1 italic">Same as billing address:</p>
                                {data.client_is_company ? (
                                    <p className="font-bold">{data.client_company}</p>
                                ) : (
                                    <p className="font-bold">{data.client_name || client?.full_name}</p>
                                )}
                                <p className="whitespace-pre-wrap">{data.client_address}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Project Info */}
            {data.project_title && (
                <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-primary/5 border-l-4 border-primary rounded-r-md">
                    <span className="font-bold uppercase text-[9px] text-primary">Project:</span>
                    <span className="font-bold text-[10px]">{data.project_title}</span>
                </div>
            )}

            {/* Items Table */}
            <div className="mb-10">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-900 text-white uppercase text-[9px] tracking-widest">
                            <th className="py-3 px-4 text-left font-black w-10">#</th>
                            <th className="py-3 px-4 text-left font-black">Description & Specifications</th>
                            <th className="py-3 px-4 text-center font-black w-20">UOM</th>
                            <th className="py-3 px-4 text-center font-black w-20">Qty</th>
                            <th className="py-3 px-4 text-right font-black w-28">Unit Price</th>
                            <th className="py-3 px-4 text-right font-black w-28">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400 border-b">
                                    <AlertCircle className="mx-auto mb-2 opacity-20" size={32} />
                                    No items defined for this proposal
                                </td>
                            </tr>
                        ) : (
                            items.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100 group">
                                    <td className="py-4 px-4 align-top text-gray-400 font-mono">{index + 1}</td>
                                    <td className="py-4 px-4 align-top">
                                        <div className="font-bold text-black mb-1">
                                            {item.item_code ? `[${item.item_code}] ` : ''}{item.description}
                                        </div>
                                        {item.remarks && (
                                            <div className="text-[10px] text-gray-500 italic whitespace-pre-wrap ml-2 border-l-2 border-gray-100 pl-2 mt-1">
                                                {item.remarks}
                                            </div>
                                        )}
                                        {item.project && (
                                            <div className="text-[9px] text-primary mt-1 font-medium">Ref: {item.project}</div>
                                        )}
                                        {item.date_required && (
                                            <div className="text-[9px] text-gray-400 mt-0.5">Required By: {formatDate(item.date_required)}</div>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 align-top text-center uppercase font-medium">{item.uom || 'PCS'}</td>
                                    <td className="py-4 px-4 align-top text-center font-bold">{item.quantity}</td>
                                    <td className="py-4 px-4 align-top text-right font-medium">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-4 px-4 align-top text-right font-bold text-black">{formatCurrency(item.total)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-between items-start mb-10">
                <div className="w-1/2">
                    {notes && (
                        <div className="bg-gray-50 p-4 rounded-md border border-dashed border-gray-200">
                            <h4 className="font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2">Proposal Notes</h4>
                            <p className="text-black whitespace-pre-wrap text-[10px] italic leading-relaxed">{notes}</p>
                        </div>
                    )}
                </div>
                <div className="w-1/3 space-y-1">
                    <div className="flex justify-between py-2 text-gray-500 uppercase text-[10px] font-bold">
                        <span>Untaxed Amount</span>
                        <span className="text-black">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                        <span>{taxName} {tax_rate}%</span>
                        <span className="text-black">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between py-4 text-rose-600 uppercase text-xs font-black">
                        <span>Total</span>
                        <span className="text-lg">{formatCurrency(totalAmount)}</span>
                    </div>
                    {data.contact_person && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Contact Person</p>
                            <p className="font-bold text-black">{data.contact_person}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mb-12 pt-6 border-t border-gray-100">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-4">Terms & Conditions</h3>
                <div className="grid grid-cols-1 gap-2 text-[10px] text-gray-600">
                    {termsList.slice(0, 3).map((term, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="font-bold text-primary">{i + 1}.</span>
                            <span>{term}</span>
                        </div>
                    ))}
                    {termsList.length > 3 && (
                        <p className="text-[9px] font-bold text-primary italic mt-1 ml-6">+ {termsList.length - 3} more clauses as per company policy</p>
                    )}
                </div>
            </div>

            {/* Signatory Block */}
            <div className="grid grid-cols-2 gap-20 mt-20 mb-10">
                <div className="text-center">
                    <div className="h-16 flex items-end justify-center mb-2">
                        {/* Placeholder for signature */}
                        <div className="w-40 border-b border-gray-900"></div>
                    </div>
                    <p className="font-bold text-black uppercase text-[10px]">Prepared By</p>
                    <p className="text-gray-500 text-[9px]">AUTHORIZED SIGNATORY</p>
                </div>
                <div className="text-center">
                    <div className="h-16 flex items-end justify-center mb-2">
                        {/* Placeholder for signature */}
                        <div className="w-40 border-b border-gray-900"></div>
                    </div>
                    <p className="font-bold text-black uppercase text-[10px]">Approved By</p>
                    <p className="text-gray-500 text-[9px]">MANAGEMENT</p>
                </div>
            </div>

            {/* Footer Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gray-900 text-white flex items-center justify-between px-10 text-xs font-semibold tracking-widest rounded-b-lg">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-green-400" />
                    Auditor Approved
                </div>
                <div>
                    {footerText || `${companyName} | This is a computer-generated document`}
                </div>
                <div>
                    {companyName}
                </div>
            </div>
        </div>
    );
}
