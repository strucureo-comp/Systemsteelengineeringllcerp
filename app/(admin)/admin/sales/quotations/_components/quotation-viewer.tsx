'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, Check, X, Download } from 'lucide-react';
import { authHeaders } from '@/lib/api';
import { toast } from 'sonner';
import { useCompanySettings } from '@/lib/hooks/use-company-settings';
import { formatCurrency } from '@/lib/utils/currency';

interface QuotationViewerProps {
  quotation: any;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function QuotationViewer({ quotation, open, onClose, onRefresh }: QuotationViewerProps) {
  const { baseCurrency } = useCompanySettings();
  const [fullQuotation, setFullQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchFullQuotation();
  }, [quotation]);

  const fetchFullQuotation = async () => {
    try {
      const res = await fetch(`/api/crm/quotations/${quotation._id || quotation.id}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setFullQuotation(data);
      }
    } catch (err) {
      console.error('Failed to fetch quotation:', err);
      toast.error('Failed to load quotation details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/crm/quotations/${quotation._id || quotation.id}/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ comments: approvalComments })
      });

      if (res.ok) {
        toast.success('Quotation approved successfully');
        onRefresh();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to approve quotation');
      }
    } catch (err) {
      toast.error('Failed to approve quotation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/crm/quotations/${quotation._id || quotation.id}/reject`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: rejectionReason, comments: approvalComments })
      });

      if (res.ok) {
        toast.success('Quotation rejected');
        onRefresh();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to reject quotation');
      }
    } catch (err) {
      toast.error('Failed to reject quotation');
    } finally {
      setActionLoading(false);
      setShowRejectDialog(false);
    }
  };

  if (loading || !fullQuotation) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading quotation...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Quotation {fullQuotation.quotation_number}</DialogTitle>
            <Badge variant={fullQuotation.status === 'approved' ? 'default' : 'secondary'}>
              {fullQuotation.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Company:</span>
                <div className="font-medium">{fullQuotation.customer_company_name || fullQuotation.customer_id?.name || 'N/A'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Contact Person:</span>
                <div className="font-medium">{fullQuotation.customer_contact_person || 'N/A'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <div className="font-medium">{fullQuotation.customer_email || 'N/A'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <div className="font-medium">{fullQuotation.customer_phone || 'N/A'}</div>
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Line Items</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Quantity</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {fullQuotation.lines?.map((line: any, index: number) => (
                <div key={index} className="grid grid-cols-12 gap-2 text-sm py-2 border-b">
                  <div className="col-span-6">{line.description}</div>
                  <div className="col-span-2 text-right">{line.quantity}</div>
                  <div className="col-span-2 text-right">{formatCurrency(line.unit_price, baseCurrency)}</div>
                  <div className="col-span-2 text-right font-medium">{formatCurrency(line.total, baseCurrency)}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Totals */}
          <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/25 border-primary/20">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground font-medium">Subtotal:</span>
                <span className="text-xl font-bold">{formatCurrency(fullQuotation.subtotal || 0, baseCurrency)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground font-medium">Tax ({fullQuotation.tax_mode === 'auto' ? `${fullQuotation.tax_rate}%` : 'Manual'}):</span>
                <span className="text-xl font-bold">{formatCurrency(fullQuotation.tax_amount || 0, baseCurrency)}</span>
              </div>
              <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4 border border-primary/30">
                <span className="text-lg font-bold text-primary">Total Amount:</span>
                <span className="text-3xl font-bold text-primary">{formatCurrency(fullQuotation.total_amount || 0, baseCurrency)}</span>
              </div>
            </div>
          </Card>

          {/* Approval Workflow */}
          {fullQuotation.approval_config?.levels?.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Approval Workflow</h3>
              <div className="space-y-3">
                {fullQuotation.approval_config.levels.map((level: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium text-sm">Level {level.level} - {level.role}</div>
                      {level.user_name && (
                        <div className="text-xs text-muted-foreground">
                          {level.user_name} • {level.actioned_at ? new Date(level.actioned_at).toLocaleString() : 'Pending'}
                        </div>
                      )}
                      {level.comments && (
                        <div className="text-xs text-muted-foreground mt-1">{level.comments}</div>
                      )}
                    </div>
                    <Badge variant={level.status === 'approved' ? 'default' : level.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {level.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Approval Actions */}
          {fullQuotation.status === 'pending_approval' && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Approval Actions</h3>
              <div className="space-y-3">
                <Textarea
                  placeholder="Add comments (optional)..."
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  className="h-20"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="gap-2 flex-1"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionLoading}
                    className="gap-2 flex-1"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Rejection Dialog */}
          {showRejectDialog && (
            <Card className="p-4 border-destructive">
              <h3 className="font-semibold text-sm mb-3 text-destructive">Reject Quotation</h3>
              <Textarea
                placeholder="Rejection reason (required)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="h-20 mb-3"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="flex-1"
                >
                  Confirm Rejection
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
