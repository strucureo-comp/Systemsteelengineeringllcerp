'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserPlus, Star, ArrowRightLeft, LogOut, AlertCircle, Award, Calendar, Zap, MessageSquare, ChevronRight, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { createHREvent } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Employee, HREvent } from '@/lib/db/types';

interface HREventsProps {
  employees: Employee[];
  events: HREvent[];
  onRefresh: () => void;
}

const eventIcons: Record<string, any> = {
  hiring: UserPlus, appraisal: Star, promotion: Award, transfer: ArrowRightLeft,
  warning: AlertCircle, layoff: LogOut, exit: LogOut,
};

const eventColors: Record<string, string> = {
  hiring: 'bg-muted text-foreground',
  appraisal: 'bg-primary/10 text-primary',
  promotion: 'bg-primary text-card-foreground',
  transfer: 'bg-muted text-muted-foreground',
  warning: 'bg-rose-50 text-rose-600',
  layoff: 'bg-rose-100 text-rose-700',
  exit: 'bg-muted text-muted-foreground',
};

export function HREvents({ employees, events, onRefresh }: HREventsProps) {
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createHREvent({
        employee_id: fd.get('employee_id') as string,
        type: fd.get('type') as string,
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || undefined,
        event_date: fd.get('event_date') as string,
        effective_date: (fd.get('effective_date') as string) || undefined,
      });
      toast.success('Lifecycle event recorded');
      setOpen(false);
      onRefresh();
    } catch { toast.error('Failed to create event'); }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48 h-9 rounded-md border-border text-xs font-medium">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {['hiring', 'appraisal', 'promotion', 'transfer', 'warning', 'layoff', 'exit'].map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90 font-medium text-xs">
              <Plus className="h-3.5 w-3.5" /> Record Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Lifecycle Event</DialogTitle>
              <DialogDescription>Milestones and administrative actions</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Employee</label>
                <select name="employee_id" required className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select name="type" required className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
                    <option value="hiring">Hiring</option>
                    <option value="appraisal">Appraisal</option>
                    <option value="promotion">Promotion</option>
                    <option value="transfer">Transfer</option>
                    <option value="warning">Warning</option>
                    <option value="exit">Exit</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input name="event_date" type="date" required className="h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input name="title" required className="h-10" />
              </div>
              <Button type="submit" className="w-full bg-primary h-10 font-medium text-xs">Commit Event</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4 before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-zinc-200">
        {filtered.map(event => {
          const Icon = eventIcons[event.type] || Award;
          return (
            <div key={event.id} className="relative pl-10 group">
              <div className={cn(
                'absolute left-2 top-4 h-4 w-4 rounded-full border-2 border-white dark:border-black z-10 transition-transform group-hover:scale-125 shadow-sm',
                event.type === 'promotion' || event.type === 'appraisal' ? 'bg-primary' : 'bg-zinc-400'
              )} />
              
              <Card className="border shadow-sm rounded-md overflow-hidden bg-card hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn(
                       "h-10 w-10 rounded-md flex items-center justify-center shrink-0 shadow-inner",
                        eventColors[event.type] || 'bg-muted'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground truncate">{event.title}</h4>
                          <Badge variant="outline" className="text-xs font-semibold">{event.type}</Badge>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{event.employee?.name}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Calendar size={12} className="text-muted-foreground/60" />
                          {new Date(event.event_date).toLocaleDateString('en-AE')}
                        </p>
                        {event.description && (
                          <div className="mt-3 p-3 bg-muted border border-border rounded text-xs font-medium text-muted-foreground italic">
                           "{event.description}"
                          </div>
                        )}
                      </div>
                    </div>
                    {event.effective_date && (
                      <div className="md:text-right border-t md:border-t-0 pt-3 md:pt-0">
                        <p className="text-xs font-medium text-muted-foreground">Effective</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{new Date(event.effective_date).toLocaleDateString('en-AE')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground italic bg-muted border border-dashed rounded-md ml-10">
            <p className="text-xs font-medium">No events in log</p>
          </div>
        )}
      </div>
    </div>
  );
}
