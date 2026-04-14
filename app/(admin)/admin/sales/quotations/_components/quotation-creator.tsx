'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Save } from 'lucide-react';
import { authHeaders } from '@/lib/api';
import { toast } from 'sonner';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface QuotationLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuotationCreatorProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuotationCreator({ open, onClose, onSuccess }: QuotationCreatorProps) {
  const { baseCurrency, taxRate, taxName } = useCompanySettings();
  const [loading, setLoading] = useState(false);
  const [customerType, setCustomerType] = useState<'registry' | 'manual'>('manual');
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_company_name: '',
    customer_contact_person: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_city: '',
    customer_country: 'UAE',
    customer_tax_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms_and_conditions: 'Payment terms: Net 30 days\nDelivery: As per agreement\nValidity: 30 days from quotation date',
    tax_mode: 'auto' as 'auto' | 'manual',
    tax_rate: taxRate,
    tax_amount: 0
  });

  const [lines, setLines] = useState<QuotationLine[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);

  // Fetch customers for registry mode
  useEffect(() => {
    if (customerType === 'registry') {
      fetchCustomers();
    }
  }, [customerType]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/crm/customers', {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof QuotationLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Recalculate total if quantity or unit_price changed
    if (field === 'quantity' || field === 'unit_price') {
      newLines[index].total = newLines[index].quantity * newLines[index].unit_price;
    }
    
    setLines(newLines);
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + line.total, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    if (formData.tax_mode === 'auto') {
      return subtotal * (formData.tax_rate / 100);
    }
    return formData.tax_amount;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async () => {
    // Validation
    if (customerType === 'registry' && !formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (customerType === 'manual' && !formData.customer_company_name) {
      toast.error('Please enter customer company name');
      return;
    }

    if (lines.some(line => !line.description || line.quantity <= 0 || line.unit_price < 0)) {
      toast.error('Please fill all line items correctly');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        customer_type: customerType,
        lines: lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.total
        })),
        subtotal: calculateSubtotal(),
        tax_amount: calculateTax(),
        total_amount: calculateTotal()
      };

      // Remove manual customer fields if using registry
      if (customerType === 'registry') {
        delete (payload as any).customer_company_name;
        delete (payload as any).customer_contact_person;
        delete (payload as any).customer_email;
        delete (payload as any).customer_phone;
        delete (payload as any).customer_address;
        delete (payload as any).customer_city;
        delete (payload as any).customer_country;
        delete (payload as any).customer_tax_id;
      } else {
        delete (payload as any).customer_id;
      }

      const res = await fetch('/api/crm/quotations', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create quotation');
      }
    } catch (err) {
      console.error('Failed to create quotation:', err);
      toast.error('Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quotation</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Selection Type */}
          <div className="space-y-3">
            <Label>Customer Information Source</Label>
            <RadioGroup value={customerType} onValueChange={(v) => setCustomerType(v as 'registry' | 'manual')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="registry" id="registry" />
                <Label htmlFor="registry" className="font-normal cursor-pointer">
                  Use Customer Registry
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">
                  Manual Entry
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Customer Information */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm">Customer Details</h3>
            
            {customerType === 'registry' ? (
              <div className="space-y-2">
                <Label>Select Customer</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) =>(
                      <SelectItem key={customer._id || customer.id} value={customer._id || customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={formData.customer_company_name}
                    onChange={(e) => setFormData({ ...formData, customer_company_name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.customer_contact_person}
                    onChange={(e) => setFormData({ ...formData, customer_contact_person: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="+971 XX XXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.customer_city}
                    onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={formData.customer_country}
                    onChange={(e) => setFormData({ ...formData, customer_country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / TRN</Label>
                  <Input
                    value={formData.customer_tax_id}
                    onChange={(e) => setFormData({ ...formData, customer_tax_id: e.target.value })}
                    placeholder="Tax registration number"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Document Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quotation Date</Label>
              <Input
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          {/* Line Items */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Line Items</h3>
              <Button size="sm" variant="outline" onClick={addLine} className="gap-2">
                <Plus className="h-3 w-3" />
                Add Line
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5 space-y-2">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Total</Label>
                    <Input
                      value={formatCurrency(line.total, baseCurrency)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Totals */}
          <Card className="p-6 space-y-4 bg-gradient-to-br from-muted/50 to-muted/25 border-primary/20">
            <h3 className="font-semibold text-lg">Quotation Summary</h3>
            
            {/* Subtotal */}
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-muted-foreground font-medium">Subtotal:</span>
              <span className="text-xl font-bold">{formatCurrency(calculateSubtotal(), baseCurrency)}</span>
            </div>

            {/* Tax Section */}
            <div className="space-y-3 pb-3 border-b">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">{taxName} Calculation</Label>
                <RadioGroup
                  value={formData.tax_mode}
                  onValueChange={(v) => setFormData({ ...formData, tax_mode: v as 'auto' | 'manual' })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto-tax" />
                    <Label htmlFor="auto-tax" className="font-normal cursor-pointer">
                      Auto (Percentage)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual-tax" />
                    <Label htmlFor="manual-tax" className="font-normal cursor-pointer">
                      Manual (Amount)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.tax_mode === 'auto' ? (
                <div className="flex items-center gap-3 ml-4">
                  <Label className="text-sm">{taxName} Rate:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-24 h-9"
                  />
                  <span className="text-sm font-medium">%</span>
                  <span className="text-sm font-bold ml-auto text-lg">= {formatCurrency(calculateTax(), baseCurrency)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 ml-4">
                  <Label className="text-sm">{taxName} Amount:</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
                    className="w-32 h-9"
                  />
                  <span className="text-sm font-medium">{baseCurrency}</span>
                </div>
              )}
            </div>

            {/* Total Amount - Prominent */}
            <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4 border border-primary/30">
              <span className="text-lg font-bold text-primary">Total Amount:</span>
              <span className="text-3xl font-bold text-primary">{formatCurrency(calculateTotal(), baseCurrency)}</span>
            </div>
          </Card>

          {/* Notes and Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notes (visible to customer)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                placeholder="Terms and conditions..."
                className="h-24"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Quotation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
