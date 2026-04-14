'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getBankAccounts, createBankAccount, getBankTransactions, createBankTransaction, deleteAccount, deleteJournalEntry } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/use-currency';
import { toast } from 'sonner';

type AccountForm = { code: string; name: string; current_balance: number };
type TxForm = { accountCode: string; description: string; amount: number; type: 'deposit' | 'withdrawal' };

export default function FinanceBankingPage() {
  const { format: fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accountForm, setAccountForm] = useState<AccountForm>({ code: '', name: '', current_balance: 0 });
  const [txForm, setTxForm] = useState<TxForm>({ accountCode: '', description: '', amount: 0, type: 'deposit' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [acc, tx] = await Promise.all([getBankAccounts(), getBankTransactions()]);
      setAccounts(Array.isArray(acc) ? acc : []);
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load banking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(() => {
    const liquidity = accounts.reduce((sum, a) => sum + Number(a.current_balance || a.balance || 0), 0);
    return { liquidity, accounts: accounts.length, transactions: transactions.length };
  }, [accounts, transactions]);

  const submitAccount = async () => {
    if (!accountForm.code || !accountForm.name) {
      toast.error('Code and name are required');
      return;
    }

    try {
      await createBankAccount(accountForm);
      toast.success('Bank account created');
      setAccountForm({ code: '', name: '', current_balance: 0 });
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create bank account');
    }
  };

  const submitTransaction = async () => {
    if (!txForm.accountCode || !txForm.description || Number(txForm.amount) <= 0) {
      toast.error('Account, description, and amount are required');
      return;
    }

    const amount = txForm.type === 'withdrawal' ? -Math.abs(txForm.amount) : Math.abs(txForm.amount);

    try {
      await createBankTransaction({
        date: new Date().toISOString().slice(0, 10),
        description: txForm.description,
        lines: [
          {
            accountCode: txForm.accountCode,
            description: txForm.description,
            debit: amount > 0 ? amount : 0,
            credit: amount < 0 ? Math.abs(amount) : 0,
          },
        ],
      });
      toast.success('Bank transaction posted');
      setTxForm({ accountCode: '', description: '', amount: 0, type: 'deposit' });
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to post bank transaction');
    }
  };

  const removeBankAccount = async (id: string) => {
    if (!confirm('Delete this bank account?')) return;
    try {
      const ok = await deleteAccount(id);
      if (!ok) {
        toast.error('Failed to delete bank account');
        return;
      }
      toast.success('Bank account deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete bank account');
    }
  };

  const removeTransaction = async (id: string) => {
    if (!confirm('Delete this bank transaction?')) return;
    try {
      const ok = await deleteJournalEntry(id);
      if (!ok) {
        toast.error('Failed to delete transaction');
        return;
      }
      toast.success('Transaction deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete transaction');
    }
  };

  return (
    <DashboardShell requireAdmin>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="border-b pb-5">
          <h1 className="text-2xl font-semibold">Banking & Treasury</h1>
          <p className="text-sm text-muted-foreground">Live banking data from chart of accounts and journal APIs.</p>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Liquidity</p><p className="text-2xl font-semibold">{fmt(totals.liquidity)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Bank Accounts</p><p className="text-2xl font-semibold">{totals.accounts}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Journal Transactions</p><p className="text-2xl font-semibold">{totals.transactions}</p></CardContent></Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Add Bank Account</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Code</Label><Input value={accountForm.code} onChange={(e) => setAccountForm((p) => ({ ...p, code: e.target.value }))} /></div>
              <div><Label>Name</Label><Input value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Opening Balance</Label><Input type="number" value={accountForm.current_balance} onChange={(e) => setAccountForm((p) => ({ ...p, current_balance: Number(e.target.value || 0) }))} /></div>
              <Button onClick={submitAccount}>Create Bank Account</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Post Bank Transaction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Account Code</Label><Input value={txForm.accountCode} onChange={(e) => setTxForm((p) => ({ ...p, accountCode: e.target.value }))} /></div>
              <div><Label>Description</Label><Input value={txForm.description} onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label><Input value={txForm.type} onChange={(e) => setTxForm((p) => ({ ...p, type: (e.target.value as 'deposit' | 'withdrawal') || 'deposit' }))} /></div>
                <div><Label>Amount</Label><Input type="number" value={txForm.amount} onChange={(e) => setTxForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} /></div>
              </div>
              <Button onClick={submitTransaction}>Post Transaction</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Bank Accounts</CardTitle></CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts found.</p>
            ) : (
              <div className="space-y-2">
                {accounts.slice(0, 20).map((a) => (
                  <div key={a.id || a._id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{a.code} - {a.name}</p>
                      <p className="text-xs text-muted-foreground">{fmt(Number(a.current_balance || a.balance || 0))}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removeBankAccount(a.id || a._id)}>Delete</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 20).map((tx) => (
                  <div key={tx.id || tx._id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{tx.description || 'Transaction'}</p>
                      <p className="text-xs text-muted-foreground">{tx.date || tx.createdAt || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{fmt(Number(tx.amount || tx.total || 0))}</p>
                      <Button variant="outline" size="sm" onClick={() => removeTransaction(tx.id || tx._id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
