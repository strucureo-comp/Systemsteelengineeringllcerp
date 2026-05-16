'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Factory } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function WorkCenterList() {
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'assembly',
    capacity_per_hour: '',
    cost_per_hour: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    fetchWorkCenters();
  }, []);

  const fetchWorkCenters = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/work-centers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkCenters(data);
      }
    } catch (error) {
      console.error('Failed to fetch work centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/manufacturing/work-centers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Work center created successfully');
        setDialogOpen(false);
        fetchWorkCenters();
        setFormData({
          code: '',
          name: '',
          type: 'assembly',
          capacity_per_hour: '',
          cost_per_hour: '',
          location: '',
          description: ''
        });
      } else {
        toast.error('Failed to create work center');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 border-b pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Work Centers</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Manage production facilities and resource throughput</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Facility</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl font-semibold">New Work Center</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="p-6 pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Internal Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="WC-001"
                    required
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Facility Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className="bg-muted/30 focus:bg-background transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assembly">Assembly Line</SelectItem>
                      <SelectItem value="machining">Machining Shop</SelectItem>
                      <SelectItem value="welding">Welding Station</SelectItem>
                      <SelectItem value="painting">Painting Booth</SelectItem>
                      <SelectItem value="packaging">Packaging Unit</SelectItem>
                      <SelectItem value="quality">Quality Lab</SelectItem>
                      <SelectItem value="other">General Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-foreground/80">Work Center Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Primary Production Floor - Phase 1"
                    required
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Units Per Hour (Capacity)</Label>
                  <Input
                    type="number"
                    value={formData.capacity_per_hour}
                    onChange={(e) => setFormData({ ...formData, capacity_per_hour: e.target.value })}
                    placeholder="0"
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Operating Cost Per Hour</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost_per_hour}
                    onChange={(e) => setFormData({ ...formData, cost_per_hour: e.target.value })}
                    placeholder="0.00"
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-foreground/80">Physical Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Building A, Wing 2, Floor 1"
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-foreground/80">Facility Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="bg-muted/30 focus:bg-background transition-colors resize-none"
                    placeholder="Technical specifications or notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="px-8 bg-primary shadow-lg shadow-primary/20">Register Facility</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: Card View */}
        <div className="block lg:hidden divide-y divide-border/50">
          {workCenters.map((wc) => (
            <div key={wc._id} className="p-4 space-y-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{wc.name}</p>
                    <p className="text-xs text-muted-foreground">{wc.code}</p>
                  </div>
                  <Badge className="bg-primary/5 text-primary border-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight">
                    {wc.type}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Units / Hr</p>
                    <p className="text-sm font-semibold">{wc.capacity_per_hour || 0}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Running Cost</p>
                    <p className="text-sm font-bold text-emerald-600">AED {wc.cost_per_hour?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="col-span-2 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-[8px]">Location Tag</p>
                    <p className="text-sm font-medium italic opacity-70">{wc.location || 'Not Specified'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-full border-border/50 hover:bg-muted">
                    <Edit className="h-3 w-3 mr-2" />
                    Configure
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3 w-3 mr-2" />
                    Remove
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
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Facility Name</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Class</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-center">Output Rate</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-right">Opex / Hour</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-left">Location</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {workCenters.map((wc) => (
                <tr key={wc._id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 font-bold text-sm tracking-tight">{wc.code}</td>
                  <td className="p-4 text-sm font-medium">{wc.name}</td>
                  <td className="p-4 text-center">
                    <Badge variant="outline" className="border-primary/20 text-primary px-2 shadow-none text-[10px] bg-primary/5">
                      {wc.type}
                    </Badge>
                  </td>
                  <td className="p-4 text-center font-bold text-sm">{wc.capacity_per_hour || 0} U/h</td>
                  <td className="p-4 text-right font-black text-sm text-emerald-600">AED {wc.cost_per_hour?.toFixed(2) || '0.00'}</td>
                  <td className="p-4 text-sm text-muted-foreground">{wc.location || 'N/A'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {workCenters.length === 0 && (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Factory className="h-6 w-6 opacity-20" />
            </div>
            <p className="text-sm font-medium italic">No work centers registered.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
