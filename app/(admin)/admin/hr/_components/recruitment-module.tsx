"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Briefcase, Users, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  getJobOpenings,
  getApplicants,
  getOfferLetters,
  getDepartments,
  getHRRoles,
  createJobOpening,
  createApplicant,
  createOfferLetter,
  convertApplicantToEmployee,
  updateJobOpeningStatus,
  acceptOfferLetter,
  updateApplicant,
} from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface JobOpening {
  id: string;
  job_title: string;
  department_id?: { name: string };
  positions: number;
  status: 'open' | 'on-hold' | 'closed' | 'filled';
  posted_date: string;
  closing_date?: string;
}

interface Applicant {
  id: string;
  job_opening_id: { id?: string; job_title: string };
  applicant_name: string;
  email: string;
  phone: string;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'hired';
  applied_date: string;
  total_experience?: number;
}

interface OfferLetter {
  id: string;
  applicant_id: { applicant_name: string; job_opening_id?: { id?: string } };
  designation: string;
  gross_salary: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'withdrawn';
  offer_date: string;
  joining_date?: string;
}

export default function RecruitmentModule() {
  const { toast } = useToast();
  const { baseCurrency } = useCompanySettings();
  const [activeTab, setActiveTab] = useState('job-openings');
  const [selectedJobOpening, setSelectedJobOpening] = useState<string | null>(null);
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [offerLetters, setOfferLetters] = useState<OfferLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Fetch data
  const fetchJobOpenings = async () => {
    try {
      const data = await getJobOpenings();
      setJobOpenings(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch job openings', variant: 'destructive' });
    }
  };

  const fetchApplicants = async () => {
    try {
      const data = await getApplicants();
      setApplicants(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch applicants', variant: 'destructive' });
    }
  };

  const fetchOfferLetters = async () => {
    try {
      const data = await getOfferLetters();
      setOfferLetters(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch offer letters', variant: 'destructive' });
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data || []);
    } catch (err) {
      console.error('Failed to fetch departments');
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await getHRRoles();
      setRoles(data || []);
    } catch (err) {
      console.error('Failed to fetch roles');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchJobOpenings(),
        fetchApplicants(),
        fetchOfferLetters(),
        fetchDepartments(),
        fetchRoles()
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className?: string }> = {
      open: { variant: 'destructive' },
      closed: { variant: 'outline', className: 'bg-gray-100 text-gray-600' },
      'on-hold': { variant: 'secondary', className: 'bg-yellow-100 text-yellow-700' },
      filled: { variant: 'default', className: 'bg-green-100 text-green-700' },
      screening: { variant: 'secondary' },
      interview: { variant: 'outline' },
      offer: { variant: 'default' },
      hired: { variant: 'default' },
      rejected: { variant: 'destructive' },
      draft: { variant: 'secondary' },
      sent: { variant: 'outline' },
      accepted: { variant: 'default' },
    };
    const config = variants[status] || { variant: 'secondary' };
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const result = await updateJobOpeningStatus(jobId, newStatus);
      if (result) {
        toast({ title: 'Success', description: `Job opening status updated to ${newStatus}` });
        fetchJobOpenings();
      } else {
        toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  // Filter applicants and offers for selected job opening
  const filteredApplicants = selectedJobOpening 
    ? applicants.filter(a => a.job_opening_id?.id === selectedJobOpening || (a.job_opening_id as any)?._id === selectedJobOpening)
    : [];

  const filteredOfferLetters = selectedJobOpening
    ? offerLetters.filter(o => {
        // Find the applicant for this offer
        const applicant = applicants.find(a => a.id === (o.applicant_id as any)?.id || a.id === (o.applicant_id as any)?._id);
        if (!applicant) return false;
        // Check if applicant belongs to selected job opening
        return applicant.job_opening_id?.id === selectedJobOpening || (applicant.job_opening_id as any)?._id === selectedJobOpening;
      })
    : [];

  const selectedJob = jobOpenings.find(j => j.id === selectedJobOpening);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recruitment Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedJob ? `Showing recruitment pipeline for: ${selectedJob.job_title}` : 'Select a job opening to view its recruitment pipeline'}
          </p>
        </div>
        <div className="flex gap-2">
          <JobOpeningDialog onSuccess={fetchJobOpenings} departments={departments} roles={roles} />
          {selectedJobOpening && selectedJob?.status === 'open' && (
            <>
              <ApplicantDialog onSuccess={fetchApplicants} jobOpenings={jobOpenings} selectedJobId={selectedJobOpening} />
              <OfferLetterDialog onSuccess={fetchOfferLetters} applicants={filteredApplicants} departments={departments} />
            </>
          )}
        </div>
      </div>

      {/* Unified Three-Column Pipeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Job Openings */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Job Openings ({jobOpenings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24 bg-muted" />
                        <Skeleton className="h-4 w-12 bg-muted rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-32 bg-muted" />
                      <div className="space-y-2">
                        <Skeleton className="h-2 w-full bg-muted" />
                        <Skeleton className="h-2 w-full bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : jobOpenings.map((job) => (
                <Card 
                  key={job.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedJobOpening === job.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                  onClick={() => setSelectedJobOpening(job.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm">{job.job_title}</h4>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {job.department_id?.name || 'No Department'}
                    </p>
                    <div className="space-y-1 text-xs">
                      <p><strong>Positions:</strong> {job.positions}</p>
                      <p><strong>Posted:</strong> {new Date(job.posted_date).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                      <Select value={job.status} onValueChange={(newStatus) => handleStatusChange(job.id, newStatus)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">🟢 Open</SelectItem>
                          <SelectItem value="closed">⚫ Closed</SelectItem>
                          <SelectItem value="on-hold">🟡 On Hold</SelectItem>
                          <SelectItem value="filled">✅ Filled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {jobOpenings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No job openings yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Applicants */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Applicants ({filteredApplicants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-24 bg-muted" />
                          <Skeleton className="h-3 w-16 bg-muted" />
                        </div>
                        <Skeleton className="h-4 w-12 bg-muted rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-2 w-full bg-muted" />
                        <Skeleton className="h-2 w-full bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !selectedJobOpening ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Select a job opening to view applicants</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredApplicants.map((applicant) => (
                  <Card key={applicant.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{applicant.applicant_name}</h4>
                          {getStatusBadge(applicant.status)}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p><strong>Email:</strong> {applicant.email}</p>
                        <p><strong>Phone:</strong> {applicant.phone}</p>
                        {applicant.total_experience && (
                          <p><strong>Experience:</strong> {applicant.total_experience} yrs</p>
                        )}
                        <p><strong>Applied:</strong> {new Date(applicant.applied_date).toLocaleDateString()}</p>
                      </div>
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-1">
                        {applicant.status === 'applied' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                const result = await updateApplicant(applicant.id, { status: 'screening' });
                                if (result) {
                                  toast({ title: 'Success', description: 'Applicant approved and moved to screening' });
                                  fetchApplicants();
                                } else {
                                  toast({ title: 'Error', description: 'Failed to approve applicant', variant: 'destructive' });
                                }
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to reject ${applicant.applicant_name}?`)) return;
                                const result = await updateApplicant(applicant.id, { status: 'rejected' });
                                if (result) {
                                  toast({ title: 'Success', description: 'Applicant rejected' });
                                  fetchApplicants();
                                } else {
                                  toast({ title: 'Error', description: 'Failed to reject applicant', variant: 'destructive' });
                                }
                              }}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {applicant.status === 'screening' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="h-7 text-xs"
                              onClick={async () => {
                                const result = await updateApplicant(applicant.id, { status: 'interview' });
                                if (result) {
                                  toast({ title: 'Success', description: 'Applicant moved to interview stage' });
                                  fetchApplicants();
                                } else {
                                  toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
                                }
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Move to Interview
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to reject ${applicant.applicant_name}?`)) return;
                                const result = await updateApplicant(applicant.id, { status: 'rejected' });
                                if (result) {
                                  toast({ title: 'Success', description: 'Applicant rejected' });
                                  fetchApplicants();
                                } else {
                                  toast({ title: 'Error', description: 'Failed to reject applicant', variant: 'destructive' });
                                }
                              }}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {applicant.status === 'interview' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="h-7 text-xs"
                              onClick={async () => {
                                const result = await updateApplicant(applicant.id, { status: 'offer' });
                                if (result) {
                                  toast({ title: 'Success', description: 'Applicant moved to offer stage - ready for offer letter' });
                                  fetchApplicants();
                                } else {
                                  toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
                                }
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Send Offer
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to reject ${applicant.applicant_name}?`)) return;
                                const result = await updateApplicant(applicant.id, { status: 'rejected' });
                                if (result) {
                                  toast({ title: 'Success', description: 'Applicant rejected' });
                                  fetchApplicants();
                                } else {
                                  toast({ title: 'Error', description: 'Failed to reject applicant', variant: 'destructive' });
                                }
                              }}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {(applicant.status === 'offer' || applicant.status === 'hired') && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={async () => {
                              const result = await convertApplicantToEmployee(applicant.id);
                              if (result) {
                                toast({ title: 'Success', description: 'Applicant converted to employee' });
                                fetchApplicants();
                              } else {
                                toast({ title: 'Error', description: 'Failed to convert', variant: 'destructive' });
                              }
                            }}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Convert to Employee
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredApplicants.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No applicants for this job opening</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 3: Offer Letters */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Offer Letters ({filteredOfferLetters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24 bg-muted" />
                        <Skeleton className="h-4 w-12 bg-muted rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-32 bg-muted" />
                      <div className="space-y-2">
                        <Skeleton className="h-2 w-full bg-muted" />
                        <Skeleton className="h-2 w-full bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !selectedJobOpening ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Select a job opening to view offer letters</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredOfferLetters.map((offer) => (
                  <Card key={offer.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{offer.applicant_id?.applicant_name || 'Applicant'}</h4>
                          {getStatusBadge(offer.status)}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{offer.designation}</p>
                      <div className="space-y-1 text-xs">
                        <p><strong>Salary:</strong> {formatCurrency(offer.gross_salary || 0, baseCurrency)}</p>
                        <p><strong>Offer Date:</strong> {new Date(offer.offer_date).toLocaleDateString()}</p>
                        {offer.joining_date && (
                          <p><strong>Joining:</strong> {new Date(offer.joining_date).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t flex gap-1">
                        {offer.status === 'sent' && (
                          <Button 
                            size="sm" 
                            className="h-7 text-xs flex-1"
                            onClick={async () => {
                              const result = await acceptOfferLetter(offer.id);
                              if (result) {
                                toast({ title: 'Success', description: 'Offer accepted and employee created!' });
                                fetchOfferLetters();
                                fetchApplicants();
                              } else {
                                toast({ title: 'Error', description: 'Failed to accept offer', variant: 'destructive' });
                              }
                            }}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Accept Offer
                          </Button>
                        )}
                        {offer.status === 'accepted' && (
                          <Badge variant="default" className="text-xs">
                            ✓ Employee Created
                          </Badge>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredOfferLetters.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No offer letters sent yet</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Job Opening Dialog
function JobOpeningDialog({ onSuccess, departments, roles }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    job_title: '',
    department_id: '',
    hr_role_id: '',
    positions: 1,
    employment_type: 'full-time',
    job_description: '',
    salary_range: { min: 0, max: 0 }
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createJobOpening(formData);
      if (created) {
        toast({ title: 'Success', description: 'Job opening created successfully' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create job opening', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> New Job Opening</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Job Opening</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Job Title</Label>
            <Input value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} required />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={formData.department_id} onValueChange={(v) => setFormData({...formData, department_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept: any) => (
                  <SelectItem key={dept.id || dept._id} value={dept.id || dept._id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={formData.hr_role_id} onValueChange={(v) => setFormData({...formData, hr_role_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role: any) => (
                  <SelectItem key={role.id || role._id} value={role.id || role._id}>{role.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Number of Positions</Label>
            <Input type="number" value={formData.positions} onChange={(e) => setFormData({...formData, positions: parseInt(e.target.value)})} required />
          </div>
          <div>
            <Label>Job Description</Label>
            <Textarea value={formData.job_description} onChange={(e) => setFormData({...formData, job_description: e.target.value})} rows={4} />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Create Job Opening</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Applicant Dialog
function ApplicantDialog({ onSuccess, jobOpenings }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    job_opening_id: '',
    applicant_name: '',
    email: '',
    phone: '',
    total_experience: 0,
    expected_salary: 0
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createApplicant(formData);
      if (created) {
        toast({ title: 'Success', description: 'Applicant added successfully' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add applicant', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Applicant</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Applicant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Job Opening</Label>
            <Select value={formData.job_opening_id} onValueChange={(v) => setFormData({...formData, job_opening_id: v})} required>
              <SelectTrigger>
                <SelectValue placeholder="Select job opening" />
              </SelectTrigger>
              <SelectContent>
                {jobOpenings.filter((jo: any) => jo.status === 'open').map((job: any) => (
                  <SelectItem key={job.id} value={job.id}>{job.job_title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Applicant Name</Label>
            <Input value={formData.applicant_name} onChange={(e) => setFormData({...formData, applicant_name: e.target.value})} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <Label>Experience (years)</Label>
            <Input type="number" value={formData.total_experience} onChange={(e) => setFormData({...formData, total_experience: parseFloat(e.target.value)})} />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Add Applicant</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Offer Letter Dialog
function OfferLetterDialog({ onSuccess, applicants, departments }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    applicant_id: '',
    designation: '',
    department_id: '',
    basic_salary: 0,
    joining_date: '',
    employment_type: 'full-time',
    probation_period: 3
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedApplicant = applicants.find((a: any) => a.id === formData.applicant_id);
      const created = await createOfferLetter({
        ...formData,
        job_opening_id: selectedApplicant?.job_opening_id?.id || selectedApplicant?.job_opening_id?._id,
      });
      if (created) {
        toast({ title: 'Success', description: 'Offer letter created successfully' });
        setOpen(false);
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create offer letter', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Create Offer Letter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Offer Letter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Applicant</Label>
            <Select value={formData.applicant_id} onValueChange={(v) => setFormData({...formData, applicant_id: v})} required>
              <SelectTrigger>
                <SelectValue placeholder="Select applicant" />
              </SelectTrigger>
              <SelectContent>
                {applicants.filter((a: any) => a.status === 'offer' || a.status === 'interview').map((app: any) => (
                  <SelectItem key={app.id} value={app.id}>{app.applicant_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Designation</Label>
            <Input value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} required />
          </div>
          <div>
            <Label>Basic Salary (AED)</Label>
            <Input type="number" value={formData.basic_salary} onChange={(e) => setFormData({...formData, basic_salary: parseFloat(e.target.value)})} required />
          </div>
          <div>
            <Label>Joining Date</Label>
            <Input type="date" value={formData.joining_date} onChange={(e) => setFormData({...formData, joining_date: e.target.value})} />
          </div>
          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Create Offer</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
