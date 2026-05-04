import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/context';
import { TenantProvider } from '@/lib/tenant-context';
import { ThemeProvider } from '@/lib/theme-context';
import { SettingsProvider } from '@/lib/settings-context';
import { Toaster } from '@/components/ui/sonner';
import { ChunkErrorRecovery } from '@/components/shared/chunk-error-recovery';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    template: '%s | ERP',
    default: 'ERP System',
  },
  description: 'Enterprise Resource Planning System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23007ACC'/%3E%3Ctext x='50%25' y='50%25' font-size='8' text-anchor='middle' dy='.35em' fill='white'%3EERP%3C/text%3E%3C/svg%3E" />
      </head>
      <body className="settings-ui-standard">
        <AuthProvider>
          <TenantProvider>
            <ThemeProvider>
              <SettingsProvider>
                <ChunkErrorRecovery />
                {children}
                <Toaster />
              </SettingsProvider>
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
