'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, CheckCircle, XCircle, Eye, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function ProductionOrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    bom_id: '',
    quantity: '',
    priority: 'medium',
    planned_start_date: '',
    planned_end_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchBOMs();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/production-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/production-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Production order created successfully');
        setDialogOpen(false);
        fetchOrders();
        setFormData({
          bom_id: '',
          quantity: '',
          priority: 'medium',
          planned_start_date: '',
          planned_end_date: '',
          notes: ''
        });
      } else {
        toast.error('Failed to create production order');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleStart = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/manufacturing/production-orders/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Production order started');
        fetchOrders();
      } else {
        toast.error('Failed to start order');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: 'secondary',
      planned: 'default',
      released: 'outline',
      in_progress: 'default',
      quality_check: 'default',
      completed: 'default',
      cancelled: 'destructive'
    };

    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      planned: 'bg-blue-100 text-blue-800',
      released: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      quality_check: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600'
    };

    return (
      <Badge variant="outline" className={colors[priority]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 border-b pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Production Orders</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Monitor and manage active manufacturing runs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Create Order</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-semibold">New Production Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="p-6 pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Select BOM</Label>
                  <Select value={formData.bom_id} onValueChange={(v) => setFormData({ ...formData, bom_id: v })}>
                    <SelectTrigger className="bg-muted/30 focus:bg-background transition-colors">
                      <SelectValue placeholder="Choose a BOM structure" />
                    </SelectTrigger>
                    <SelectContent>
                      {boms.map((bom) => (
                        <SelectItem key={bom._id} value={bom._id}>
                          {bom.code} - {bom.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Batch Quantity</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="bg-muted/30 focus:bg-background transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                   <Label className="text-sm font-medium text-foreground/80">Planned Start Date</Label>
                   <Input
                    type="date"
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-2">
                   <Label className="text-sm font-medium text-foreground/80">Estimated Completion</Label>
                   <Input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Special Instructions / Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="bg-muted/30 focus:bg-background transition-colors resize-none"
                  placeholder="Any specific manufacturing requirements..."
                />
              </div>

              <div className="flex justify-end pt-4 gap-3">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="px-8 bg-primary shadow-lg shadow-primary/20">Release Order</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: Card View */}
        <div className="block lg:hidden divide-y divide-border/50">
          {orders.map((order) => (
            <div key={order._id} className="p-4 space-y-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.product_name}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Quantity</p>
                    <p className="text-sm font-semibold">{order.quantity}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Produced</p>
                    <p className="text-sm font-semibold text-primary">{order.quantity_produced || 0}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Priority</p>
                    <div className="mt-0.5">{getPriorityBadge(order.priority)}</div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Cost</p>
                    <p className="text-sm font-bold">AED {order.total_cost?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {order.status === 'planned' && (
                    <Button size="sm" variant="outline" onClick={() => handleStart(order._id)} className="flex-1 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                      <Play className="h-3 w-3 mr-2 fill-current" />
                      Start Run
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="flex-1 rounded-full hover:bg-muted">
                    <Eye className="h-3 w-3 mr-2" />
                    Details
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
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Order #</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Product</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Batch</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Output</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Priority</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Status</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-right">Production Cost</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center tracking-tighter w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 font-bold text-sm tracking-tight">{order.order_number}</td>
                  <td className="p-4 text-sm font-medium">{order.product_name}</td>
                  <td className="p-4 text-center font-bold text-sm">{order.quantity}</td>
                  <td className="p-4 text-center font-bold text-sm text-primary">{order.quantity_produced || 0}</td>
                  <td className="p-4">{getPriorityBadge(order.priority)}</td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4 text-right font-black text-sm">AED {order.total_cost?.toFixed(2) || '0.00'}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-end gap-1">
                      {order.status === 'planned' && (
                        <Button size="icon" variant="ghost" onClick={() => handleStart(order._id)} className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full">
                          <Play className="h-4 w-4 fill-current" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Package className="h-6 w-6 opacity-20" />
            </div>
            <p className="text-sm font-medium italic">No production orders found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
