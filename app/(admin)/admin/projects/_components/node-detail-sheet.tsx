'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FinanceDetails } from './project-nodes/finance-details';
import { LabourDetails } from './project-nodes/labour-details';
import { InventoryDetails } from './project-nodes/inventory-details';
import { DesignDetails } from './project-nodes/design-details';
import { TimelineDetails } from './project-nodes/timeline-details';
import { ResourcesDetails } from './project-nodes/resources-details';
import { ExpensesDetails } from './project-nodes/expenses-details';
import { ClientDetails } from './project-nodes/client-details';

import { CoreDetails } from './project-nodes/core-details';

interface NodeDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: string | null;
  project: any;
  onUpdate: () => void;
}

export function NodeDetailSheet({ isOpen, onClose, type, project, onUpdate }: NodeDetailSheetProps) {
  const renderContent = () => {
    switch (type) {
      case 'core': return <CoreDetails project={project} onUpdate={onUpdate} />;
      case 'finance': return <FinanceDetails project={project} />;
      case 'labour': return <LabourDetails project={project} onUpdate={onUpdate} />;
      case 'inventory': return <InventoryDetails project={project} onUpdate={onUpdate} />;
      case 'design': return <DesignDetails project={project} onUpdate={onUpdate} />;
      case 'timeline': return <TimelineDetails project={project} onUpdate={onUpdate} />;
      case 'resources': return <ResourcesDetails project={project} onUpdate={onUpdate} />;
      case 'expenses': return <ExpensesDetails project={project} onUpdate={onUpdate} />;
      case 'client': return <ClientDetails project={project} />;
      default: return <p className="text-muted-foreground text-center py-20">Select a node to view details.</p>;
    }
  };

  const getTitle = () => {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1) + ' Module';
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="!w-[80vw] !max-w-[1400px] overflow-hidden flex flex-col p-0 !h-dvh right-0 rounded-none border-l">
        <SheetHeader className="p-8 border-b bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <SheetTitle className="uppercase tracking-widest text-2xl flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="font-bold text-primary">{type?.charAt(0).toUpperCase()}</span>
            </div>
            {getTitle()}
          </SheetTitle>
          <SheetDescription className="text-base mt-2">
            {project.title} - Detailed {type} information and controls
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 p-8">
          {renderContent()}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
