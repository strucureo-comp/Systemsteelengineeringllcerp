'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFixedAssets, createFixedAsset, deleteFixedAsset } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/use-currency';
import { toast } from 'sonner';

type AssetForm = { name: string; class: string; cost: number; acquired: string };

export default function FinanceAssetsPage() {
  const { format: fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [form, setForm] = useState<AssetForm>({ name: '', class: 'General', cost: 0, acquired: new Date().toISOString().slice(0, 10) });

  const loadData = async () => {
    try {
      setLoading(true);
      const rows = await getFixedAssets();
      setAssets(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(() => {
    const totalCost = assets.reduce((sum, a) => sum + Number(a.cost || a.purchase_cost || 0), 0);
    return { count: assets.length, totalCost };
  }, [assets]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    try {
      await createFixedAsset({
        name: form.name,
        class: form.class,
        cost: Number(form.cost || 0),
        acquired: form.acquired,
      });
      toast.success('Asset created');
      setForm({ name: '', class: 'General', cost: 0, acquired: new Date().toISOString().slice(0, 10) });
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create asset');
    }
  };

  const removeAsset = async (id: string) => {
    if (!confirm('Delete this fixed asset?')) return;
    try {
      const ok = await deleteFixedAsset(id);
      if (!ok) {
        toast.error('Failed to delete asset');
        return;
      }
      toast.success('Asset deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete asset');
    }
  };

  return (
    <DashboardShell requireAdmin>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="border-b pb-5">
          <h1 className="text-2xl font-semibold">Fixed Assets</h1>
          <p className="text-sm text-muted-foreground">Live fixed asset register powered by backend APIs.</p>
        </div>

        <div className="grid gap-4 grid-cols-2">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Asset Count</p><p className="text-2xl font-semibold">{totals.count}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Cost</p><p className="text-2xl font-semibold">{fmt(totals.totalCost)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Add Asset</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Class</Label><Input value={form.class} onChange={(e) => setForm((p) => ({ ...p, class: e.target.value }))} /></div>
            <div><Label>Acquired</Label><Input type="date" value={form.acquired} onChange={(e) => setForm((p) => ({ ...p, acquired: e.target.value }))} /></div>
            <div><Label>Cost</Label><Input type="number" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value || 0) }))} /></div>
            <div className="md:col-span-3 flex items-end"><Button onClick={submit}>Create Asset</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Asset Register</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets found.</p>
            ) : (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div key={asset.id || asset._id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{asset.name || asset.asset_name || 'Asset'}</p>
                      <p className="text-xs text-muted-foreground">{asset.class || asset.category || 'General'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{fmt(Number(asset.cost || asset.purchase_cost || 0))}</p>
                      <Button variant="outline" size="sm" onClick={() => removeAsset(asset.id || asset._id)}>Delete</Button>
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
