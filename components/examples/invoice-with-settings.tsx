'use client';

/**
 * EXAMPLE: Invoice Module Using Settings
 * 
 * This demonstrates how to use settings for:
 * - Dynamic tax calculation
 * - Company branding in PDF
 * - Email notifications with company details
 */

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/settings-api';
import { useSettings } from '@/lib/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface InvoiceData {
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
}

export function InvoiceWithSettings() {
  const { getSetting } = useSettings();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    loadInvoiceData();
  }, []);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);

      // Get company information from settings
      const company = await settingsApi.company.getAll();
      setCompanyInfo(company);

      // Get tax settings
      const taxSettings = await settingsApi.tax.getAll();

      // Example invoice items
      const items = [
        { name: 'Project Management', quantity: 1, price: 5000 },
        { name: 'Steel Fabrication', quantity: 50, price: 250 }
      ];

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

      // Calculate tax based on settings
      const taxAmount = taxSettings.enabled ? subtotal * (taxSettings.rate / 100) : 0;
      const total = subtotal + taxAmount;

      setInvoice({
        items,
        subtotal,
        tax: taxAmount,
        total
      });
    } catch (error) {
      console.error('Failed to load invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-8 w-8 animate-spin" />;
  }

  if (!invoice || !companyInfo) {
    return <div>No data</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
        <CardTitle className="text-2xl">INV-2026-001</CardTitle>
        {/* Company branding from settings */}
        <div className="mt-2 text-sm text-muted-foreground">
          <p className="font-semibold">{companyInfo.name}</p>
          <p>{companyInfo.address}</p>
          <p>{companyInfo.phone} | {companyInfo.email}</p>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Description</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">AED {item.price.toLocaleString()}</td>
                <td className="text-right">AED {(item.quantity * item.price).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-2 ml-auto w-64 border-t pt-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>AED {invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-orange-600 font-semibold">
            <span>Tax (VAT 5%)</span>
            <span>AED {invoice.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total Due</span>
            <span>AED {invoice.total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
