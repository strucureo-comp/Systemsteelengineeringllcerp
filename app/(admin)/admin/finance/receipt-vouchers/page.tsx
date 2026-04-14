'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2, Trash2, Edit, Download, CheckCircle2, BookOpenCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/hooks/use-currency';
import { getAccounts } from '@/lib/api';
import {
  getReceiptVouchers,
  createReceiptVoucher,
  updateReceiptVoucher,
  deleteReceiptVoucher,
  approveReceiptVoucher,
  postReceiptVoucher,
} from '@/lib/services/business-documents-api';
import { generateReceiptVoucherPDF } from '@/lib/pdf-generator';

interface VoucherLine {
  description: string;
  accountCode: string;
  amount: number;
}

interface LedgerAccount {
  code: string;
  name: string;
  type?: string;
}

interface ReceiptVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  payerType: 'customer' | 'other';
  payerName: string;
  receiptMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card';
  referenceNo?: string;
  currency: string;
  cashAccountCode: string;
  lines: VoucherLine[];
  totalAmount: number;
  notes?: string;
  status: 'draft' | 'approved' | 'posted' | 'cancelled';
  journal_entry_id?: string;
  postedAt?: string;
}

const EMPTY: ReceiptVoucher = {
  id: '',
  voucherNumber: '',
  date: new Date().toISOString().split('T')[0],
  payerType: 'customer',
  payerName: '',
  receiptMethod: 'bank_transfer',
  referenceNo: '',
  currency: '',
  cashAccountCode: '1000',
  lines: [{ description: '', accountCode: '', amount: 0 }],
  totalAmount: 0,
  notes: '',
  status: 'draft',
};

export default function ReceiptVouchersPage() {
  const { format: fmt, currencyCode } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReceiptVoucher[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [actionId, setActionId] = useState('');
  const [form, setForm] = useState<ReceiptVoucher>({ ...EMPTY, currency: currencyCode });

  const accountsByCode = useMemo(
    () => new Map(accounts.map((account) => [account.code, account])),
    [accounts]
  );

  const defaultCashAccountCode = useMemo(
    () => accounts.find((account) => account.code === '1000')?.code || accounts[0]?.code || '1000',
    [accounts]
  );

  const normalized = (doc: any): ReceiptVoucher => ({
    ...doc,
    id: doc.id || doc._id,
    cashAccountCode: doc.cashAccountCode || '1000',
    lines: Array.isArray(doc.lines)
      ? doc.lines.map((line: any) => ({
          description: line.description || '',
          accountCode: line.accountCode || '',
          amount: Number(line.amount || 0),
        }))
      : [],
  });

  const computeTotal = (lines: VoucherLine[]) => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [voucherData, accountData] = await Promise.all([getReceiptVouchers(), getAccounts()]);
        setItems(Array.isArray(voucherData) ? voucherData.map(normalized) : []);
        setAccounts(Array.isArray(accountData) ? accountData : []);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load receipt vouchers');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    if ((!form.currency && currencyCode) || (!form.cashAccountCode && defaultCashAccountCode)) {
      setForm((prev) => ({
        ...prev,
        currency: prev.currency || currencyCode,
        cashAccountCode: prev.cashAccountCode || defaultCashAccountCode,
      }));
    }
  }, [currencyCode, defaultCashAccountCode, form.cashAccountCode, form.currency]);

  const filtered = useMemo(
    () =>
      items.filter((voucher) =>
        [voucher.voucherNumber, voucher.payerName, voucher.referenceNo]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query.toLowerCase()))
      ),
    [items, query]
  );

  const openNew = () => {
    setForm({
      ...EMPTY,
      currency: currencyCode,
      cashAccountCode: defaultCashAccountCode,
      lines: [{ description: '', accountCode: '', amount: 0 }],
    });
    setOpen(true);
  };

  const openEdit = (voucher: ReceiptVoucher) => {
    if (voucher.status === 'posted') {
      return;
    }

    setForm(voucher);
    setOpen(true);
  };

  const save = async () => {
    if (!form.payerName.trim()) {
      toast.error('Payer is required');
      return;
    }

    if (!form.cashAccountCode) {
      toast.error('Cash / bank account is required');
      return;
    }

    if (
      !form.lines.length ||
      form.lines.some((line) => !line.description.trim() || !line.accountCode || Number(line.amount) <= 0)
    ) {
      toast.error('Each line requires description, account, and amount');
      return;
    }

    const payload = {
      ...form,
      cashAccountCode: form.cashAccountCode || defaultCashAccountCode,
      totalAmount: computeTotal(form.lines),
      number: form.voucherNumber,
      amount: computeTotal(form.lines),
      customerName: form.payerName,
      paymentMethod: form.receiptMethod,
    } as any;

    try {
      if (form.id) {
        const updated = normalized(await updateReceiptVoucher(form.id, payload));
        setItems((prev) => prev.map((item) => (item.id === form.id ? updated : item)));
      } else {
        const created = normalized(await createReceiptVoucher(payload));
        setItems((prev) => [created, ...prev]);
      }
      toast.success('Receipt voucher saved');
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save receipt voucher');
    }
  };

  const updateFromAction = (response: any) => normalized(response?.voucher || response);

  const approve = async (id: string) => {
    try {
      setActionId(id);
      const updated = updateFromAction(await approveReceiptVoucher(id));
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Receipt voucher approved');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve receipt voucher');
    } finally {
      setActionId('');
    }
  };

  const post = async (id: string) => {
    try {
      setActionId(id);
      const updated = updateFromAction(await postReceiptVoucher(id));
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Receipt voucher posted to ledger');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to post receipt voucher');
    } finally {
      setActionId('');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteReceiptVoucher(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success('Receipt voucher deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete receipt voucher');
    }
  };

  const updateLine = (index: number, update: Partial<VoucherLine>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...update } : line)),
    }));
  };

  return (
    <ModuleGuard module="finance">
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <div className="flex items-center justify-between border-b pb-5">
          <div>
            <h1 className="text-2xl font-bold">Receipt Vouchers</h1>
            <p className="text-sm text-muted-foreground">Approve and post incoming cash receipts to the ledger.</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> New Voucher
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search vouchers..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((voucher) => (
              <Card key={voucher.id}>
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{voucher.voucherNumber}</p>
                      <Badge variant="outline">{voucher.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {voucher.payerName} • {voucher.date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {voucher.lines.length} lines • {accountsByCode.get(voucher.cashAccountCode)?.name || voucher.cashAccountCode} settlement
                    </p>
                    {voucher.journal_entry_id && (
                      <p className="text-xs text-emerald-600">Journal linked: {voucher.journal_entry_id}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <p className="text-lg font-semibold">{fmt(voucher.totalAmount || 0)}</p>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {voucher.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={actionId === voucher.id}
                          onClick={() => void approve(voucher.id)}
                        >
                          {actionId === voucher.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Approve
                        </Button>
                      )}
                      {voucher.status === 'approved' && (
                        <Button size="sm" className="gap-1" disabled={actionId === voucher.id} onClick={() => void post(voucher.id)}>
                          {actionId === voucher.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}
                          Post
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          generateReceiptVoucherPDF({
                            ...voucher,
                            number: voucher.voucherNumber,
                            amount: voucher.totalAmount,
                            customerName: voucher.payerName,
                            paymentMethod: voucher.receiptMethod,
                          })
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={voucher.status === 'posted'} onClick={() => openEdit(voucher)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={voucher.status !== 'draft'} onClick={() => void remove(voucher.id)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No vouchers found.</p>}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit' : 'Create'} Receipt Voucher</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Receipt Method</Label>
                  <Select
                    value={form.receiptMethod}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, receiptMethod: value as ReceiptVoucher['receiptMethod'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Payer Type</Label>
                  <Select value={form.payerType} onValueChange={(value) => setForm((prev) => ({ ...prev, payerType: value as ReceiptVoucher['payerType'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payer Name</Label>
                  <Input value={form.payerName} onChange={(e) => setForm((prev) => ({ ...prev, payerName: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Reference</Label>
                  <Input value={form.referenceNo || ''} onChange={(e) => setForm((prev) => ({ ...prev, referenceNo: e.target.value }))} />
                </div>
                <div>
                  <Label>Cash / Bank Account</Label>
                  <Select value={form.cashAccountCode || defaultCashAccountCode} onValueChange={(value) => setForm((prev) => ({ ...prev, cashAccountCode: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.code} value={account.code}>
                          {account.code} • {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Distribution Lines</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        lines: [...prev.lines, { description: '', accountCode: '', amount: 0 }],
                      }))
                    }
                  >
                    Add Line
                  </Button>
                </div>

                {form.lines.map((line, index) => (
                  <div key={index} className="space-y-1 rounded-lg border p-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1fr_140px_auto]">
                      <Input
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updateLine(index, { description: e.target.value })}
                      />
                      <Select value={line.accountCode || '__unset'} onValueChange={(value) => updateLine(index, { accountCode: value === '__unset' ? '' : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Line account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unset">Select account</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.code} value={account.code}>
                              {account.code} • {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={line.amount}
                        onChange={(e) => updateLine(index, { amount: Number(e.target.value || 0) })}
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            lines: prev.lines.length > 1 ? prev.lines.filter((_, lineIndex) => lineIndex !== index) : prev.lines,
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {line.accountCode ? accountsByCode.get(line.accountCode)?.name || 'Account not found' : 'Select the credit account for this receipt line.'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-right text-sm font-semibold">Total: {fmt(computeTotal(form.lines))}</div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGuard>
  );
}
