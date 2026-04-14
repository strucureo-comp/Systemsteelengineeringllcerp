'use client';

import { useSettings } from '@/lib/settings-context';
import { hexToRgb, formatPdfCurrency } from '@/lib/pdf-settings';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface DocumentData {
    number: string;
    date: string;
    dueDate?: string;
    validUntil?: string;
    currency?: string;
    customerName: string;
    items: any[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes?: string;
    
    // Delivery Specific
    sellerName?: string;
    sellerAddress?: string;
    sellerTaxId?: string;
    sellerContact?: string;
    
    customerAddress?: string;
    customerContact?: string;
    
    invoiceRef?: string;
    orderRef?: string;
    
    shipmentDate?: string;
    deliveryDate?: string;
    deliveryMethod?: string;
    courierName?: string;
    vehicleDetails?: string;
    warehouseOrigin?: string;
    
    parcelCount?: number;
    totalWeight?: string;
    dimensions?: string;
    
    specialInstructions?: string;
    receiverName?: string;
    status?: string;
}

interface LiveDocumentPreviewProps {
    data: DocumentData;
    type: 'invoice' | 'proforma' | 'quotation' | 'delivery';
}

export function LiveDocumentPreview({ data, type }: LiveDocumentPreviewProps) {
    const { settings } = useSettings();
    const {
        companyName,
        address,
        phone,
        email,
        taxId,
        baseCurrency,
        taxName,
        logo,
        footerText,
    } = useCompanySettings();

    const colors = (() => {
        const primary = hexToRgb(settings.primaryColor || '#0F172A') || { r: 15, g: 23, b: 42 };
        const accent = hexToRgb(settings.accentColor || '#10B981') || { r: 16, g: 185, b: 129 };
        return { primary, accent };
    })();

    const currency = data.currency || baseCurrency;

    const getTitle = () => {
        switch (type) {
            case 'invoice': return 'TAX INVOICE';
            case 'proforma': return 'PROFORMA INVOICE';
            case 'quotation': return 'QUOTATION';
            case 'delivery': return 'DELIVERY NOTE';
            default: return 'DOCUMENT';
        }
    };

    return (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            {/* Document Preview Content */}
            <div className="p-8 space-y-6 text-xs font-sans" style={{ minHeight: '800px' }}>
                {/* 1 & 2. Header & Seller Info */}
                <div className="flex justify-between items-start gap-8">
                    <div className="w-1/2 space-y-2">
                        {logo || settings.logoUrl ? (
                            <img src={logo || settings.logoUrl} alt={companyName} className="h-12 w-auto object-contain mb-4 grayscale contrast-125" />
                        ) : (
                            <div className="mb-4 h-12 w-12 rounded bg-black flex items-center justify-center text-white font-black text-xl italic">
                                S
                            </div>
                        )}
                        <h3 className="font-black text-sm tracking-tight" style={{ color: `rgb(${colors.primary.r},${colors.primary.g},${colors.primary.b})` }}>
                            {type === 'delivery' ? (data.sellerName || companyName) : companyName}
                        </h3>
                        <div className="text-gray-500 leading-relaxed whitespace-pre-line">
                            {type === 'delivery' ? (data.sellerAddress || address) : address}
                            {type === 'delivery' ? (data.sellerContact && `\n${data.sellerContact}`) : (phone && `\nTel: ${phone}`)}
                            {(type === 'delivery' ? data.sellerTaxId : taxId) && `\nTRN: ${type === 'delivery' ? data.sellerTaxId : taxId}`}
                        </div>
                    </div>

                    <div className="w-1/2 text-right space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-4xl font-black tracking-tighter" style={{ color: `rgb(${colors.primary.r},${colors.primary.g},${colors.primary.b})` }}>
                                {getTitle()}
                            </h2>
                            <p className="text-lg font-bold text-gray-400">{data.number}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1 inline-block text-right min-w-[180px]">
                            <p><span className="text-gray-400 uppercase font-black text-[9px] mr-2">Issue Date:</span> <span className="font-bold">{data.date}</span></p>
                            {data.orderRef && <p><span className="text-gray-400 uppercase font-black text-[9px] mr-2">Order Ref:</span> <span className="font-bold">{data.orderRef}</span></p>}
                            {data.invoiceRef && <p><span className="text-gray-400 uppercase font-black text-[9px] mr-2">Invoice Ref:</span> <span className="font-bold">{data.invoiceRef}</span></p>}
                            {data.deliveryDate && <p><span className="text-gray-400 uppercase font-black text-[9px] mr-2">Est. Delivery:</span> <span className="font-bold">{data.deliveryDate}</span></p>}
                        </div>
                    </div>
                </div>

                {/* 3 & 4. Recipient vs Shipment Logistics */}
                <div className="grid grid-cols-2 gap-8 border-y py-6 border-gray-100">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-1">3. Deliver To / Recipient</h4>
                        <div className="space-y-1.5">
                            <p className="font-black text-sm">{data.customerName || 'Select Customer'}</p>
                            <p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{data.customerAddress || 'Delivery address not specified'}</p>
                            {data.customerContact && <p className="font-bold text-gray-800 mt-2">Contact: {data.customerContact}</p>}
                        </div>
                    </div>
                    {type === 'delivery' ? (
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-1">4. Shipment Logistics</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] uppercase font-bold text-gray-400">Method</p>
                                    <p className="font-bold capitalize">{data.deliveryMethod || 'Own Vehicle'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] uppercase font-bold text-gray-400">Transporter</p>
                                    <p className="font-bold">{data.courierName || 'In-house'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] uppercase font-bold text-gray-400">Vehicle/Driver</p>
                                    <p className="font-bold">{data.vehicleDetails || '-'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] uppercase font-bold text-gray-400">Warehouse</p>
                                    <p className="font-bold">{data.warehouseOrigin || 'Default'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-1">Payment Info</h4>
                            <div className="space-y-1">
                                <p className="text-xs">Terms: <span className="font-bold">{ (data as any).paymentTerms || 'Net 30' }</span></p>
                                <p className="text-xs">Currency: <span className="font-bold">{currency}</span></p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Items Table */}
                <div className="mt-4">
                    <table className="w-full text-[11px] border-collapse">
                        <thead>
                            <tr className="text-white" style={{ backgroundColor: `rgb(${colors.primary.r},${colors.primary.g},${colors.primary.b})` }}>
                                <th className="text-left p-2.5 font-bold uppercase tracking-wider w-24">SKU</th>
                                <th className="text-left p-2.5 font-bold uppercase tracking-wider">Description</th>
                                <th className="text-center p-2.5 font-bold uppercase tracking-wider w-20">Qty</th>
                                <th className="text-center p-2.5 font-bold uppercase tracking-wider w-20">Unit</th>
                                {type !== 'delivery' ? (
                                    <>
                                        <th className="text-right p-2.5 font-bold uppercase tracking-wider w-28">Price</th>
                                        <th className="text-right p-2.5 font-bold uppercase tracking-wider w-28">Total</th>
                                    </>
                                ) : (
                                    <th className="text-right p-2.5 font-bold uppercase tracking-wider w-28">Weight/Size</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items?.length > 0 ? (
                                data.items.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-2.5 font-mono text-[10px] text-gray-400">{item.sku || '-'}</td>
                                        <td className="p-2.5">
                                            <p className="font-bold text-gray-900">{item.description || 'No description'}</p>
                                        </td>
                                        <td className="p-2.5 text-center font-black">{item.quantity}</td>
                                        <td className="p-2.5 text-center text-gray-500 uppercase">{item.unit || 'pcs'}</td>
                                        {type !== 'delivery' ? (
                                            <>
                                                <td className="p-2.5 text-right font-medium">{formatPdfCurrency(item.unitPrice, currency)}</td>
                                                <td className="p-2.5 text-right font-black" style={{ color: `rgb(${colors.primary.r},${colors.primary.g},${colors.primary.b})` }}>{formatPdfCurrency(item.total, currency)}</td>
                                            </>
                                        ) : (
                                            <td className="p-2.5 text-right text-gray-400 italic">
                                                {item.weight || '-'} {item.size && `• ${item.size}`}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={type === 'delivery' ? 5 : 6} className="p-12 text-center text-gray-300 italic">NO ITEMS ADDED</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 6. Totals & Packages */}
                <div className="flex justify-between items-start gap-8 pt-6">
                    <div className="w-1/2 space-y-4">
                        {type === 'delivery' && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h4 className="text-[9px] font-black uppercase text-gray-400 mb-3">6. Package Summary</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-0.5"><p className="text-[8px] uppercase text-gray-400">Parcels</p><p className="font-black text-sm">{data.parcelCount || 1}</p></div>
                                    <div className="space-y-0.5"><p className="text-[8px] uppercase text-gray-400">Net Weight</p><p className="font-black text-sm">{data.totalWeight || '-'}</p></div>
                                    <div className="space-y-0.5"><p className="text-[8px] uppercase text-gray-400">Dimensions</p><p className="font-black text-sm">{data.dimensions || '-'}</p></div>
                                </div>
                            </div>
                        )}
                        {data.specialInstructions && (
                            <div className="space-y-1.5 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <h4 className="text-[9px] font-black uppercase text-amber-700 tracking-widest">7. Special Instructions</h4>
                                <p className="text-[11px] text-amber-900 leading-relaxed italic">{data.specialInstructions}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="w-[280px]">
                        {type !== 'delivery' ? (
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-xs px-2">
                                    <span className="text-gray-400 font-bold uppercase text-[10px]">Subtotal</span>
                                    <span className="font-bold text-gray-700">{formatPdfCurrency(data.subtotal || 0, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs px-2">
                                    <span className="text-gray-400 font-bold uppercase text-[10px]">{taxName} ({data.taxRate || 5}%)</span>
                                    <span className="font-bold text-gray-700">{formatPdfCurrency(data.taxAmount || 0, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-xl text-white shadow-lg" style={{ backgroundColor: `rgb(${colors.primary.r},${colors.primary.g},${colors.primary.b})` }}>
                                    <span className="font-black uppercase tracking-widest text-[10px]">Grand Total</span>
                                    <span className="text-xl font-black">{formatPdfCurrency(data.total || 0, currency)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-1">
                                <div className="flex justify-between items-center"><span className="text-gray-400 uppercase font-black text-[9px]">Total Items</span><span className="font-bold text-sm tracking-tight">{data.items?.length || 0}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-400 uppercase font-black text-[9px]">Total Quantity</span><span className="font-black text-lg tracking-tight text-primary">{data.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0}</span></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 8. Acknowledgement Area */}
                <div className="mt-12 grid grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 underline decoration-gray-200 underline-offset-4 tracking-tighter">Authorized Seller Signature</h4>
                            {settings.authorizedSignature ? (
                                <img src={settings.authorizedSignature} alt="Authorized Signature" className="h-16 w-auto object-contain mb-2 grayscale" />
                            ) : (
                                <div className="h-0.5 bg-gray-100 w-48 mb-2"></div>
                            )}
                            <p className="text-[9px] text-gray-400 font-medium">{settings.authorizedSignature ? 'Digitally Verified Signature' : 'Digital ERP Stamp Applied'}</p>
                        </div>
                    </div>
                    <div>
                        <div className="border-2 border-dashed border-gray-100 rounded-2xl p-6 space-y-6 bg-gray-50/30">
                            <h4 className="text-center text-[10px] font-black uppercase tracking-widest border-b border-gray-100 pb-2">
                                {settings.acknowledgement?.title || '8. Receiver Acknowledgement'}
                            </h4>
                            <div className="space-y-8">
                                <div className="border-b border-gray-200 py-2 flex justify-between items-end">
                                    <span className="text-[9px] uppercase font-black opacity-20 italic">
                                        {settings.acknowledgement?.signatureLabel || 'Signature / Company Stamp'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border-b border-gray-200 py-1 flex flex-col">
                                        <span className="text-[8px] uppercase font-bold text-gray-300">
                                            {settings.acknowledgement?.nameLabel || 'Name'}
                                        </span>
                                        <span className="h-4 font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {data.receiverName || ''}
                                        </span>
                                    </div>
                                    <div className="border-b border-gray-200 py-1 flex flex-col">
                                        <span className="text-[8px] uppercase font-bold text-gray-300">
                                            {settings.acknowledgement?.dateLabel || 'Date & Time'}
                                        </span>
                                        <span className="h-4 font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {data.date || new Date().toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 9. Optional extras / Disclaimer */}
                <div className="mt-8 text-center space-y-2 opacity-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{footerText || 'Computer Generated Document - Professional Audit Grade'}</p>
                    <div className="flex justify-center gap-4 text-[8px] font-medium text-gray-300 uppercase tracking-tighter">
                        <span>Secured by SSL</span>
                        <span>•</span>
                        <span>Audit Log Enforced</span>
                        <span>•</span>
                        <span>Identity Verified</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-2 text-center text-[10px] text-gray-400 border-t">
                {footerText || `${companyName} | This is a computer-generated document`}
            </div>
        </div>
    );
}
