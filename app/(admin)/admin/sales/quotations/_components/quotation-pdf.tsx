'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { authHeaders } from '@/lib/api';
import { toast } from 'sonner';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface QuotationPDFProps {
  quotationId: string;
  open: boolean;
  onClose: () => void;
}

export function QuotationPDF({ quotationId, open, onClose }: QuotationPDFProps) {
  const { baseCurrency, companyName, logo, address, phone, email, footerText } = useCompanySettings();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, quotationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load quotation
      const quotRes = await fetch(`/api/crm/quotations/${quotationId}`, {
        headers: authHeaders()
      });
      if (quotRes.ok) {
        const quotData = await quotRes.json();
        setQuotation(quotData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load quotation data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    handlePrint();
    toast.success('PDF generation initiated. Use your browser print dialog to save as PDF.');
  };

  if (loading || !quotation) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[1000px]">
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Generating PDF preview...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const primaryColor = '#1e40af';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>PDF Preview - {quotation.quotation_number}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button size="sm" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* PDF Preview - A4 Page */}
        <div ref={pdfRef} data-pdf-content className="bg-gray-50 p-4 space-y-4">
          <div
            className="bg-white shadow-sm relative"
            style={{
              width: '210mm',
              height: '297mm',
              margin: '0 auto',
              padding: '20mm',
              fontFamily: 'Arial, sans-serif',
              fontSize: '11px',
              lineHeight: '1.5',
              color: '#000'
            }}
          >
            {/* Header */}
            <div style={{ borderBottom: `4px solid ${primaryColor}`, paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {logo ? (
                    <img
                      src={logo}
                      alt={companyName}
                      style={{ maxHeight: '60px', maxWidth: '200px' }}
                    />
                  ) : (
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: primaryColor }}>
                      {companyName}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '8px' }}>
                    Your Professional Solution Partner
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                    {address}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: primaryColor }}>
                    QUOTATION
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '8px', fontWeight: 'bold' }}>
                    {quotation.quotation_number}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                    Date: {new Date(quotation.quotation_date).toLocaleDateString()}
                  </div>
                  {quotation.valid_until && (
                    <div style={{ fontSize: '10px', color: '#666' }}>
                    Valid Until: {new Date(quotation.valid_until).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: primaryColor }}>
              BILL TO:
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                {quotation.customer_company_name || quotation.customer_id?.name}
              </div>
              {quotation.customer_contact_person && (
                <div style={{ marginTop: '4px' }}>
                  Attn: {quotation.customer_contact_person}
                </div>
              )}
              {quotation.customer_address && (
                <div style={{ marginTop: '4px' }}>{quotation.customer_address}</div>
              )}
              {quotation.customer_city && quotation.customer_country && (
                <div style={{ marginTop: '2px' }}>
                  {quotation.customer_city}, {quotation.customer_country}
                </div>
              )}
              {quotation.customer_phone && (
                <div style={{ marginTop: '4px' }}>Tel: {quotation.customer_phone}</div>
              )}
              {quotation.customer_email && (
                <div style={{ marginTop: '2px' }}>Email: {quotation.customer_email}</div>
              )}
              {quotation.customer_tax_id && (
                <div style={{ marginTop: '2px' }}>Tax ID: {quotation.customer_tax_id}</div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                    Description
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '80px' }}>
                    Quantity
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', width: '100px' }}>
                    Unit Price
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', width: '120px' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotation.lines?.map((line: any, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>{line.description}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{line.quantity}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {formatCurrency(line.unit_price, baseCurrency)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                      {formatCurrency(line.total, baseCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '2px solid #e5e7eb' }}>
            <div style={{ maxWidth: '500px', marginLeft: 'auto' }}>
              {/* Subtotal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '13px' }}>
                <span style={{ color: '#6b7280', fontWeight: '500' }}>Subtotal:</span>
                <span style={{ fontWeight: '500', minWidth: '150px', textAlign: 'right' }}>{formatCurrency(quotation.subtotal || 0, baseCurrency)}</span>
              </div>
              
              {/* Tax */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '13px' }}>
                <span style={{ color: '#6b7280', fontWeight: '500' }}>
                  Tax {quotation.tax_mode === 'auto' ? `(${quotation.tax_rate}%)` : '(Adjusted)'}:
                </span>
                <span style={{ fontWeight: '500', minWidth: '150px', textAlign: 'right' }}>{formatCurrency(quotation.tax_amount || 0, baseCurrency)}</span>
              </div>
              
              {/* Total Amount - Prominent */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: primaryColor + '15',
                  border: `2px solid ${primaryColor}`,
                  borderRadius: '6px',
                  marginTop: '12px'
                }}
              >
                <span style={{ color: primaryColor }}>TOTAL AMOUNT:</span>
                <span style={{ color: primaryColor, minWidth: '180px', textAlign: 'right' }}>{formatCurrency(quotation.total_amount || 0, baseCurrency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: primaryColor }}>
                Notes:
              </div>
              <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '6px', fontSize: '11px' }}>
                {quotation.notes}
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {quotation.terms_and_conditions && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: primaryColor }}>
                Terms & Conditions:
              </div>
              <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '6px', fontSize: '10px', whiteSpace: 'pre-line' }}>
                {quotation.terms_and_conditions}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '40px' }}>
                  Authorized Signature
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {companyName}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '40px' }}>
                  Client Acceptance
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    Name & Signature
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '24px', fontSize: '9px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
              By accepting this quotation, the client agrees to the terms and conditions listed above.
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '9px', color: '#666' }}>
            <div>{[phone, email].filter(Boolean).join(' | ')}</div>
            <div style={{ marginTop: '4px' }}>
              {footerText || `${companyName} | This is a computer-generated document`}
            </div>
          </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
