'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Finance settings now live in the main Settings page under "Tax & Fiscal"
export default function FinanceSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/settings');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground text-sm">Redirecting to Settings...</p>
    </div>
  );
}
