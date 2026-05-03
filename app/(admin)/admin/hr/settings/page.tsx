'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HRSettingsPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">HR Settings</h1>
        <p className="text-sm text-muted-foreground">Configure payroll, attendance, and HR workflows for your company.</p>

        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">Most HR configuration is available under the System Settings module.</p>
            <div className="flex gap-2">
              <Link href="/admin/settings/modules">
                <Button className="rounded-md">Open Modules Settings</Button>
              </Link>
              <Link href="/admin/settings/company">
                <Button variant="outline" className="rounded-md">Company Profile</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleGuard>
  );
}
