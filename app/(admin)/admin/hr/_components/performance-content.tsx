"use client";

import { useEffect, useState } from"react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { getPerformanceData, createPerformanceItem } from"@/lib/api";
import { format } from"date-fns";
import { Target, Award, Plus, Calendar, CheckCircle, Clock, Search, ChevronRight } from"lucide-react";
import { toast } from"sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from"@/components/ui/dialog";
import { Label } from"@/components/ui/label";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { cn } from"@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PerformanceContent() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="goals" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 border h-10 p-0.5">
            <TabsTrigger value="goals" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Objectives
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs font-semibold px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Reviews
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="goals" className="mt-0">
          <GoalsList />
        </TabsContent>

        <TabsContent value="reviews" className="mt-0">
          <ReviewsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoalsList() {
  const [goals, setGoals] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const data = await getPerformanceData('goals');
      setGoals(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!title) return toast.error("Title is required");
    try {
      await createPerformanceItem({ type: 'goal', title, description, due_date: date });
      toast.success("Goal created");
      setIsCreateOpen(false);
      loadGoals();
    } catch (e) { toast.error("Failed to create goal"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter goals..." className="h-9 pl-8 text-xs rounded-md border-border" />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90 font-medium text-xs">
              <Plus className="h-3.5 w-3.5" /> Set Objective
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Objective</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sales Growth" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Detail</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Deadline</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full bg-primary h-10 font-medium text-xs">Save Objective</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-16 bg-muted" />
                  <Skeleton className="h-4 w-12 bg-muted" />
                </div>
                <Skeleton className="h-4 w-full bg-muted" />
                <Skeleton className="h-10 w-full bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : goals.map(goal => (
          <Card key={goal.id} className="border shadow-sm rounded-md overflow-hidden bg-card hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className={cn(
                 "text-xs font-semibold",
                  goal.status === 'completed' ?"border-emerald-100 text-emerald-700 bg-emerald-50" :"text-muted-foreground"
                )}>
                  {goal.status}
                </Badge>
                {goal.due_date && (
                  <span className="text-xs font-medium text-muted-foreground flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {format(new Date(goal.due_date), 'MMM d')}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1 group-hover:text-primary transition-colors">{goal.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{goal.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {!loading && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No records found</p>
          <p className="text-sm mt-1">Records will appear here once added</p>
        </div>
      )}
    </div>
  )
}

function ReviewsList() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReviews(); }, []);

  async function loadReviews() {
    setLoading(true);
    try {
      const data = await getPerformanceData('reviews');
      setReviews(data || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border shadow-sm rounded-md overflow-hidden bg-card">
      <CardHeader className="border-b bg-muted/50 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium text-foreground">Review History</CardTitle>
        </div>
        <Award className="h-4 w-4 text-muted-foreground/60" />
      </CardHeader>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-md" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No records found</p>
            <p className="text-sm mt-1">Records will appear here once added</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-6 h-10 font-medium text-xs">Cycle</TableHead>
                <TableHead className="px-6 h-10 font-medium text-xs">Entity</TableHead>
                <TableHead className="px-6 h-10 font-medium text-xs">Status</TableHead>
                <TableHead className="px-6 h-10 font-medium text-xs">Date</TableHead>
                <TableHead className="px-6 h-10 text-right font-medium text-xs">Audit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map(review => (
                <TableRow key={review.id} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="px-6 py-4 text-xs font-medium text-foreground">{review.cycle}</TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="text-xs font-medium text-foreground">{review.user?.full_name}</p>
                    <p className="text-xs text-muted-foreground font-medium">Reviewer: {review.reviewer?.full_name}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="outline" className="text-xs font-semibold">{review.status}</Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-medium text-muted-foreground">
                    {review.review_date ? format(new Date(review.review_date), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/60" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  )
}
