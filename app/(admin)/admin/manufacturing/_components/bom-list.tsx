'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function BOMList() {
  const [boms, setBoms] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    product_id: '',
    description: '',
    version: '1.0',
    labor_cost: '',
    overhead_cost: '',
    components: [{ item_id: '', quantity: '', waste_factor: '0' }]
  });

  useEffect(() => {
    fetchBOMs();
    fetchItems();
  }, []);

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/boms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBoms(data);
      }
    } catch (error) {
      console.error('Failed to fetch BOMs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/inventory/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/boms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('BOM created successfully');
        setDialogOpen(false);
        fetchBOMs();
        setFormData({
          code: '',
          product_id: '',
          description: '',
          version: '1.0',
          labor_cost: '',
          overhead_cost: '',
          components: [{ item_id: '', quantity: '', waste_factor: '0' }]
        });
      } else {
        toast.error('Failed to create BOM');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [...formData.components, { item_id: '', quantity: '', waste_factor: '0' }]
    });
  };

  const removeComponent = (index: number) => {
    const newComponents = formData.components.filter((_, i) => i !== index);
    setFormData({ ...formData, components: newComponents });
  };

  const updateComponent = (index: number, field: string, value: string) => {
    const newComponents = [...formData.components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setFormData({ ...formData, components: newComponents });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 border-b pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Bill of Materials (BOM)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Configure product structures and component breakdown</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Create BOM</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-semibold">New Bill of Materials</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="p-6 pt-4 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">BOM Reference Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. BOM-PROD-001"
                    required
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Revision / Version</Label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-foreground/80">Finished Product</Label>
                  <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                    <SelectTrigger className="bg-muted/30 focus:bg-background transition-colors">
                      <SelectValue placeholder="Select output product" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.sku} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-foreground/80">Purpose / Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="bg-muted/30 focus:bg-background transition-colors resize-none"
                    placeholder="Describe the assembly process or usage..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Labor Cost (Per Unit)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                    placeholder="0.00"
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Manufacturing Overhead</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.overhead_cost}
                    onChange={(e) => setFormData({ ...formData, overhead_cost: e.target.value })}
                    placeholder="0.00"
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-dashed">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Component Items</Label>
                    <p className="text-xs text-muted-foreground tracking-tight">Add raw materials and sub-assemblies</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addComponent} className="h-8 rounded-full">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Entry
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.components.map((comp, index) => (
                    <div key={index} className="flex gap-3 items-end bg-muted/20 p-3 rounded-xl border border-border/50 group relative animate-in fade-in zoom-in duration-200">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Select Item</Label>
                        <Select
                          value={comp.item_id}
                          onValueChange={(v) => updateComponent(index, 'item_id', v)}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Choose material" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item._id} value={item._id}>
                                {item.sku} - {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Quantity</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={comp.quantity}
                          onChange={(e) => updateComponent(index, 'quantity', e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="w-24 space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Waste %</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={comp.waste_factor}
                          onChange={(e) => updateComponent(index, 'waste_factor', e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeComponent(index)}
                        disabled={formData.components.length === 1}
                        className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 mb-0.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="px-8 bg-primary shadow-lg shadow-primary/20">Finalize BOM Structure</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: Card View */}
        <div className="block lg:hidden divide-y divide-border/50">
          {boms.map((bom) => (
            <div key={bom._id} className="p-4 space-y-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{bom.code}</p>
                    <p className="text-xs text-muted-foreground">{bom.product_name}</p>
                  </div>
                  <Badge className={bom.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                    {bom.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Version</p>
                    <p className="text-sm font-semibold">{bom.version}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Components</p>
                    <p className="text-sm font-bold text-primary">{bom.components?.length || 0}</p>
                  </div>
                  <div className="col-span-2 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Production Cost</p>
                    <p className="text-base font-black">AED {bom.total_manufacturing_cost?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-full border-border/50 hover:bg-muted">
                    <Edit className="h-3 w-3 mr-2" />
                    Edit BOM
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 rounded-full hover:bg-muted">
                    <Package className="h-3 w-3 mr-2" />
                    Structure
                  </Button>
                </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b border-border/50">
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Code</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Finished Product</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Rev</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Items</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-right">Production Cost</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Status</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {boms.map((bom) => (
                <tr key={bom._id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 font-bold text-sm tracking-tight">{bom.code}</td>
                  <td className="p-4 text-sm font-medium">{bom.product_name}</td>
                  <td className="p-4 text-sm font-semibold text-muted-foreground">v{bom.version}</td>
                  <td className="p-4 text-center font-bold text-sm text-primary">{bom.components?.length || 0}</td>
                  <td className="p-4 text-right font-black text-sm">AED {bom.total_manufacturing_cost?.toFixed(2) || '0.00'}</td>
                  <td className="p-4 text-center">
                    <Badge className={bom.is_active ? 'bg-emerald-50 text-emerald-600 border-none px-2 shadow-none' : 'bg-gray-50 text-gray-500 border-none px-2 shadow-none'}>
                      {bom.is_active ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {boms.length === 0 && (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 opacity-20" />
            </div>
            <p className="text-sm font-medium italic">No BOMs found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
