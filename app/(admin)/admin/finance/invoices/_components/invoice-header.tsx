'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, RefreshCcw, ShieldCheck, FileDown, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface InvoiceHeaderProps {
  title: string;
  subtitle?: string;
  viewMode?: 'edit' | 'preview';
  onViewModeChange?: (mode: 'edit' | 'preview') => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDownloadPDF?: () => void;
  saving?: boolean;
  variant?: 'modern' | 'traditional';
}

export function InvoiceHeader({
  title,
  subtitle,
  viewMode,
  onViewModeChange,
  onSave,
  onCancel,
  onDownloadPDF,
  saving = false,
  variant = 'modern'
}: InvoiceHeaderProps) {
  const router = useRouter();

  if (variant === 'modern') {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 bg-card -mx-4 px-4 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 border" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">{title}</h1>
            {subtitle && (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{subtitle}</span>
                {viewMode !== undefined && onViewModeChange && (
                  <div className="flex p-0.5 bg-muted rounded-md">
                    <button
                      onClick={() => onViewModeChange('edit')}
                      className={cn(
                        "px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                        viewMode === 'edit' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onViewModeChange('preview')}
                      className={cn(
                        "px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                        viewMode === 'preview' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Preview
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" className="h-10 px-6 font-bold uppercase text-[10px] tracking-widest" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onSave && (
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-10 px-8 gap-2 bg-primary font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
            >
              {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Dispatch Invoice
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Traditional variant
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        {onDownloadPDF && (
          <Button variant="outline" onClick={onDownloadPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        )}
        {onSave && (
          <Button onClick={onSave} disabled={saving}>
            {saving ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        )}
      </div>
    </div>
  );
}
