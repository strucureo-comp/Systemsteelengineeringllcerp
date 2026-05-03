'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

export default function CRMPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground">Manage enquiries and customer conversations from a single place.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Inbound Enquiries</CardTitle>
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Open the CRM enquiries inbox to review, reply, and convert leads.</p>
          <Button onClick={() => router.push('/admin/crm/enquiries')}>Open Enquiries</Button>
        </CardContent>
      </Card>
    </div>
  );
}
