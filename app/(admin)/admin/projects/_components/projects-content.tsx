"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveTimesheet, approveExpense, getResourceBookings, createResourceBooking, getUsers, getProjects } from "@/lib/api";
import { format, addDays, startOfWeek } from "date-fns";
import { Check, X, Clock, Receipt, Calendar, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function ProjectsContent() {
    return (
        <Tabs defaultValue="timesheets" className="space-y-4">
            <TabsList>
                <TabsTrigger value="timesheets" className="gap-2"><Clock className="h-4 w-4" /> Timesheets</TabsTrigger>
                <TabsTrigger value="expenses" className="gap-2"><Receipt className="h-4 w-4" /> Expenses</TabsTrigger>
                <TabsTrigger value="schedule" className="gap-2"><Calendar className="h-4 w-4" /> Scheduling</TabsTrigger>
            </TabsList>

            <TabsContent value="timesheets" className="space-y-4">
                <TimesheetList />
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
                <ExpenseList />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
                <SchedulingContent />
            </TabsContent>
        </Tabs>
    );
}

function TimesheetList() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Timesheets</CardTitle>
                <CardDescription>Review and approve employee time entries</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground p-4 text-center">
                    No pending timesheets found.
                </div>
            </CardContent>
        </Card>
    )
}

function ExpenseList() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Expense Claims</CardTitle>
                <CardDescription>Review project-related expenses</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground p-4 text-center">
                    No pending expenses found.
                </div>
            </CardContent>
        </Card>
    )
}

function SchedulingContent() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [isBookOpen, setIsBookOpen] = useState(false);

    // Booking Form
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [hours, setHours] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const [bookingsData, usersData, projectsData] = await Promise.all([
            getResourceBookings(),
            getUsers(),
            getProjects()
        ]);
        setBookings(bookingsData || []);
        setUsers(usersData || []);
        setProjects(projectsData || []);
    }

    async function handleBooking() {
        if (!selectedUser || !selectedProject || !startDate || !endDate) return toast.error("Missing fields");

        try {
            await createResourceBooking({
                project_id: selectedProject,
                user_id: selectedUser,
                start_date: startDate,
                end_date: endDate,
                hours: Number(hours) || 8
            });
            toast.success("Resource Booked");
            setIsBookOpen(false);
            loadData();
        } catch (e) {
            toast.error("Booking failed");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Resource Allocation</h3>
                <Dialog open={isBookOpen} onOpenChange={setIsBookOpen}>
                    <DialogTrigger asChild>
                        <Button><UserPlus className="mr-2 h-4 w-4" /> Book Resource</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Book Resource</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Project</Label>
                                <Select onValueChange={setSelectedProject}>
                                    <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                                    <SelectContent>
                                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Resource (User)</Label>
                                <Select onValueChange={setSelectedUser}>
                                    <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input type="date" onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input type="date" onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Total Hours</Label>
                                <Input type="number" placeholder="40" onChange={e => setHours(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter><Button onClick={handleBooking}>Confirm Booking</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookings.map(booking => (
                    <Card key={booking.id} className="relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <CardHeader className="pl-6 pb-2">
                            <CardTitle className="text-base">{booking.user?.full_name}</CardTitle>
                            <CardDescription>{booking.project?.title}</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-6 pt-2">
                            <div className="text-sm font-medium flex items-center gap-2 mb-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {Number(booking.hours)} hours allocated
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {bookings.length === 0 && (
                <div className="text-center p-8 text-muted-foreground bg-muted rounded-xl border border-dashed border-border">
                    No active resource bookings.
                </div>
            )}
        </div>
    );
}
