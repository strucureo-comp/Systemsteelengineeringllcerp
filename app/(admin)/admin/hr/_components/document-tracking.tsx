"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, AlertCircle, Calendar, User, Eye } from 'lucide-react';
import { getEmployeeDocuments, getEmployees, createEmployeeDocument } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';

interface EmployeeDocument {
  id: string;
  employee?: { name: string; employee_id: string };
  employee_id?: string | { name: string; employee_id: string };
  document_type: string;
  document_name: string;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_authority: string;
  status: 'active' | 'expired' | 'renewed' | 'cancelled';
  is_expired: boolean;
  has_expiry: boolean;
  issuing_country?: string;
  sponsor?: string;
  profession?: string;
  notes?: string;
}

interface EmployeeWithDocs {
  id: string;
  name: string;
  employee_id: string;
  documents: EmployeeDocument[];
  totalDocs: number;
  expiringDocs: number;
  expiredDocs: number;
}

export default function DocumentTrackingModule() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesWithDocs, setEmployeesWithDocs] = useState<EmployeeWithDocs[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDocs | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const data = await getEmployeeDocuments();
      setDocuments(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch documents', variant: 'destructive' });
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to fetch employees');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchDocuments(), fetchEmployees()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  // Group documents by employee
  useEffect(() => {
    if (employees.length > 0 && documents.length >= 0) {
      const grouped = employees.map(emp => {
        const empDocs = documents.filter(doc => {
          const docEmpId = typeof doc.employee_id === 'string' ? doc.employee_id : (doc.employee_id as any)?._id || (doc.employee_id as any)?.id;
          return docEmpId === emp.id || doc.employee?.employee_id === emp.employee_id;
        });

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiringDocs = empDocs.filter(doc => {
          if (!doc.expiry_date || doc.is_expired) return false;
          const expiryDate = new Date(doc.expiry_date);
          return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
        });

        const expiredDocs = empDocs.filter(doc => doc.is_expired);

        return {
          id: emp.id || emp._id,
          name: emp.name,
          employee_id: emp.employee_id,
          documents: empDocs,
          totalDocs: empDocs.length,
          expiringDocs: expiringDocs.length,
          expiredDocs: expiredDocs.length
        };
      });

      setEmployeesWithDocs(grouped);
    }
  }, [employees, documents]);

  const filteredEmployees = employeesWithDocs.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (doc: EmployeeDocument) => {
    if (doc.is_expired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (doc.status === 'active') {
      const daysUntilExpiry = Math.ceil((new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Expiring Soon ({daysUntilExpiry}d)</Badge>;
      }
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="secondary">{doc.status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employee Documents & Expiry Tracking</h2>
        <DocumentDialog onSuccess={() => { fetchDocuments(); }} employees={employees} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input 
            placeholder="Search employees by name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{employeesWithDocs.length} Employees</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-muted" />
                    <Skeleton className="h-3 w-16 bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-muted" />
                  <Skeleton className="h-4 w-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredEmployees.map((emp) => (
          <Card 
            key={emp.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer group relative"
            onClick={() => {
              setSelectedEmployee(emp);
              setDetailsOpen(true);
            }}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.employee_id}</p>
                  </div>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Documents:</span>
                  <Badge variant="secondary">{emp.totalDocs}</Badge>
                </div>

                {emp.expiringDocs > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-600">Expiring Soon:</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{emp.expiringDocs}</Badge>
                  </div>
                )}

                {emp.expiredDocs > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600">Expired:</span>
                    <Badge variant="destructive">{emp.expiredDocs}</Badge>
                  </div>
                )}

                {emp.totalDocs === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center pt-2">No documents on file</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No employees found matching your search</p>
          </CardContent>
        </Card>
      )}

      <EmployeeDocumentsDialog 
        employee={selectedEmployee}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
}

function EmployeeDocumentsDialog({ employee, open, onOpenChange, getStatusBadge }: any) {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            {employee.name}'s Documents
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Employee ID: {employee.employee_id} • {employee.totalDocs} {employee.totalDocs === 1 ? 'document' : 'documents'} on file
          </p>
        </DialogHeader>

        {employee.totalDocs === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-md">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add documents using the "Add Document" button above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employee.documents.map((doc: EmployeeDocument) => (
              <Card key={doc.id} className={doc.is_expired ? 'border-red-200 bg-red-50/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{doc.document_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                      </div>
                    </div>
                    {getStatusBadge(doc)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {doc.document_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">Document Number</p>
                        <p className="font-medium">{doc.document_number}</p>
                      </div>
                    )}
                    {doc.issuing_authority && (
                      <div>
                        <p className="text-xs text-muted-foreground">Issuing Authority</p>
                        <p className="font-medium">{doc.issuing_authority}</p>
                      </div>
                    )}
                    {doc.issue_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Issue Date</p>
                        <p className="font-medium">{new Date(doc.issue_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {doc.expiry_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Expiry Date</p>
                        <p className={`font-medium ${doc.is_expired ? 'text-red-600' : ''}`}>
                          {new Date(doc.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {doc.issuing_country && (
                      <div>
                        <p className="text-xs text-muted-foreground">Country</p>
                        <p className="font-medium">{doc.issuing_country}</p>
                      </div>
                    )}
                    {doc.sponsor && (
                      <div>
                        <p className="text-xs text-muted-foreground">Sponsor</p>
                        <p className="font-medium">{doc.sponsor}</p>
                      </div>
                    )}
                    {doc.profession && (
                      <div>
                        <p className="text-xs text-muted-foreground">Profession</p>
                        <p className="font-medium">{doc.profession}</p>
                      </div>
                    )}
                  </div>

                  {doc.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{doc.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Button onClick={() => onOpenChange(false)} className="w-full">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

function DocumentDialog({ onSuccess, employees }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    document_type: 'passport',
    document_name: '',
    document_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
    issuing_country: '',
    sponsor: '',
    profession: '',
    has_expiry: true,
    notes: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createEmployeeDocument(formData);
      if (created) {
        toast({ title: 'Success', description: 'Document added successfully' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add document', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Document</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Employee Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select value={formData.employee_id} onValueChange={(v) => setFormData({...formData, employee_id: v})} required>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id || emp._id} value={emp.id || emp._id}>{emp.name} ({emp.employee_id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Document Type</Label>
            <Select value={formData.document_type} onValueChange={(v) => setFormData({...formData, document_type: v})} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passport">Passport</SelectItem>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="emirates_id">Emirates ID</SelectItem>
                <SelectItem value="labour_card">Labour Card</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="driving_license">Driving License</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Document Name</Label>
            <Input value={formData.document_name} onChange={(e) => setFormData({...formData, document_name: e.target.value})} required />
          </div>
          <div>
            <Label>Document Number</Label>
            <Input value={formData.document_number} onChange={(e) => setFormData({...formData, document_number: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={formData.issue_date} onChange={(e) => setFormData({...formData, issue_date: e.target.value})} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
            </div>
          </div>
          <div>
            <Label>Issuing Authority</Label>
            <Input value={formData.issuing_authority} onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={formData.issuing_country} onChange={(e) => setFormData({...formData, issuing_country: e.target.value})} />
          </div>
          {(formData.document_type === 'visa' || formData.document_type === 'labour_card') && (
            <>
              <div>
                <Label>Sponsor</Label>
                <Input value={formData.sponsor} onChange={(e) => setFormData({...formData, sponsor: e.target.value})} />
              </div>
              <div>
                <Label>Profession</Label>
                <Input value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} />
              </div>
            </>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Add Document</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
