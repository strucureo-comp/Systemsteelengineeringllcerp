'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hash, User, ShieldCheck, Plus, Trash2, Building2, CreditCard, Calendar } from 'lucide-react';
import type { User as UserType, Project, InvoiceStatus } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

interface InvoiceFormProps {
  formData: {
    client_id: string;
    project_id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    currency: string;
    line_items: InvoiceLineItem[];
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    tax_rate: number;
    additional_charges: number;
    additional_charges_description: string;
    status: InvoiceStatus;
    description: string;
    notes: string;
  };
  users: UserType[];
  projects: Project[];
  onFormDataChange: (data: any) => void;
  variant?: 'modern' | 'traditional';
  saving?: boolean;
}

export function InvoiceForm({
  formData,
  users,
  projects,
  onFormDataChange,
  variant = 'modern',
  saving = false,
}: InvoiceFormProps) {
  const { baseCurrency, taxRate, taxName } = useCompanySettings();
  const filteredProjects = projects.filter(p => p.client_id === formData.client_id);

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const newItems = [...formData.line_items];
    const item = { ...newItems[index] };
    
    if (field === 'description') item.description = value;
    else if (field === 'quantity') {
      item.quantity = Number(value);
      item.total = item.quantity * item.unit_price * (1 + item.tax_rate / 100);
    } else if (field === 'unit_price') {
      item.unit_price = Number(value);
      item.total = item.quantity * item.unit_price * (1 + item.tax_rate / 100);
    } else if (field === 'tax_rate') {
      item.tax_rate = Number(value);
      item.total = item.quantity * item.unit_price * (1 + item.tax_rate / 100);
    }
    
    newItems[index] = item;
    onFormDataChange({ ...formData, line_items: newItems });
  };

  const addLineItem = () => {
    onFormDataChange({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0, tax_rate: taxRate, total: 0 }]
    });
  };

  const removeLineItem = (index: number) => {
    const newItems = formData.line_items.filter((_, idx) => idx !== index);
    onFormDataChange({ ...formData, line_items: newItems });
  };

  const totals = useMemo(() => {
    const subtotal = formData.line_items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const discount = formData.discount_type === 'percentage' 
      ? subtotal * (formData.discount_value / 100)
      : formData.discount_value;
    const afterDiscount = subtotal - discount;
    const tax = formData.line_items.reduce((acc, item) => acc + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
    const total = afterDiscount + tax + (formData.additional_charges || 0);
    
    return { subtotal, discount, afterDiscount, tax, total };
  }, [formData.line_items, formData.discount_type, formData.discount_value, formData.additional_charges]);

  // Sync defaults on first load if not set
  useMemo(() => {
    if (!formData.currency) {
      onFormDataChange({ ...formData, currency: baseCurrency });
    }
  }, [baseCurrency]);

  if (variant === 'modern') {
    return (
      <div className="grid gap-6 md:grid-cols-3 animate-in fade-in duration-300">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-6">
          {/* Identification */}
          <Card className="border border-border shadow-sm rounded-md bg-card">
            <CardHeader className="border-b bg-muted/50 py-3">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Hash size={14} className="text-primary" /> Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Invoice Number</Label>
                <Input 
                  value={formData.invoice_number} 
                  onChange={e => onFormDataChange({...formData, invoice_number: e.target.value})} 
                  className="h-9 border-border font-mono font-bold uppercase text-xs" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Issue Date</Label>
                <Input 
                  type="date" 
                  value={formData.issue_date} 
                  onChange={e => onFormDataChange({...formData, issue_date: e.target.value})} 
                  className="h-9 border-border text-xs font-bold" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Due Date</Label>
                <Input 
                  type="date" 
                  value={formData.due_date} 
                  onChange={e => onFormDataChange({...formData, due_date: e.target.value})} 
                  className="h-9 border-border text-xs font-bold" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Currency</Label>
                <Select value={formData.currency} onValueChange={v => onFormDataChange({...formData, currency: v})}>
                  <SelectTrigger className="h-9 border-border text-xs font-bold uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ... (Client Details, etc.) */}
        </div>

        {/* Right Column - Line Items */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border shadow-sm rounded-md bg-card overflow-hidden">
            <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">Line Items</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Itemized billing breakdown</p>
              </div>
              <Button 
                type="button" 
                onClick={addLineItem} 
                variant="outline" 
                className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
              >
                <Plus className="mr-1.5 h-3 w-3" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Description</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-24">Qty</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-32">Unit Price</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-24">Tax %</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground w-28 text-right">Total</th>
                      <th className="px-6 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {formData.line_items.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-zinc-50/50">
                        <td className="px-6 py-3">
                          <Input 
                            value={item.description} 
                            onChange={e => handleLineItemChange(idx, 'description', e.target.value)} 
                            className="h-8 border-none bg-transparent font-bold text-xs uppercase" 
                            placeholder="Enter item..." 
                          />
                        </td>
                        <td className="px-6 py-3">
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => handleLineItemChange(idx, 'quantity', e.target.value)} 
                            className="h-8 border-border text-center text-xs font-bold" 
                          />
                        </td>
                        <td className="px-6 py-3">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={item.unit_price} 
                            onChange={e => handleLineItemChange(idx, 'unit_price', e.target.value)} 
                            className="h-8 border-border text-xs font-bold" 
                          />
                        </td>
                        <td className="px-6 py-3">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={item.tax_rate} 
                            onChange={e => handleLineItemChange(idx, 'tax_rate', e.target.value)} 
                            className="h-8 border-border text-center text-xs font-bold" 
                          />
                        </td>
                        <td className="px-6 py-3 text-right text-xs font-black text-foreground">
                          {formatCurrency(item.total, formData.currency)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button 
                            onClick={() => removeLineItem(idx)} 
                            className="text-muted-foreground/60 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="p-8 bg-muted/30 border-t border-border grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  {/* ... (Discount, Charges, Terms) */}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between py-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                    <span className="text-sm font-black text-foreground">{formatCurrency(totals.subtotal, formData.currency)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between py-2 text-rose-600">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Discount</span>
                      <span className="text-sm font-black">-{formatCurrency(totals.discount, formData.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tax ({taxName})</span>
                    <span className="text-sm font-black text-foreground">{formatCurrency(totals.tax, formData.currency)}</span>
                  </div>
                  {formData.additional_charges > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Additional</span>
                      <span className="text-sm font-black text-foreground">{formatCurrency(formData.additional_charges, formData.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-foreground text-card-foreground p-6 rounded-md mt-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">Total Amount Due</p>
                      <p className="text-2xl font-black tracking-tighter">{formatCurrency(totals.total, formData.currency)}</p>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
