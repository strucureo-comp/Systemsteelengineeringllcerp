'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';

export default function ClaimsPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Claims</h1>
        <p className="text-sm text-muted-foreground">Claims management coming soon. Use the Claims API to integrate claim flows.</p>
      </div>
    </ModuleGuard>
  );
}
