'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';

export default function OnboardingPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Onboarding</h1>
        <p className="text-sm text-muted-foreground">Onboarding workflows and templates will be available here.</p>
      </div>
    </ModuleGuard>
  );
}
